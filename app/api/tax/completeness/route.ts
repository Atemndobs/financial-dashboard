import { type NextRequest, NextResponse } from "next/server"
import { assembleEstimate } from "@/lib/tax/assemble-estimate"

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)
  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing year" }, { status: 400 })
  }
  try {
    const estimate = await assembleEstimate(year)
    return NextResponse.json({
      year,
      completeness_status: estimate.completeness_status,
      warnings: estimate.warnings,
    })
  } catch (error) {
    console.error("[tax/completeness] failed", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
