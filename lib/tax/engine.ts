import { SWISS_TAX_CONFIG } from "@/lib/tax/config"
import type {
  TaxConfig,
  TaxDeductionSummary,
  TaxDocumentChecklistItem,
  TaxLimitConfig,
  TaxTransaction,
  TaxYearSummary,
} from "@/lib/tax/types"

type LimitComputation = {
  limitAmount: number | null
  limitInfo: string
  deductibleAmount: number
}

function normalizeTransaction(transaction: TaxTransaction): TaxTransaction {
  return {
    ...transaction,
    counterparty: transaction.counterparty || "Unknown",
    category: transaction.category || "Unknown",
  }
}

function computeLimitAmount(limits: TaxLimitConfig | null | undefined, total: number, netIncome: number): LimitComputation {
  if (!limits) {
    return { limitAmount: null, limitInfo: "No limit", deductibleAmount: total }
  }

  if (typeof limits.flat_rate === "number") {
    const hardMax = typeof limits.max === "number" ? limits.max : null
    if (hardMax !== null) {
      return {
        limitAmount: hardMax,
        limitInfo: `Flat rate CHF ${limits.flat_rate.toLocaleString("de-CH")} or itemized (max CHF ${hardMax.toLocaleString("de-CH")})`,
        deductibleAmount: Math.min(total, hardMax),
      }
    }
    return {
      limitAmount: null,
      limitInfo: `Flat rate CHF ${limits.flat_rate.toLocaleString("de-CH")} or itemized`,
      deductibleAmount: total,
    }
  }

  if (typeof limits.single === "number") {
    const married = typeof limits.married === "number" ? limits.married : limits.single
    return {
      limitAmount: limits.single,
      limitInfo: `Single: CHF ${limits.single.toLocaleString("de-CH")} / Married: CHF ${married.toLocaleString("de-CH")}`,
      deductibleAmount: Math.min(total, limits.single),
    }
  }

  if (typeof limits.threshold_pct === "number") {
    const threshold = (netIncome * limits.threshold_pct) / 100
    return {
      limitAmount: null,
      limitInfo: `Only amounts exceeding ${limits.threshold_pct}% of net income (CHF ${threshold.toLocaleString("de-CH", { maximumFractionDigits: 0 })})`,
      deductibleAmount: Math.max(0, total - threshold),
    }
  }

  if (typeof limits.max_pct_of_net_income === "number") {
    const cap = (netIncome * limits.max_pct_of_net_income) / 100
    const minimum = typeof limits.min === "number" ? limits.min : 0
    return {
      limitAmount: cap,
      limitInfo: `Min CHF ${minimum.toLocaleString("de-CH")}, max ${limits.max_pct_of_net_income}% of net income (CHF ${cap.toLocaleString("de-CH", { maximumFractionDigits: 0 })})`,
      deductibleAmount: total < minimum ? 0 : Math.min(total, cap),
    }
  }

  if (typeof limits.max === "number") {
    return {
      limitAmount: limits.max,
      limitInfo: `Max CHF ${limits.max.toLocaleString("de-CH")}`,
      deductibleAmount: Math.min(total, limits.max),
    }
  }

  if (typeof limits.max_per_child === "number") {
    return {
      limitAmount: limits.max_per_child,
      limitInfo: `Max CHF ${limits.max_per_child.toLocaleString("de-CH")} per child`,
      deductibleAmount: Math.min(total, limits.max_per_child),
    }
  }

  if (typeof limits.employed === "number") {
    const selfEmployed = typeof limits.self_employed === "number" ? limits.self_employed : limits.employed
    return {
      limitAmount: limits.employed,
      limitInfo: `Employed: CHF ${limits.employed.toLocaleString("de-CH")} / Self-employed: CHF ${selfEmployed.toLocaleString("de-CH")}`,
      deductibleAmount: Math.min(total, limits.employed),
    }
  }

  return { limitAmount: null, limitInfo: "No limit", deductibleAmount: total }
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0)
}

