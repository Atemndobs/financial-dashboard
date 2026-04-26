import { type NextRequest, NextResponse } from "next/server"
import { getTaxTransactions } from "@/lib/data/queries"
import { computeTaxSummary } from "@/lib/tax/engine"

type RouteContext = {
  params: Promise<{
    deductionKey: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)

  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid 'year' query parameter." }, { status: 400 })
  }

  try {
    const { deductionKey } = await context.params
    const transactions = await getTaxTransactions(year)
    const summary = computeTaxSummary(transactions, year)
    const deduction = summary.deductions.find((item) => item.key === deductionKey)

    if (!deduction) {
      return NextResponse.json({ error: `Deduction '${deductionKey}' not found` }, { status: 404 })
    }

    return NextResponse.json(deduction)
  } catch (error) {
    console.error("[tax] Failed to compute deduction detail:", error)
    return NextResponse.json({ error: "Failed to compute deduction detail" }, { status: 500 })
  }
}
