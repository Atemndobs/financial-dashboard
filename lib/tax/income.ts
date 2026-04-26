import type {
  IncomeBreakdown,
  IncomeStatementInput,
  Provenance,
  Warning,
} from "./estimate-types"
import type { TaxTransaction } from "./types"

export function buildIncome(
  statement: IncomeStatementInput | null,
  transactions: TaxTransaction[],
): { income: IncomeBreakdown; warnings: Warning[] } {
  const warnings: Warning[] = []

  if (statement && (statement.gross_salary ?? 0) > 0) {
    const gross = statement.gross_salary ?? 0
    const bonus = statement.bonus_income ?? 0
    const other = statement.other_taxable_income ?? 0
    const provenance: Provenance =
      statement.source_type === "salary_certificate" ? "imported_document" : "manual"
    return {
      income: {
        gross_salary: gross,
        bonus_income: bonus,
        other_taxable_income: other,
        gross_taxable_income: gross + bonus + other,
        provenance,
      },
      warnings,
    }
  }

  const incomeTxns = transactions.filter((t) => t.amount > 0)
  const derived = incomeTxns.reduce((acc, t) => acc + t.amount, 0)
  warnings.push({
    code: "income_derived_from_transactions",
    severity: "warning",
    message:
      "No salary certificate on file — gross taxable income was derived from bank transactions. This is a lower-confidence fallback.",
  })
  if (derived === 0) {
    warnings.push({
      code: "no_income_data",
      severity: "blocker",
      message: "No income data available. Enter a salary certificate to produce an estimate.",
    })
  }

  return {
    income: {
      gross_salary: derived,
      bonus_income: 0,
      other_taxable_income: 0,
      gross_taxable_income: derived,
      provenance: "derived_from_transactions",
    },
    warnings,
  }
}
