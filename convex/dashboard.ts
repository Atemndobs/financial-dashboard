import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

const query = queryGeneric
const mutation = mutationGeneric

type DashboardFilters = {
  year: number | null
  account: string | null
  includeTransfers: boolean
  includeSavings: boolean
}

function normalizeType(transaction: any) {
  if (transaction.type) {
    return transaction.type
  }

  return transaction.amount >= 0 ? "income" : "expense"
}

function includeInSpendingStats(transaction: any) {
  return !transaction.exclude_from_spending && !transaction.user_excluded
}

function applyTransactionFilters(transactions: any[], filters: DashboardFilters) {
  return transactions.filter((transaction) => {
    if (!filters.includeTransfers && normalizeType(transaction) === "transfer") {
      return false
    }

    if (!filters.includeSavings && transaction.exclude_from_spending) {
      return false
    }

    if (filters.year && transaction.year !== filters.year) {
      return false
    }

    if (filters.account && transaction.account !== filters.account) {
      return false
    }

    return true
  })
}

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("fin_categories")
      .withIndex("by_active_sort", (q) => q.eq("is_active", true))
      .collect()

    return categories.map((category) => ({
      id: category._id,
      name: category.name,
      type: category.type,
      description: category.description,
      color: category.color,
      icon: category.icon,
      is_active: category.is_active,
      sort_order: category.sort_order,
    }))
  },
})

export const getYearlySummary = query({
  args: {
    userId: v.string(),
    year: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect()

    const filtered = transactions.filter((transaction) => {
      if (!includeInSpendingStats(transaction)) {
        return false
      }

      if (args.year && transaction.year !== args.year) {
        return false
      }

      return true
    })

    const grouped = new Map<number, any>()

    for (const transaction of filtered) {
      const existing = grouped.get(transaction.year) ?? {
        year: transaction.year,
        total_income: 0,
        total_expense: 0,
        net_savings: 0,
        savings_rate: 0,
        transaction_count: 0,
        account_count: 0,
        category_count: 0,
        avg_monthly_income: 0,
        avg_monthly_expense: 0,
        _income_samples: 0,
        _expense_samples: 0,
        _accounts: new Set<string>(),
        _categories: new Set<string>(),
      }

      if (transaction.amount >= 0) {
        existing.total_income += transaction.amount
        existing._income_samples += 1
      } else {
        existing.total_expense += Math.abs(transaction.amount)
        existing._expense_samples += 1
      }

      existing.net_savings += transaction.amount
      existing.transaction_count += 1
      existing._accounts.add(transaction.account)
      existing._categories.add(transaction.category)
      grouped.set(transaction.year, existing)
    }

    return Array.from(grouped.values())
      .map((summary) => ({
        year: summary.year,
        total_income: summary.total_income,
        total_expense: summary.total_expense,
        net_savings: summary.net_savings,
        savings_rate: summary.total_income > 0 ? (summary.net_savings / summary.total_income) * 100 : 0,
        transaction_count: summary.transaction_count,
        account_count: summary._accounts.size,
        category_count: summary._categories.size,
        avg_monthly_income: summary._income_samples > 0 ? summary.total_income / summary._income_samples : 0,
        avg_monthly_expense: summary._expense_samples > 0 ? summary.total_expense / summary._expense_samples : 0,
      }))
      .sort((a, b) => b.year - a.year)
  },
})

export const getMonthlyStats = query({
  args: {
    userId: v.string(),
    year: v.union(v.number(), v.null()),
    account: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect()

    const filtered = transactions.filter((transaction) => {
      if (!includeInSpendingStats(transaction)) {
        return false
      }

      if (args.year && transaction.year !== args.year) {
        return false
      }

      if (args.account && transaction.account !== args.account) {
        return false
      }

      return true
    })

    const grouped = new Map<string, any>()

    for (const transaction of filtered) {
      const key = `${transaction.account}:${transaction.year}:${transaction.month}`
      const existing = grouped.get(key) ?? {
        account: transaction.account,
        year: transaction.year,
        month: transaction.month,
        month_label: transaction.month_label,
        total_income: 0,
        total_expense: 0,
        net: 0,
        savings_rate: 0,
        transaction_count: 0,
        expense_count: 0,
        income_count: 0,
      }

      if (transaction.amount >= 0) {
        existing.total_income += transaction.amount
        existing.income_count += 1
      } else {
        existing.total_expense += Math.abs(transaction.amount)
        existing.expense_count += 1
      }

      existing.net += transaction.amount
      existing.transaction_count += 1
      grouped.set(key, existing)
    }

    return Array.from(grouped.values())
      .map((summary) => ({
        ...summary,
        savings_rate: summary.total_income > 0 ? (summary.net / summary.total_income) * 100 : 0,
      }))
      .sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year))
  },
})

