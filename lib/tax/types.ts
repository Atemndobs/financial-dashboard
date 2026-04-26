export interface TaxTransaction {
  transaction_id: string
  date: string
  account: string
  counterparty: string | null
  description: string | null
  amount: number
  currency: string
  category: string
  sub_category: string | null
  type: string | null
  source: string | null
  year: number
  month: number
  month_label: string
  exclude_from_spending: boolean
  user_excluded: boolean
}

export interface TaxLimitConfig {
  flat_rate?: number | null
  max?: number | null
  single?: number
  married?: number
  threshold_pct?: number
  min?: number
  max_pct_of_net_income?: number
  max_per_child?: number
  employed?: number
  self_employed?: number
}

export interface TaxDeductionCategoryConfig {
  label_de: string
  label_en: string
  description: string
  source_categories: string[]
  limits?: TaxLimitConfig | null
  documents: string[]
}

export interface TaxConfig {
  version: string
  tax_year_default: number
  currency: string
  tax_deduction_categories: Record<string, TaxDeductionCategoryConfig>
  non_deductible_categories: string[]
  excluded_categories: string[]
}

export interface TaxDeductionSummary {
  key: string
  label_de: string
  label_en: string
  description: string
  total_amount: number
  limit_amount: number | null
  limit_info: string
  over_limit: boolean
  deductible_amount: number
  transaction_count: number
  transactions: TaxTransaction[]
  documents_needed: string[]
}

export interface TaxIncomeSource {
  counterparty: string
  total_amount: number
  transaction_count: number
}

export interface TaxDocumentChecklistItem {
  deduction_key: string
  label_de: string
  label_en: string
  total_amount: number
  documents: string[]
}

export interface TaxYearSummary {
  year: number
  currency: string
  total_income: number
  income_sources: TaxIncomeSource[]
  total_deductible_expenses: number
  total_non_deductible_expenses: number
  estimated_taxable_income: number
  deductions: TaxDeductionSummary[]
  non_deductible_transactions: TaxTransaction[]
  document_checklist: TaxDocumentChecklistItem[]
  data_source: "convex"
  fallback_used: false
  fallback_reason: null
}
