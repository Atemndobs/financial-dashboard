import { computeAssessment } from "./assessment"
import { discoverDeductions } from "./deductions"
import type {
  Assumption,
  ProvenanceChip,
  StagedTaxEstimate,
  Warning,
} from "./estimate-types"
import { computeCompleteness } from "./explanations"
import { buildIncome } from "./income"
import type { TaxInputs } from "./input-builder"
import { normalizePrepayments } from "./prepayments"
import { normalizeProfile } from "./profile"
import { computeProgression } from "./progression"
import { computeSettlement } from "./settlement"

export const ENGINE_VERSION = "2026.04.19-1"
export const RULE_VERSION = "ag-aarau-v1"

export function runEstimate(inputs: TaxInputs): StagedTaxEstimate {
  const warnings: Warning[] = []
  const assumptions: Assumption[] = []
  const provenance: ProvenanceChip[] = []

  const { profile, warnings: profileWarnings } = normalizeProfile(inputs.profile, inputs.year)
  warnings.push(...profileWarnings)

  const { income, warnings: incomeWarnings } = buildIncome(inputs.income_statement, inputs.transactions)
  warnings.push(...incomeWarnings)
  provenance.push({ field: "gross_taxable_income", source: income.provenance })

  const dedResult = discoverDeductions(inputs.transactions, income.gross_taxable_income)
  provenance.push({ field: "deductions", source: "derived_from_transactions" })

  const taxableIncome = Math.max(0, income.gross_taxable_income - dedResult.breakdown.total_allowed)

  const { progression, warnings: progressionWarnings } = computeProgression(
    profile,
    inputs.household,
    taxableIncome,
  )
  warnings.push(...progressionWarnings)
  if (inputs.household) provenance.push({ field: "spouse_income", source: "manual" })

  const { breakdown: prepayments, warnings: prepaymentWarnings } = normalizePrepayments(
    inputs.prepayments,
  )
  warnings.push(...prepaymentWarnings)
  if (inputs.prepayments) provenance.push({ field: "prepayments", source: "manual" })

  const { tax: finalTax, assumptions: assessmentAssumptions } = computeAssessment(
    profile,
    taxableIncome,
    progression.rate_determining_income,
  )
  assumptions.push(...assessmentAssumptions)

  const canSettle = prepayments.total > 0
  const settlement = computeSettlement(finalTax, prepayments, canSettle)

  const completeness = computeCompleteness(warnings)

  return {
    year: inputs.year,
    currency: "CHF",
    engine_version: ENGINE_VERSION,
    rule_version: RULE_VERSION,
    profile,
    household: inputs.household ?? {
      spouse_income_country: null,
      spouse_income_currency: null,
      spouse_income_amount: null,
      spouse_income_exchange_rate: null,
      spouse_income_chf: null,
      progression_notes: null,
    },
    income_breakdown: income,
    deduction_breakdown: dedResult.breakdown,
    progression_inputs: progression,
    prepayments,
    estimated_taxable_income: taxableIncome,
    estimated_final_tax: finalTax,
    estimated_balance: settlement,
    warnings,
    assumptions,
    provenance_summary: provenance,
    completeness_status: completeness,
    informational_non_deductible_total: dedResult.informational_non_deductible_total,
  }
}
