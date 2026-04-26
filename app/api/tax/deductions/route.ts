import { type NextRequest, NextResponse } from "next/server"
import { getTaxTransactions } from "@/lib/data/queries"
import { computeTaxSummary } from "@/lib/tax/engine"

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)

  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid 'year' query parameter." }, { status: 400 })
  }

  try {
    const transactions = await getTaxTransactions(year)
    const summary = computeTaxSummary(transactions, year)
    return NextResponse.json(summary.deductions)
  } catch (error) {
    console.error("[tax] Failed to compute deductions:", error)
    return NextResponse.json({ error: "Failed to compute tax deductions" }, { status: 500 })
  }
}
