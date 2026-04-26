export type Provenance =
  | "manual"
  | "imported_document"
  | "derived_from_transactions"
  | "assumed_default"

export interface TaxProfileInput {
  tax_year: number
  canton: string | null
  municipality: string | null
  residence_permit: string | null
  source_tax_code: string | null
  marital_status: "single" | "married" | "divorced" | "widowed" | null
  is_separated: boolean
  children_count: number
  church_tax: boolean
  tax_liability_start: string | null
  tax_liability_end: string | null
  country_of_residence: string | null
}

export interface HouseholdContextInput {
  spouse_income_country: string | null
  spouse_income_currency: string | null
  spouse_income_amount: number | null
  spouse_income_exchange_rate: number | null
  spouse_income_chf: number | null
  progression_notes: string | null
}

export interface IncomeStatementInput {
  source_type: "salary_certificate" | "manual" | "derived_from_transactions"
  gross_salary: number | null
  bonus_income: number | null
  other_taxable_income: number | null
  salary_certificate_reference: string | null
}

export interface PrepaymentsInput {
  source_tax_withheld: number | null
  cantonal_prepayments: number | null
  federal_prepayments: number | null
  foreign_tax_credits: number | null
  installment_payments: number | null
  evidence_reference: string | null
}

export interface Warning {
  code: string
  severity: "info" | "warning" | "blocker"
  message: string
}

export interface Assumption {
  code: string
  message: string
}

export interface ProvenanceChip {
  field: string
  source: Provenance
}

export interface CompletenessStatus {
  complete: boolean
  missing: string[]
  blockers: string[]
}

export interface IncomeBreakdown {
  gross_salary: number
  bonus_income: number
  other_taxable_income: number
  gross_taxable_income: number
  provenance: Provenance
}

export interface DeductionBreakdown {
  total_allowed: number
  items: Array<{
    key: string
    label_en: string
    label_de: string
    total_detected: number
    deductible_amount: number
    limit_info: string
    over_limit: boolean
    transaction_count: number
  }>
}

export interface ProgressionInputs {
  spouse_income_chf: number
  rate_determining_income: number
  applied: boolean
  note: string | null
}

export interface PrepaymentsBreakdown {
  source_tax_withheld: number
  cantonal_prepayments: number
  federal_prepayments: number
  foreign_tax_credits: number
  installment_payments: number
  total: number
}

export interface EstimatedFinalTax {
  federal: number
  cantonal: number
  municipal: number
  church: number
  total: number
}

export interface SettlementResult {
  estimated_balance: number
  direction: "due" | "refund" | "balanced" | "indeterminate"
}

export type ForeignIncomeTreatment =
  | "pre_liability_informational"
  | "progression_only"
  | "foreign_tax_credit_candidate"

export interface ForeignIncomeRecord {
  _id?: string
  document_type: string
  country: string
  period_start: string | null
  period_end: string | null
  gross_amount: number
  currency: string
  foreign_tax_paid: number | null
  treatment: ForeignIncomeTreatment
  notes: string | null
}

export interface StagedTaxEstimate {
  year: number
  currency: string
  engine_version: string
  rule_version: string

  profile: TaxProfileInput
  household: HouseholdContextInput
  income_breakdown: IncomeBreakdown
  deduction_breakdown: DeductionBreakdown
  progression_inputs: ProgressionInputs
  prepayments: PrepaymentsBreakdown

  estimated_taxable_income: number
  estimated_final_tax: EstimatedFinalTax
  estimated_balance: SettlementResult

  warnings: Warning[]
  assumptions: Assumption[]
  provenance_summary: ProvenanceChip[]
  completeness_status: CompletenessStatus
  informational_non_deductible_total: number
}
