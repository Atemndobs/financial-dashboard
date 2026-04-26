import { type NextRequest, NextResponse } from "next/server"
import { getTaxDiagnostics, getTaxTransactions } from "@/lib/data/queries"
import { assembleEstimate } from "@/lib/tax/assemble-estimate"
import { computeTaxSummary } from "@/lib/tax/engine"

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)

  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid 'year' query parameter." }, { status: 400 })
  }

  try {
    const [transactions, diagnostics, estimate] = await Promise.all([
      getTaxTransactions(year),
      getTaxDiagnostics(),
      assembleEstimate(year),
    ])
    const legacy = computeTaxSummary(transactions, year)

    return NextResponse.json({
      ...legacy,
      estimate,
      diagnostics: {
        user_id: diagnostics.user_id,
        transaction_count: diagnostics.transaction_count,
        tax_years: diagnostics.tax_years,
        latest_transaction_date: diagnostics.latest_transaction_date,
        selected_year_transaction_count: transactions.length,
      },
    })
  } catch (error) {
    console.error("[tax] Failed to compute summary:", error)
    return NextResponse.json({ error: "Failed to compute tax summary" }, { status: 500 })
  }
}
