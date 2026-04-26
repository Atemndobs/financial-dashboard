#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"

const args = parseArgs(process.argv.slice(2))

loadEnvFile(path.join(process.cwd(), ".env.local"))
loadEnvFile(path.join(process.cwd(), ".env"))
loadEnvFile(path.join(process.cwd(), "..", ".env.local"))
loadEnvFile(path.join(process.cwd(), "..", ".env"))

const CONVEX_URL = args.convexUrl ?? process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL

if (!CONVEX_URL) {
  throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL. Pass --convex-url or set env.")
}

const now = new Date().toISOString()
const categories = [
  createCategory("Groceries", "expense", "#4CAF50", "🛒", 10, now),
  createCategory("Dining", "expense", "#FF9800", "🍽️", 20, now),
  createCategory("Transportation", "expense", "#2196F3", "🚗", 30, now),
  createCategory("Rent", "expense", "#9C27B0", "🏠", 40, now),
  createCategory("Housing", "expense", "#9C27B0", "🏠", 45, now),
  createCategory("Utilities", "expense", "#00BCD4", "💡", 50, now),
  createCategory("Healthcare", "expense", "#E91E63", "🩺", 60, now),
  createCategory("Insurance", "expense", "#673AB7", "🛡️", 70, now),
  createCategory("Entertainment", "expense", "#FF5722", "🎬", 80, now),
  createCategory("Shopping", "expense", "#FFC107", "🛍️", 90, now),
  createCategory("Subscriptions", "expense", "#009688", "🔁", 100, now),
  createCategory("Telecom", "expense", "#03A9F4", "📱", 110, now),
  createCategory("Banking", "expense", "#607D8B", "🏦", 120, now),
  createCategory("Education", "expense", "#3F51B5", "🎓", 130, now),
  createCategory("Travel", "expense", "#00ACC1", "✈️", 140, now),
  createCategory("vacation", "expense", "#00ACC1", "🌴", 145, now),
  createCategory("Personal Care", "expense", "#E91E63", "🧴", 150, now),
  createCategory("Home & Garden", "expense", "#8BC34A", "🛠️", 160, now),
  createCategory("Pets", "expense", "#795548", "🐾", 170, now),
  createCategory("Gifts & Donations", "expense", "#F06292", "🎁", 180, now),
  createCategory("Professional Services", "expense", "#5C6BC0", "🧑‍💼", 190, now),
  createCategory("Taxes", "expense", "#D32F2F", "🧾", 200, now),
  createCategory("Savings & Investments", "expense", "#43A047", "📈", 210, now),
  createCategory("Debt Payments", "expense", "#C62828", "💳", 220, now),
  createCategory("Cloud", "expense", "#1976D2", "☁️", 230, now),
  createCategory("Family", "expense", "#EC407A", "👨‍👩‍👧‍👦", 240, now),
  createCategory("Household", "expense", "#66BB6A", "🏡", 250, now),
  createCategory("Income", "income", "#4CAF50", "💰", 1000, now),
  createCategory("Transfer", "transfer", "#9E9E9E", "🔄", 1010, now),
  createCategory("Savings", "expense", "#43A047", "🐖", 1020, now),
  createCategory("Refund", "income", "#81C784", "↩️", 1030, now),
  createCategory("Miscellaneous", "expense", "#757575", "📦", 1040, now),
  createCategory("Unknown", "expense", "#BDBDBD", "❓", 1050, now),
  createCategory("jna", "expense", "#FF6F00", "💼", 1060, now),
]

if (args.dryRun) {
  console.log(`Prepared ${categories.length} categories (dry-run).`)
  console.log(JSON.stringify(categories.slice(0, 5), null, 2))
  process.exit(0)
}

const client = new ConvexHttpClient(CONVEX_URL)
const mutationRef = makeFunctionReference("migration:upsertCategoriesBatch")

const result = await client.mutation(mutationRef, {
  items: categories,
})

console.log("Category seed complete.")
console.log(JSON.stringify(result, null, 2))

function createCategory(name, type, color, icon, sortOrder, timestamp) {
  return {
    name,
    type,
    color,
    icon,
    is_active: true,
    sort_order: sortOrder,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function parseArgs(argv) {
  const result = {
    convexUrl: null,
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--convex-url") {
      result.convexUrl = argv[++i]
      continue
    }
    if (arg === "--dry-run") {
      result.dryRun = true
      continue
    }
    if (arg === "-h" || arg === "--help") {
      console.log(`Usage:
  node scripts/seed-categories-to-convex.mjs [options]

Options:
  --convex-url <url>   Convex deployment URL
  --dry-run            Print prepared categories only
`)
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return result
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
