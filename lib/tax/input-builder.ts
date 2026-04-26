import type {
  HouseholdContextInput,
  IncomeStatementInput,
  PrepaymentsInput,
  TaxProfileInput,
} from "./estimate-types"
import type { TaxTransaction } from "./types"

export interface TaxInputs {
  year: number
  profile: Partial<TaxProfileInput> | null
  household: HouseholdContextInput | null
  income_statement: IncomeStatementInput | null
  prepayments: PrepaymentsInput | null
  transactions: TaxTransaction[]
}

export function buildInputs(params: TaxInputs): TaxInputs {
  return params
}
