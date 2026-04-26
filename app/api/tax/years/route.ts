import { NextResponse } from "next/server"
import { getTaxDiagnostics, getTaxYears } from "@/lib/data/queries"

export async function GET() {
  try {
    const [years, diagnostics] = await Promise.all([getTaxYears(), getTaxDiagnostics()])

    return NextResponse.json({
      years,
      count: years.length,
      data_source: "convex",
      fallback_used: false,
      fallback_reason: null,
      diagnostics: {
        user_id: diagnostics.user_id,
        transaction_count: diagnostics.transaction_count,
        tax_years: diagnostics.tax_years,
        latest_transaction_date: diagnostics.latest_transaction_date,
      },
    })
  } catch (error) {
    console.error("[tax] Failed to fetch tax years:", error)
    return NextResponse.json({ error: "Failed to fetch tax years" }, { status: 500 })
  }
}
