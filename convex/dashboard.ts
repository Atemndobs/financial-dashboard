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

// Money deliberately set aside (transfers to your own savings/investment/fund
// accounts). These are outflows on the statement but are NOT spending, so they
// are excluded from the expense side of the savings-rate calculation.
const SAVINGS_CATEGORIES = new Set(["Savings & Investments", "Savings", "Kids Fund", "Vacation Fund"])

function isSavingsCategory(category: string) {
  return SAVINGS_CATEGORIES.has(category)
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
        _savings_outflow: 0,
        _accounts: new Set<string>(),
        _categories: new Set<string>(),
        _months: new Set<number>(),
      }

      if (transaction.amount >= 0) {
        existing.total_income += transaction.amount
        existing._income_samples += 1
      } else {
        existing.total_expense += Math.abs(transaction.amount)
        existing._expense_samples += 1
        if (isSavingsCategory(transaction.category)) {
          existing._savings_outflow += Math.abs(transaction.amount)
        }
      }

      existing.net_savings += transaction.amount
      existing.transaction_count += 1
      existing._accounts.add(transaction.account)
      existing._categories.add(transaction.category)
      existing._months.add(transaction.month)
      grouped.set(transaction.year, existing)
    }

    return Array.from(grouped.values())
      .map((summary) => ({
        year: summary.year,
        total_income: summary.total_income,
        total_expense: summary.total_expense,
        // Savings/investment transfers are money set aside, not spending, so
        // add them back: net savings = income - (expenses minus those transfers).
        net_savings: summary.net_savings + summary._savings_outflow,
        savings_rate:
          summary.total_income > 0
            ? ((summary.net_savings + summary._savings_outflow) / summary.total_income) * 100
            : 0,
        transaction_count: summary.transaction_count,
        account_count: summary._accounts.size,
        category_count: summary._categories.size,
        avg_monthly_income: summary._months.size > 0 ? summary.total_income / summary._months.size : 0,
        avg_monthly_expense: summary._months.size > 0 ? summary.total_expense / summary._months.size : 0,
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
        _savings_outflow: 0,
      }

      if (transaction.amount >= 0) {
        existing.total_income += transaction.amount
        existing.income_count += 1
      } else {
        existing.total_expense += Math.abs(transaction.amount)
        existing.expense_count += 1
        if (isSavingsCategory(transaction.category)) {
          existing._savings_outflow += Math.abs(transaction.amount)
        }
      }

      existing.net += transaction.amount
      existing.transaction_count += 1
      grouped.set(key, existing)
    }

    return Array.from(grouped.values())
      .map(({ _savings_outflow, ...summary }) => ({
        ...summary,
        // Savings rate treats savings/investment transfers as money saved, not spent.
        savings_rate:
          summary.total_income > 0 ? ((summary.net + _savings_outflow) / summary.total_income) * 100 : 0,
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

export const getTaxYears = query({
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
          .filter((transaction) => !transaction.user_excluded)
          .map((transaction) => transaction.year),
      ),
    ).sort((a, b) => b - a)
  },
})

export const getTaxTransactions = query({
  args: {
    userId: v.string(),
    year: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect()

    return transactions
      .filter((transaction) => !transaction.user_excluded && (args.year === null || transaction.year === args.year))
      .map((transaction) => ({
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
        source: transaction.source,
        year: transaction.year,
        month: transaction.month,
        month_label: transaction.month_label,
        exclude_from_spending: transaction.exclude_from_spending,
        user_excluded: transaction.user_excluded,
      }))
  },
})

export const getTaxDiagnostics = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect()

    const taxYears = Array.from(
      new Set(
        transactions
          .filter((transaction) => !transaction.user_excluded)
          .map((transaction) => transaction.year),
      ),
    ).sort((a, b) => b - a)

    const latestTransactionDate = transactions.reduce<string | null>((latest, transaction) => {
      if (!latest) {
        return transaction.date
      }
      return transaction.date > latest ? transaction.date : latest
    }, null)

    return {
      user_id: args.userId,
      transaction_count: transactions.length,
      tax_years: taxYears,
      latest_transaction_date: latestTransactionDate,
    }
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

export const ensureCategory = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    color: v.string(),
    icon: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fin_categories")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first()

    if (existing) {
      return { created: false, name: args.name }
    }

    const all = await ctx.db.query("fin_categories").collect()
    const maxSort = all.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0)
    const now = new Date().toISOString()

    await ctx.db.insert("fin_categories", {
      name: args.name,
      type: args.type,
      description: null,
      color: args.color,
      icon: args.icon,
      is_active: true,
      sort_order: maxSort + 10,
      created_at: now,
      updated_at: now,
    })

    return { created: true, name: args.name }
  },
})

export const bulkSetCategory = mutation({
  args: {
    userId: v.string(),
    updates: v.array(
      v.object({
        transactionId: v.string(),
        category: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const byId = new Map(args.updates.map((u) => [u.transactionId, u.category]))

    const transactions = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect()

    const now = new Date().toISOString()
    let updated = 0
    const missing: string[] = []

    for (const transaction of transactions) {
      const nextCategory = byId.get(transaction.transaction_id)
      if (nextCategory === undefined) {
        continue
      }
      if (transaction.category !== nextCategory) {
        await ctx.db.patch(transaction._id, { category: nextCategory, updated_at: now })
        updated += 1
      }
      byId.delete(transaction.transaction_id)
    }

    for (const id of byId.keys()) {
      missing.push(id)
    }

    return { updated, requested: args.updates.length, missing }
  },
})

export const splitTransaction = mutation({
  args: {
    userId: v.string(),
    transactionId: v.string(),
    parts: v.array(
      v.object({
        category: v.string(),
        amount: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const original = await ctx.db
      .query("fin_transactions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .filter((q) => q.eq(q.field("transaction_id"), args.transactionId))
      .unique()

    if (!original) {
      return { success: false, error: "Transaction not found" }
    }
    if (args.parts.length < 2) {
      return { success: false, error: "Need at least two parts to split" }
    }

    const now = new Date().toISOString()
    const [first, ...rest] = args.parts

    // Part 1 replaces the original row.
    await ctx.db.patch(original._id, {
      category: first.category,
      amount: first.amount,
      abs_amount: Math.abs(first.amount),
      is_expense: first.amount < 0,
      updated_at: now,
    })

    // Remaining parts become new rows copied from the original.
    let index = 2
    for (const part of rest) {
      await ctx.db.insert("fin_transactions", {
        user_id: original.user_id,
        transaction_id: `${original.transaction_id}-s${index}`,
        date: original.date,
        account: original.account,
        counterparty: original.counterparty,
        description: original.description,
        amount: part.amount,
        currency: original.currency,
        type: original.type,
        category: part.category,
        sub_category: original.sub_category,
        source: original.source,
        year: original.year,
        month: original.month,
        month_label: original.month_label,
        is_expense: part.amount < 0,
        abs_amount: Math.abs(part.amount),
        exclude_from_spending: original.exclude_from_spending,
        user_excluded: original.user_excluded,
        created_at: now,
        updated_at: now,
      })
      index += 1
    }

    return { success: true, parts: args.parts.length }
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
