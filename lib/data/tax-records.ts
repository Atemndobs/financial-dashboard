import { auth } from "@clerk/nextjs/server"
import { runConvexMutation, runConvexQuery } from "@/lib/convex/server"
import type {
  ForeignIncomeRecord,
  HouseholdContextInput,
  IncomeStatementInput,
  PrepaymentsInput,
  TaxProfileInput,
} from "@/lib/tax/estimate-types"

async function requireUserId() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return userId
}

async function safeQuery<T>(fn: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    return await runConvexQuery<any, T>(fn, args as any)
  } catch (error) {
    console.warn(`[tax-records] Convex query ${fn} unavailable:`, error instanceof Error ? error.message : error)
    return fallback
  }
}

export async function loadProfile(year: number): Promise<Partial<TaxProfileInput> | null> {
  const userId = await requireUserId()
  const row = await safeQuery<any>("tax:getProfile", { userId, taxYear: year }, null)
  if (!row) return null
  return {
    tax_year: row.tax_year,
    canton: row.canton,
    municipality: row.municipality,
    residence_permit: row.residence_permit,
    source_tax_code: row.source_tax_code,
    marital_status: row.marital_status,
    is_separated: row.is_separated,
    children_count: row.children_count,
    church_tax: row.church_tax,
    tax_liability_start: row.tax_liability_start,
    tax_liability_end: row.tax_liability_end,
    country_of_residence: row.country_of_residence,
  }
}

export async function saveProfile(year: number, data: Omit<TaxProfileInput, "tax_year">) {
  const userId = await requireUserId()
  return runConvexMutation("tax:upsertProfile", {
    userId,
    taxYear: year,
    canton: data.canton,
    municipality: data.municipality,
    residence_permit: data.residence_permit,
    source_tax_code: data.source_tax_code,
    marital_status: data.marital_status,
    is_separated: data.is_separated,
    children_count: data.children_count,
    church_tax: data.church_tax,
    tax_liability_start: data.tax_liability_start,
    tax_liability_end: data.tax_liability_end,
    country_of_residence: data.country_of_residence,
  } as any)
}

export async function loadHousehold(year: number): Promise<HouseholdContextInput | null> {
  const userId = await requireUserId()
  const row = await safeQuery<any>("tax:getHousehold", { userId, taxYear: year }, null)
  if (!row) return null
  return {
    spouse_income_country: row.spouse_income_country,
    spouse_income_currency: row.spouse_income_currency,
    spouse_income_amount: row.spouse_income_amount,
    spouse_income_exchange_rate: row.spouse_income_exchange_rate,
    spouse_income_chf: row.spouse_income_chf,
    progression_notes: row.progression_notes,
  }
}

export async function saveHousehold(year: number, data: HouseholdContextInput) {
  const userId = await requireUserId()
  return runConvexMutation("tax:upsertHousehold", { userId, taxYear: year, ...data } as any)
}

export async function loadIncomeStatement(year: number): Promise<IncomeStatementInput | null> {
  const userId = await requireUserId()
  const row = await safeQuery<any>("tax:getIncomeStatement", { userId, taxYear: year }, null)
  if (!row) return null
  return {
    source_type: row.source_type,
    gross_salary: row.gross_salary,
    bonus_income: row.bonus_income,
    other_taxable_income: row.other_taxable_income,
    salary_certificate_reference: row.salary_certificate_reference,
  }
}

export async function saveIncomeStatement(year: number, data: IncomeStatementInput) {
  const userId = await requireUserId()
  return runConvexMutation("tax:upsertIncomeStatement", { userId, taxYear: year, ...data } as any)
}

export async function loadPrepayments(year: number): Promise<PrepaymentsInput | null> {
  const userId = await requireUserId()
  const row = await safeQuery<any>("tax:getPrepayments", { userId, taxYear: year }, null)
  if (!row) return null
  return {
    source_tax_withheld: row.source_tax_withheld,
    cantonal_prepayments: row.cantonal_prepayments,
    federal_prepayments: row.federal_prepayments,
    foreign_tax_credits: row.foreign_tax_credits,
    installment_payments: row.installment_payments,
    evidence_reference: row.evidence_reference,
  }
}

export async function savePrepayments(year: number, data: PrepaymentsInput) {
  const userId = await requireUserId()
  return runConvexMutation("tax:upsertPrepayments", { userId, taxYear: year, ...data } as any)
}

export async function listForeignIncome(year: number): Promise<(ForeignIncomeRecord & { _id: string })[]> {
  const userId = await requireUserId()
  const rows = await safeQuery<any[]>("tax:listForeignIncome", { userId, taxYear: year }, [])
  return (rows ?? []).map((r) => ({
    _id: r._id,
    document_type: r.document_type,
    country: r.country,
    period_start: r.period_start,
    period_end: r.period_end,
    gross_amount: r.gross_amount,
    currency: r.currency,
    foreign_tax_paid: r.foreign_tax_paid,
    treatment: r.treatment,
    notes: r.notes,
  }))
}

export async function addForeignIncome(year: number, record: ForeignIncomeRecord & { raw_parsed?: unknown }) {
  const userId = await requireUserId()
  return runConvexMutation("tax:addForeignIncome", {
    userId,
    taxYear: year,
    document_type: record.document_type,
    country: record.country,
    period_start: record.period_start,
    period_end: record.period_end,
    gross_amount: record.gross_amount,
    currency: record.currency,
    foreign_tax_paid: record.foreign_tax_paid,
    treatment: record.treatment,
    notes: record.notes,
    raw_parsed: record.raw_parsed ?? null,
  } as any)
}

export async function deleteForeignIncome(id: string) {
  return runConvexMutation("tax:deleteForeignIncome", { id } as any)
}
