import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const nullableString = v.union(v.string(), v.null())
const nullableNumber = v.union(v.number(), v.null())
const nullableAny = v.union(v.any(), v.null())

export default defineSchema({
  fin_transactions: defineTable({
    user_id: v.string(),
    transaction_id: v.string(),
    date: v.string(),
    account: v.string(),
    counterparty: nullableString,
    description: nullableString,
    amount: v.number(),
    currency: v.string(),
    type: nullableString,
    category: v.string(),
    sub_category: nullableString,
    source: nullableString,
    year: v.number(),
    month: v.number(),
    month_label: v.string(),
    is_expense: v.boolean(),
    abs_amount: v.number(),
    exclude_from_spending: v.boolean(),
    user_excluded: v.boolean(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_and_date", ["user_id", "date"])
    .index("by_user_and_year", ["user_id", "year"])
    .index("by_user_and_transaction", ["user_id", "transaction_id"]),

  fin_categories: defineTable({
    name: v.string(),
    type: v.string(),
    description: nullableString,
    color: v.string(),
    icon: nullableString,
    is_active: v.boolean(),
    sort_order: v.number(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_name", ["name"])
    .index("by_active_sort", ["is_active", "sort_order"]),

  fin_exclusions: defineTable({
    user_id: v.string(),
    transaction_id: v.string(),
    reason: nullableString,
    excluded_at: v.string(),
    excluded_by: nullableString,
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_and_transaction", ["user_id", "transaction_id"]),

  fin_sync_log: defineTable({
    user_id: v.string(),
    sync_started_at: v.string(),
    sync_completed_at: nullableString,
    status: v.string(),
    sync_source: nullableString,
    records_processed: v.number(),
    records_inserted: v.number(),
    records_updated: v.number(),
    records_failed: v.number(),
    error_message: nullableString,
    error_details: nullableAny,
    sync_metadata: nullableAny,
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_and_date", ["user_id", "sync_started_at"])
    .index("by_user_and_status", ["user_id", "status"]),
})

