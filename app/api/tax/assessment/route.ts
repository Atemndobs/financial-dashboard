import { type NextRequest, NextResponse } from "next/server"
import { assembleEstimate } from "@/lib/tax/assemble-estimate"

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)
  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid 'year'." }, { status: 400 })
  }
  try {
    const estimate = await assembleEstimate(year)
    return NextResponse.json(estimate)
  } catch (error) {
    console.error("[tax/assessment] failed", error)
    const message = error instanceof Error ? error.message : "Failed to compute assessment"
    return NextResponse.json({ error: `Failed to compute assessment: ${message}` }, { status: 500 })
  }
}
