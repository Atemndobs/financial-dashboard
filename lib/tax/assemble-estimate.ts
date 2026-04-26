import { getTaxTransactions } from "@/lib/data/queries"
import {
  loadHousehold,
  loadIncomeStatement,
  loadPrepayments,
  loadProfile,
} from "@/lib/data/tax-records"
import { runEstimate } from "./pipeline"
import type { StagedTaxEstimate } from "./estimate-types"

export async function assembleEstimate(year: number): Promise<StagedTaxEstimate> {
  const [profile, household, income, prepayments, transactions] = await Promise.all([
    loadProfile(year),
    loadHousehold(year),
    loadIncomeStatement(year),
    loadPrepayments(year),
    getTaxTransactions(year),
  ])

  return runEstimate({
    year,
    profile,
    household,
    income_statement: income,
    prepayments,
    transactions,
  })
}
