#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"

const PAGE_SIZE = 1000
const BATCH_SIZE = 200

loadEnvFile(".env.local")
loadEnvFile(".env")

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL
const MIGRATION_CLERK_USER_ID = process.env.MIGRATION_CLERK_USER_ID

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
}

if (!CONVEX_URL) {
  throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL")
}

if (!MIGRATION_CLERK_USER_ID) {
  throw new Error("Missing MIGRATION_CLERK_USER_ID (target Clerk user id)")
}

const convex = new ConvexHttpClient(CONVEX_URL)

async function main() {
  console.log("🔄 Starting Supabase → Convex migration...")

  const selectedTables = {
    categories: await resolveTableName(["fin_categories", "categories"]),
    transactions: await resolveTableName(["fin_transactions", "transactions"]),
    exclusions: await resolveTableName(["fin_exclusions", "exclusions"]),
    syncLog: await resolveTableName(["fin_sync_log", "sync_log"]),
  }

  console.log("📋 Using source tables:", selectedTables)

  const [categories, transactions, exclusions, syncLog] = await Promise.all([
    fetchAllRows(selectedTables.categories),
    fetchAllRows(selectedTables.transactions),
    fetchAllRows(selectedTables.exclusions),
    fetchAllRows(selectedTables.syncLog),
  ])

  console.log(
    `📦 Pulled rows: categories=${categories.length}, transactions=${transactions.length}, exclusions=${exclusions.length}, sync_log=${syncLog.length}`,
  )

  await upsertInBatches("migration:upsertCategoriesBatch", categories.map(mapCategory), (items) => ({ items }))
  await upsertInBatches(
    "migration:upsertTransactionsBatch",
    transactions.map(mapTransaction),
    (items) => ({ userId: MIGRATION_CLERK_USER_ID, items }),
  )
  await upsertInBatches(
    "migration:upsertExclusionsBatch",
    exclusions.map(mapExclusion),
    (items) => ({ userId: MIGRATION_CLERK_USER_ID, items }),
  )
  await upsertInBatches(
    "migration:upsertSyncLogBatch",
    syncLog.map(mapSyncLog),
    (items) => ({ userId: MIGRATION_CLERK_USER_ID, items }),
  )

  console.log("✅ Supabase data migrated to Convex successfully")
}

function loadEnvFile(fileName) {
  const fullPath = path.join(process.cwd(), fileName)
  if (!fs.existsSync(fullPath)) {
    return
  }

  const content = fs.readFileSync(fullPath, "utf8")
  for (const line of content.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "")
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function resolveTableName(candidates) {
  for (const tableName of candidates) {
    const result = await fetchSupabaseRows(tableName, 0, 0)
    if (result.ok) {
      return tableName
    }
  }

  throw new Error(`Unable to resolve any table from candidates: ${candidates.join(", ")}`)
}

async function fetchAllRows(tableName) {
  const rows = []
  let offset = 0

  while (true) {
    const response = await fetchSupabaseRows(tableName, offset, offset + PAGE_SIZE - 1)
    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Failed fetching ${tableName}: ${response.status} ${message}`)
    }

    const page = await response.json()
    rows.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  return rows
}

async function fetchSupabaseRows(tableName, start, end) {
  const url = new URL(`/rest/v1/${tableName}`, SUPABASE_URL)
  url.searchParams.set("select", "*")
  url.searchParams.set("order", "id.asc.nullslast")

  return fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Range: `${start}-${end}`,
    },
  })
}

async function upsertInBatches(functionName, items, createPayload) {
  if (items.length === 0) {
    return
  }

  const mutationRef = makeFunctionReference(functionName)
  const totalBatches = Math.ceil(items.length / BATCH_SIZE)

  for (let index = 0; index < totalBatches; index += 1) {
    const start = index * BATCH_SIZE
    const end = start + BATCH_SIZE
    const batch = items.slice(start, end)

    await convex.mutation(mutationRef, createPayload(batch))
    console.log(`  • ${functionName}: batch ${index + 1}/${totalBatches}`)
  }
}

function toNullableString(value) {
  if (value === null || value === undefined || value === "") {
    return undefined
  }

  return String(value)
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value
  }

  if (value === "true" || value === "1" || value === 1) {
    return true
  }

  if (value === "false" || value === "0" || value === 0) {
    return false
  }

  return fallback
}

function mapCategory(row) {
  return {
    name: String(row.name),
    type: toNullableString(row.type) ?? "expense",
    description: toNullableString(row.description),
    color: toNullableString(row.color) ?? "#757575",
    icon: toNullableString(row.icon),
    is_active: toBoolean(row.is_active, true),
    sort_order: toNumber(row.sort_order, 0),
    created_at: toNullableString(row.created_at),
    updated_at: toNullableString(row.updated_at),
  }
}

function mapTransaction(row) {
  const amount = toNumber(row.amount)
  const txDate = new Date(toNullableString(row.date) ?? new Date().toISOString())
  const year = toNumber(row.year, txDate.getUTCFullYear())
  const month = toNumber(row.month, txDate.getUTCMonth() + 1)

  return {
    transaction_id: String(row.transaction_id),
    date: txDate.toISOString().slice(0, 10),
    account: String(row.account),
    counterparty: toNullableString(row.counterparty),
    description: toNullableString(row.description),
    amount,
    currency: toNullableString(row.currency) ?? "CHF",
    type: toNullableString(row.type),
    category: toNullableString(row.category) ?? "Unknown",
    sub_category: toNullableString(row.sub_category),
    source: toNullableString(row.source),
    year,
    month,
    month_label: toNullableString(row.month_label) ?? `${year}-${String(month).padStart(2, "0")}`,
    is_expense: toBoolean(row.is_expense, amount < 0),
    abs_amount: toNumber(row.abs_amount, Math.abs(amount)),
    exclude_from_spending: toBoolean(row.exclude_from_spending, false),
    user_excluded: toBoolean(row.user_excluded, false),
    created_at: toNullableString(row.created_at),
    updated_at: toNullableString(row.updated_at),
  }
}

function mapExclusion(row) {
  return {
    transaction_id: String(row.transaction_id),
    reason: toNullableString(row.reason),
    excluded_at: toNullableString(row.excluded_at),
    excluded_by: toNullableString(row.excluded_by),
  }
}

function mapSyncLog(row) {
  return {
    sync_started_at: toNullableString(row.sync_started_at),
    sync_completed_at: toNullableString(row.sync_completed_at),
    status: toNullableString(row.status),
    sync_source: toNullableString(row.sync_source),
    records_processed: toNumber(row.records_processed, 0),
    records_inserted: toNumber(row.records_inserted, 0),
    records_updated: toNumber(row.records_updated, 0),
    records_failed: toNumber(row.records_failed, 0),
    error_message: toNullableString(row.error_message),
    error_details: row.error_details ?? undefined,
    sync_metadata: row.sync_metadata ?? undefined,
  }
}

main().catch((error) => {
  console.error("❌ Migration failed:", error)
  process.exitCode = 1
})