export const getCategoryStats = query({
  args: {
    userId: v.string(),
    year: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const [transactions, categories] = await Promise.all([
      ctx.db
        .query("fin_transactions")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .collect(),
      ctx.db.query("fin_categories").collect(),
    ])

    const categoryMap = new Map(categories.map((category) => [category.name, category]))
    const filtered = transactions.filter((transaction) => {
      if (!includeInSpendingStats(transaction)) {
        return false
      }

      if (args.year && transaction.year !== args.year) {
        return false
      }

      return true
    })

    const grouped = new Map<string, any>()

    for (const transaction of filtered) {
      const type = normalizeType(transaction)
      const key = `${transaction.category}:${transaction.year}:${transaction.month}:${type}`
      const category = categoryMap.get(transaction.category)
      const amount = Math.abs(transaction.amount)

      const existing = grouped.get(key) ?? {
        category: transaction.category,
        year: transaction.year,
        month: transaction.month,
        month_label: transaction.month_label,
        type,
        total_amount: 0,
        transaction_count: 0,
        avg_amount: 0,
        min_amount: Number.POSITIVE_INFINITY,
        max_amount: 0,
        category_color: category?.color ?? null,
        category_icon: category?.icon ?? null,
      }

      existing.total_amount += amount
      existing.transaction_count += 1
      existing.min_amount = Math.min(existing.min_amount, amount)
      existing.max_amount = Math.max(existing.max_amount, amount)
      grouped.set(key, existing)
    }

    return Array.from(grouped.values())
      .map((summary) => ({
        ...summary,
        avg_amount: summary.transaction_count > 0 ? summary.total_amount / summary.transaction_count : 0,
        min_amount: Number.isFinite(summary.min_amount) ? summary.min_amount : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
  },
})

export const getTransactions = query({
  args: {
    userId: v.string(),
    year: v.union(v.number(), v.null()),
    account: v.union(v.string(), v.null()),
    includeTransfers: v.boolean(),
    includeSavings: v.boolean(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const [transactions, categories] = await Promise.all([
      ctx.db
        .query("fin_transactions")
        .withIndex("by_user_and_date", (q) => q.eq("user_id", args.userId))
        .order("desc")
        .collect(),
      ctx.db.query("fin_categories").collect(),
    ])

    const categoryMap = new Map(categories.map((category) => [category.name, category]))

    const filtered = applyTransactionFilters(
      transactions.filter((transaction) => !transaction.user_excluded),
      {
        year: args.year,
        account: args.account,
        includeTransfers: args.includeTransfers,
        includeSavings: args.includeSavings,
      },
    )

    const limited = typeof args.limit === "number" ? filtered.slice(0, args.limit) : filtered

    return limited.map((transaction) => {
      const category = categoryMap.get(transaction.category)

      return {
        id: transaction._id,
        transaction_id: transaction.transaction_id,
        date: transaction.date,
        account: transaction.account,
        counterparty: transaction.counterparty,
        description: transaction.description,
        amount: transaction.amount,
        currency: transaction.currency,
        category: transaction.category,
        sub_category: transaction.sub_category,
        type: normalizeType(transaction),
        is_expense: transaction.is_expense,
        abs_amount: transaction.abs_amount,
        exclude_from_spending: transaction.exclude_from_spending,
        user_excluded: transaction.user_excluded,
        year: transaction.year,
        month: transaction.month,
        month_label: transaction.month_label,
        category_color: category?.color ?? null,
        category_icon: category?.icon ?? null,
      }
    })
  },
})

export const getAvailableYears = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect()

    return Array.from(
      new Set(
        transactions
          .filter((transaction) => includeInSpendingStats(transaction))
          .map((transaction) => transaction.year),
      ),
    ).sort((a, b) => b - a)
  },
})

export const getAvailableAccounts = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect()

    return Array.from(
      new Set(
        transactions
          .filter((transaction) => includeInSpendingStats(transaction))
          .map((transaction) => transaction.account),
      ),
    ).sort((a, b) => a.localeCompare(b))
  },
})

export const toggleTransactionExclusion = mutation({
  args: {
    userId: v.string(),
    transactionId: v.string(),
    exclude: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .filter((q) => q.eq(q.field("transaction_id"), args.transactionId))
      .unique()

    if (!transaction) {
      return { success: false, error: "Transaction not found" }
    }

    await ctx.db.patch(transaction._id, {
      user_excluded: args.exclude,
      updated_at: new Date().toISOString(),
    })

    const existingExclusion = await ctx.db
      .query("fin_exclusions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .filter((q) => q.eq(q.field("transaction_id"), args.transactionId))
      .unique()

    if (args.exclude) {
      if (existingExclusion) {
        await ctx.db.patch(existingExclusion._id, {
          reason: args.reason ?? "User excluded via dashboard",
          excluded_at: new Date().toISOString(),
        })
      } else {
        await ctx.db.insert("fin_exclusions", {
          user_id: args.userId,
          transaction_id: args.transactionId,
          reason: args.reason ?? "User excluded via dashboard",
          excluded_at: new Date().toISOString(),
          excluded_by: args.userId,
        })
      }
    } else if (existingExclusion) {
      await ctx.db.delete(existingExclusion._id)
    }

    return { success: true }
  },
})
