import { type NextRequest, NextResponse } from "next/server"
import { getTaxTransactions } from "@/lib/data/queries"
import { loadIncomeStatement, saveIncomeStatement } from "@/lib/data/tax-records"
import { computeTaxSummary } from "@/lib/tax/engine"
import type { IncomeStatementInput } from "@/lib/tax/estimate-types"

function parseYear(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)
  if (!yearParam || Number.isNaN(year)) return null
  return year
}

export async function GET(request: NextRequest) {
  const year = parseYear(request)
  if (year === null) {
    return NextResponse.json({ error: "Missing or invalid 'year' query parameter." }, { status: 400 })
  }
  try {
    const [transactions, income_statement] = await Promise.all([
      getTaxTransactions(year),
      loadIncomeStatement(year),
    ])
    const summary = computeTaxSummary(transactions, year)
    return NextResponse.json({
      year: summary.year,
      total_income: summary.total_income,
      sources: summary.income_sources,
      income_statement,
      data_source: "convex",
      fallback_used: false,
      fallback_reason: null,
    })
  } catch (error) {
    console.error("[tax] Failed to compute income:", error)
    return NextResponse.json({ error: "Failed to compute tax income" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const year = parseYear(request)
  if (year === null) {
    return NextResponse.json({ error: "Missing or invalid 'year' query parameter." }, { status: 400 })
  }
  try {
    const body = (await request.json()) as IncomeStatementInput
    await saveIncomeStatement(year, {
      source_type: body.source_type ?? "manual",
      gross_salary: body.gross_salary ?? null,
      bonus_income: body.bonus_income ?? null,
      other_taxable_income: body.other_taxable_income ?? null,
      salary_certificate_reference: body.salary_certificate_reference ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[tax/income] PUT failed", error)
    return NextResponse.json({ error: "Failed to save income" }, { status: 500 })
  }
}
