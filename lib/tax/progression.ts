import type {
  HouseholdContextInput,
  ProgressionInputs,
  TaxProfileInput,
  Warning,
} from "./estimate-types"

export function computeProgression(
  profile: TaxProfileInput,
  household: HouseholdContextInput | null,
  taxableIncome: number,
): { progression: ProgressionInputs; warnings: Warning[] } {
  const warnings: Warning[] = []

  if (profile.marital_status !== "married") {
    return {
      progression: {
        spouse_income_chf: 0,
        rate_determining_income: taxableIncome,
        applied: false,
        note: null,
      },
      warnings,
    }
  }

  if (!household || (household.spouse_income_amount ?? 0) === 0) {
    warnings.push({
      code: "missing_spouse_income_progression",
      severity: "warning",
      message:
        "Married status requires spouse income for progression calculation. Enter spouse income to apply progression properly.",
    })
    return {
      progression: {
        spouse_income_chf: 0,
        rate_determining_income: taxableIncome,
        applied: false,
        note: "Spouse income missing; progression not applied.",
      },
      warnings,
    }
  }

  let spouseChf = household.spouse_income_chf ?? 0
  if (!spouseChf && household.spouse_income_amount && household.spouse_income_exchange_rate) {
    spouseChf = household.spouse_income_amount * household.spouse_income_exchange_rate
  }

  return {
    progression: {
      spouse_income_chf: spouseChf,
      rate_determining_income: taxableIncome + spouseChf,
      applied: true,
      note: "Spouse foreign income added for rate determination only, not as Swiss taxable income.",
    },
    warnings,
  }
}
