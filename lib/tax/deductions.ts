import { SWISS_TAX_CONFIG } from "./config"
import type { DeductionBreakdown } from "./estimate-types"
import type { TaxConfig, TaxLimitConfig, TaxTransaction } from "./types"

function computeLimit(
  limits: TaxLimitConfig | null | undefined,
  total: number,
  netIncome: number,
): { limitAmount: number | null; limitInfo: string; deductibleAmount: number } {
  if (!limits) return { limitAmount: null, limitInfo: "No limit", deductibleAmount: total }

  if (typeof limits.flat_rate === "number") {
    const hardMax = typeof limits.max === "number" ? limits.max : null
    if (hardMax !== null) {
      return {
        limitAmount: hardMax,
        limitInfo: `Flat rate CHF ${limits.flat_rate} or itemized (max CHF ${hardMax})`,
        deductibleAmount: Math.min(total, hardMax),
      }
    }
    return { limitAmount: null, limitInfo: `Flat rate CHF ${limits.flat_rate} or itemized`, deductibleAmount: total }
  }
  if (typeof limits.single === "number") {
    const married = typeof limits.married === "number" ? limits.married : limits.single
    return {
      limitAmount: limits.single,
      limitInfo: `Single CHF ${limits.single} / Married CHF ${married}`,
      deductibleAmount: Math.min(total, limits.single),
    }
  }
  if (typeof limits.threshold_pct === "number") {
    const threshold = (netIncome * limits.threshold_pct) / 100
    return {
      limitAmount: null,
      limitInfo: `Only amounts > ${limits.threshold_pct}% of net income (CHF ${Math.round(threshold)})`,
      deductibleAmount: Math.max(0, total - threshold),
    }
  }
  if (typeof limits.max_pct_of_net_income === "number") {
    const cap = (netIncome * limits.max_pct_of_net_income) / 100
    const minimum = typeof limits.min === "number" ? limits.min : 0
    return {
      limitAmount: cap,
      limitInfo: `Min CHF ${minimum}, max ${limits.max_pct_of_net_income}% of net income (CHF ${Math.round(cap)})`,
      deductibleAmount: total < minimum ? 0 : Math.min(total, cap),
    }
  }
  if (typeof limits.max === "number") {
    return { limitAmount: limits.max, limitInfo: `Max CHF ${limits.max}`, deductibleAmount: Math.min(total, limits.max) }
  }
  return { limitAmount: null, limitInfo: "No limit", deductibleAmount: total }
}

export interface DeductionResult {
  breakdown: DeductionBreakdown
  informational_non_deductible_total: number
}

export function discoverDeductions(
  transactions: TaxTransaction[],
  grossIncome: number,
  config: TaxConfig = SWISS_TAX_CONFIG,
): DeductionResult {
  const excluded = new Set(config.excluded_categories)
  const expenses = transactions.filter((t) => t.amount < 0 && !excluded.has(t.category) && !t.user_excluded)
  const totalExpenses = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0)
  const netIncome = Math.max(0, grossIncome - totalExpenses)

  const allDeductibleCats = new Set<string>()
  Object.values(config.tax_deduction_categories).forEach((d) =>
    d.source_categories.forEach((c) => allDeductibleCats.add(c)),
  )

  const items: DeductionBreakdown["items"] = []
  let totalAllowed = 0
  for (const [key, cfg] of Object.entries(config.tax_deduction_categories)) {
    const catSet = new Set(cfg.source_categories)
    const matched = expenses.filter((t) => catSet.has(t.category))
    const detected = matched.reduce((acc, t) => acc + Math.abs(t.amount), 0)
    const limit = computeLimit(cfg.limits, detected, netIncome)
    items.push({
      key,
      label_en: cfg.label_en,
      label_de: cfg.label_de,
      total_detected: detected,
      deductible_amount: limit.deductibleAmount,
      limit_info: limit.limitInfo,
      over_limit: limit.limitAmount !== null && detected > limit.limitAmount,
      transaction_count: matched.length,
    })
    totalAllowed += limit.deductibleAmount
  }

  const nonDeductible = new Set(config.non_deductible_categories)
  const nonDedTxns = expenses.filter(
    (t) => nonDeductible.has(t.category) || (!allDeductibleCats.has(t.category) && !excluded.has(t.category)),
  )
  const informational = nonDedTxns.reduce((acc, t) => acc + Math.abs(t.amount), 0)

  return {
    breakdown: { total_allowed: totalAllowed, items },
    informational_non_deductible_total: informational,
  }
}
