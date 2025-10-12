import { type NextRequest, NextResponse } from "next/server"
import { getTransactions } from "@/lib/data/queries"
import type { FilterState } from "@/lib/types"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const filters: FilterState = {
    year: searchParams.get("year") ? Number.parseInt(searchParams.get("year")!) : null,
    account: searchParams.get("account") || null,
    includeTransfers: searchParams.get("includeTransfers") === "true",
    includeSavings: searchParams.get("includeSavings") === "true",
  }

  try {
    const data = await getTransactions(filters, 500) // Limit to 500 transactions
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in transactions API:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
