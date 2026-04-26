import type { PrepaymentsBreakdown, PrepaymentsInput, Warning } from "./estimate-types"

export function normalizePrepayments(
  input: PrepaymentsInput | null,
): { breakdown: PrepaymentsBreakdown; warnings: Warning[] } {
  const warnings: Warning[] = []
  const source = input?.source_tax_withheld ?? 0
  const cantonal = input?.cantonal_prepayments ?? 0
  const federal = input?.federal_prepayments ?? 0
  const foreign = input?.foreign_tax_credits ?? 0
  const installments = input?.installment_payments ?? 0
  const total = source + cantonal + federal + foreign + installments

  if (!input || source === 0) {
    warnings.push({
      code: "missing_source_tax_withheld",
      severity: "blocker",
      message:
        "Source tax withheld is missing. Balance cannot be computed without withholding totals. Enter the amount from your payslip summary or tax statement.",
    })
  }

  return {
    breakdown: {
      source_tax_withheld: source,
      cantonal_prepayments: cantonal,
      federal_prepayments: federal,
      foreign_tax_credits: foreign,
      installment_payments: installments,
      total,
    },
    warnings,
  }
}
