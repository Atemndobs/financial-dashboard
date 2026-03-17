import { mutationGeneric } from "convex/server"
import { v } from "convex/values"

const mutation = mutationGeneric

export const upsertCategoriesBatch = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        type: v.optional(v.string()),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
        is_active: v.optional(v.boolean()),
        sort_order: v.optional(v.number()),
        created_at: v.optional(v.string()),
        updated_at: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0
    let updated = 0

    for (const item of args.items) {
      const existing = await ctx.db
        .query("fin_categories")
        .withIndex("by_name", (q) => q.eq("name", item.name))
        .unique()

      const payload = {
        name: item.name,
        type: item.type ?? "expense",
        description: item.description ?? null,
        color: item.color ?? "#757575",
        icon: item.icon ?? null,
        is_active: item.is_active ?? true,
        sort_order: item.sort_order ?? 0,
        created_at: item.created_at ?? new Date().toISOString(),
        updated_at: item.updated_at ?? new Date().toISOString(),
      }

      if (existing) {
        await ctx.db.patch(existing._id, payload)
        updated += 1
      } else {
        await ctx.db.insert("fin_categories", payload)
        inserted += 1
      }
    }

    return { inserted, updated }
  },
})

export const upsertTransactionsBatch = mutation({
  args: {
    userId: v.string(),
    items: v.array(
      v.object({
        transaction_id: v.string(),
        date: v.string(),
        account: v.string(),
        counterparty: v.optional(v.string()),
        description: v.optional(v.string()),
        amount: v.number(),
        currency: v.optional(v.string()),
        type: v.optional(v.string()),
        category: v.optional(v.string()),
        sub_category: v.optional(v.string()),
        source: v.optional(v.string()),
        year: v.optional(v.number()),
        month: v.optional(v.number()),
        month_label: v.optional(v.string()),
        is_expense: v.optional(v.boolean()),
        abs_amount: v.optional(v.number()),
        exclude_from_spending: v.optional(v.boolean()),
        user_excluded: v.optional(v.boolean()),
        created_at: v.optional(v.string()),
        updated_at: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0
    let updated = 0

    for (const item of args.items) {
      const existing = await ctx.db
        .query("fin_transactions")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .filter((q) => q.eq(q.field("transaction_id"), item.transaction_id))
        .unique()

      const txDate = new Date(item.date)
      const derivedYear = Number.isInteger(item.year) ? item.year : txDate.getUTCFullYear()
      const derivedMonth = Number.isInteger(item.month) ? item.month : txDate.getUTCMonth() + 1

      const payload = {
        user_id: args.userId,
        transaction_id: item.transaction_id,
        date: item.date,
        account: item.account,
        counterparty: item.counterparty ?? null,
        description: item.description ?? null,
        amount: item.amount,
        currency: item.currency ?? "CHF",
        type: item.type ?? null,
        category: item.category ?? "Unknown",
        sub_category: item.sub_category ?? null,
        source: item.source ?? null,
        year: derivedYear,
        month: derivedMonth,
        month_label: item.month_label ?? `${derivedYear}-${String(derivedMonth).padStart(2, "0")}`,
        is_expense: item.is_expense ?? item.amount < 0,
        abs_amount: item.abs_amount ?? Math.abs(item.amount),
        exclude_from_spending: item.exclude_from_spending ?? false,
        user_excluded: item.user_excluded ?? false,
        created_at: item.created_at ?? new Date().toISOString(),
        updated_at: item.updated_at ?? new Date().toISOString(),
      }

      if (existing) {
        await ctx.db.patch(existing._id, payload)
        updated += 1
      } else {
        await ctx.db.insert("fin_transactions", payload)
        inserted += 1
      }
    }

    return { inserted, updated }
  },
})

export const upsertExclusionsBatch = mutation({
  args: {
    userId: v.string(),
    items: v.array(
      v.object({
        transaction_id: v.string(),
        reason: v.optional(v.string()),
        excluded_at: v.optional(v.string()),
        excluded_by: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0
    let updated = 0

    for (const item of args.items) {
      const existing = await ctx.db
        .query("fin_exclusions")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .filter((q) => q.eq(q.field("transaction_id"), item.transaction_id))
        .unique()

      const payload = {
        user_id: args.userId,
        transaction_id: item.transaction_id,
        reason: item.reason ?? null,
        excluded_at: item.excluded_at ?? new Date().toISOString(),
        excluded_by: item.excluded_by ?? args.userId,
      }

      if (existing) {
        await ctx.db.patch(existing._id, payload)
        updated += 1
      } else {
        await ctx.db.insert("fin_exclusions", payload)
        inserted += 1
      }
    }

    return { inserted, updated }
  },
})

export const upsertSyncLogBatch = mutation({
  args: {
    userId: v.string(),
    items: v.array(
      v.object({
        sync_started_at: v.optional(v.string()),
        sync_completed_at: v.optional(v.string()),
        status: v.optional(v.string()),
        sync_source: v.optional(v.string()),
        records_processed: v.optional(v.number()),
        records_inserted: v.optional(v.number()),
        records_updated: v.optional(v.number()),
        records_failed: v.optional(v.number()),
        error_message: v.optional(v.string()),
        error_details: v.optional(v.any()),
        sync_metadata: v.optional(v.any()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert("fin_sync_log", {
        user_id: args.userId,
        sync_started_at: item.sync_started_at ?? new Date().toISOString(),
        sync_completed_at: item.sync_completed_at ?? null,
        status: item.status ?? "completed",
        sync_source: item.sync_source ?? null,
        records_processed: item.records_processed ?? 0,
        records_inserted: item.records_inserted ?? 0,
        records_updated: item.records_updated ?? 0,
        records_failed: item.records_failed ?? 0,
        error_message: item.error_message ?? null,
        error_details: item.error_details ?? null,
        sync_metadata: item.sync_metadata ?? null,
      })
    }

    return { inserted: args.items.length, updated: 0 }
  },
})