export function computeTaxSummary(
  transactions: TaxTransaction[],
  year: number,
  config: TaxConfig = SWISS_TAX_CONFIG,
): TaxYearSummary {
  const normalized = transactions.map(normalizeTransaction)
  const yearTransactions = normalized.filter((transaction) => transaction.year === year && !transaction.user_excluded)
  const currency = config.currency || "CHF"

  if (yearTransactions.length === 0) {
    return {
      year,
      currency,
      total_income: 0,
      income_sources: [],
      total_deductible_expenses: 0,
      total_non_deductible_expenses: 0,
      estimated_taxable_income: 0,
      deductions: [],
      non_deductible_transactions: [],
      document_checklist: [],
      data_source: "convex",
      fallback_used: false,
      fallback_reason: null,
    }
  }

  const incomeTransactions = yearTransactions.filter((transaction) => transaction.amount > 0)
  const totalIncome = sum(incomeTransactions.map((transaction) => transaction.amount))

  const incomeByCounterparty = new Map<string, { total: number; count: number }>()
  for (const transaction of incomeTransactions) {
    const key = transaction.counterparty || "Unknown"
    const existing = incomeByCounterparty.get(key) || { total: 0, count: 0 }
    existing.total += transaction.amount
    existing.count += 1
    incomeByCounterparty.set(key, existing)
  }
  const incomeSources = Array.from(incomeByCounterparty.entries())
    .map(([counterparty, value]) => ({
      counterparty,
      total_amount: value.total,
      transaction_count: value.count,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)

  const excludedCategories = new Set(config.excluded_categories)
  const expenseTransactions = yearTransactions.filter(
    (transaction) => transaction.amount < 0 && !excludedCategories.has(transaction.category),
  )

  const deductionCategories = config.tax_deduction_categories
  const allDeductibleCategories = new Set<string>()
  Object.values(deductionCategories).forEach((deduction) => {
    deduction.source_categories.forEach((category) => allDeductibleCategories.add(category))
  })

  const totalExpenses = sum(expenseTransactions.map((transaction) => Math.abs(transaction.amount)))
  const netIncome = Math.max(0, totalIncome - totalExpenses)

  const deductions: TaxDeductionSummary[] = []
  let totalDeductible = 0

  for (const [key, deductionConfig] of Object.entries(deductionCategories)) {
    const categorySet = new Set(deductionConfig.source_categories)
    const matched = expenseTransactions.filter((transaction) => categorySet.has(transaction.category))
    const totalAmount = sum(matched.map((transaction) => Math.abs(transaction.amount)))

    const limit = computeLimitAmount(deductionConfig.limits, totalAmount, netIncome)
    const overLimit = limit.limitAmount !== null && totalAmount > limit.limitAmount

    deductions.push({
      key,
      label_de: deductionConfig.label_de,
      label_en: deductionConfig.label_en,
      description: deductionConfig.description,
      total_amount: totalAmount,
      limit_amount: limit.limitAmount,
      limit_info: limit.limitInfo,
      over_limit: overLimit,
      deductible_amount: limit.deductibleAmount,
      transaction_count: matched.length,
      transactions: matched,
      documents_needed: deductionConfig.documents,
    })

    totalDeductible += limit.deductibleAmount
  }

  const nonDeductibleCategories = new Set(config.non_deductible_categories)
  const nonDeductibleTransactions = expenseTransactions.filter((transaction) => {
    if (nonDeductibleCategories.has(transaction.category)) {
      return true
    }
    return !allDeductibleCategories.has(transaction.category) && !excludedCategories.has(transaction.category)
  })
  const totalNonDeductible = sum(nonDeductibleTransactions.map((transaction) => Math.abs(transaction.amount)))

  const checklist: TaxDocumentChecklistItem[] = [
    {
      deduction_key: "_general",
      label_de: "Allgemeine Unterlagen",
      label_en: "General Documents",
      total_amount: 0,
      documents: [
        "Lohnausweis (salary certificate) from employer",
        "Bank account statements (all accounts)",
        "Wertschriftenverzeichnis (securities statement)",
        "Previous year's tax assessment (Veranlagungsverfugung)",
      ],
    },
    ...deductions
      .filter((deduction) => deduction.transaction_count > 0)
      .map((deduction) => ({
        deduction_key: deduction.key,
        label_de: deduction.label_de,
        label_en: deduction.label_en,
        total_amount: deduction.total_amount,
        documents: deduction.documents_needed,
      })),
  ]

  return {
    year,
    currency,
    total_income: totalIncome,
    income_sources: incomeSources,
    total_deductible_expenses: totalDeductible,
    total_non_deductible_expenses: totalNonDeductible,
    estimated_taxable_income: Math.max(0, totalIncome - totalDeductible),
    deductions,
    non_deductible_transactions: nonDeductibleTransactions,
    document_checklist: checklist,
    data_source: "convex",
    fallback_used: false,
    fallback_reason: null,
  }
}
