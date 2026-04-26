#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"

const args = parseArgs(process.argv.slice(2))
const BATCH_SIZE = Number.isFinite(args.batchSize) && args.batchSize > 0 ? args.batchSize : 200

loadEnvFile(path.join(process.cwd(), ".env.local"))
loadEnvFile(path.join(process.cwd(), ".env"))
loadEnvFile(path.join(process.cwd(), "..", ".env.local"))
loadEnvFile(path.join(process.cwd(), "..", ".env"))

const inputPath = path.resolve(
  process.cwd(),
  args.input ?? "../exports/transactions.json",
)

const CONVEX_URL =
  args.convexUrl ??
  process.env.CONVEX_URL ??
  process.env.NEXT_PUBLIC_CONVEX_URL

const USER_ID =
  args.userId ??
  process.env.MIGRATION_CLERK_USER_ID

if (!fs.existsSync(inputPath)) {
  throw new Error(`Input JSON not found: ${inputPath}`)
}

const rawPayload = JSON.parse(fs.readFileSync(inputPath, "utf8"))
const rawTransactions = Array.isArray(rawPayload)
  ? rawPayload
  : rawPayload?.transactions

if (!Array.isArray(rawTransactions)) {
  throw new Error(
    "Unsupported JSON shape. Expected array or { transactions: [...] }.",
  )
}

const mapped = rawTransactions.map(mapTransaction)
console.log(`Prepared ${mapped.length} transaction rows.`)

if (args.dryRun) {
  console.log("Dry run enabled; first row:")
  console.log(JSON.stringify(mapped[0] ?? {}, null, 2))
  process.exit(0)
}

if (!CONVEX_URL) {
  throw new Error(
    "Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL. " +
      "Set one in env or pass --convex-url.",
  )
}

if (!USER_ID) {
  throw new Error(
    "Missing MIGRATION_CLERK_USER_ID. " +
      "Set env var or pass --user-id.",
  )
}

console.log(`Target Clerk user id: ${USER_ID}`)

const client = new ConvexHttpClient(CONVEX_URL)
const mutationRef = makeFunctionReference("migration:upsertTransactionsBatch")

let processed = 0
for (const batch of chunk(mapped, BATCH_SIZE)) {
  await client.mutation(mutationRef, {
    userId: USER_ID,
    items: batch,
  })
  processed += batch.length
  console.log(`Upserted ${processed}/${mapped.length} transactions...`)
}

console.log("Convex import complete.")

function parseArgs(argv) {
  const result = {
    input: null,
    userId: null,
    convexUrl: null,
    dryRun: false,
    batchSize: 200,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--input") {
      result.input = argv[++i]
      continue
    }
    if (arg === "--user-id") {
      result.userId = argv[++i]
      continue
    }
    if (arg === "--convex-url") {
      result.convexUrl = argv[++i]
      continue
    }
    if (arg === "--dry-run") {
      result.dryRun = true
      continue
    }
    if (arg === "--batch-size") {
      result.batchSize = Number(argv[++i])
      continue
    }
    if (arg === "-h" || arg === "--help") {
      printHelp()
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return result
}

function printHelp() {
  console.log(`Usage:
  node scripts/import-json-to-convex.mjs [options]

Options:
  --input <path>       Input JSON file (default: ../exports/transactions.json)
  --user-id <value>    Clerk user id to attach transactions to
  --convex-url <url>   Convex deployment URL
  --batch-size <n>     Batch size per mutation call (default: 200)
  --dry-run            Validate + print sample row without writing
`)
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue
    }
    const index = line.indexOf("=")
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function chunk(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function toOptionalString(value) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  return String(value)
}

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
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

function mapTransaction(row) {
  const amount = toNumber(row.amount)
  const parsedDate = new Date(toOptionalString(row.date) ?? new Date().toISOString())
  const year = toNumber(row.year, parsedDate.getUTCFullYear())
  const month = toNumber(row.month, parsedDate.getUTCMonth() + 1)

  return {
    transaction_id: String(row.transaction_id),
    date: parsedDate.toISOString().slice(0, 10),
    account: String(row.account ?? "Unknown"),
    counterparty: toOptionalString(row.counterparty),
    description: toOptionalString(row.description),
    amount,
    currency: toOptionalString(row.currency) ?? "CHF",
    type: toOptionalString(row.type),
    category: toOptionalString(row.category) ?? "Unknown",
    sub_category: toOptionalString(row.sub_category),
    source: toOptionalString(row.source),
    year,
    month,
    month_label:
      toOptionalString(row.month_label) ??
      `${year}-${String(month).padStart(2, "0")}`,
    is_expense: toBoolean(row.is_expense, amount < 0),
    abs_amount: toNumber(row.abs_amount, Math.abs(amount)),
    exclude_from_spending: toBoolean(row.exclude_from_spending, false),
    user_excluded: toBoolean(row.user_excluded, false),
    created_at: toOptionalString(row.created_at),
    updated_at: toOptionalString(row.updated_at),
  }
}
