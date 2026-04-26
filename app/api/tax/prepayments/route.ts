import { type NextRequest, NextResponse } from "next/server"
import { loadPrepayments, savePrepayments } from "@/lib/data/tax-records"
import type { PrepaymentsInput } from "@/lib/tax/estimate-types"

function parseYear(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)
  if (!yearParam || Number.isNaN(year)) return null
  return year
}

export async function GET(request: NextRequest) {
  const year = parseYear(request)
  if (year === null) return NextResponse.json({ error: "Missing year" }, { status: 400 })
  try {
    const prepayments = await loadPrepayments(year)
    return NextResponse.json({ year, prepayments })
  } catch (error) {
    console.error("[tax/prepayments] GET failed", error)
    return NextResponse.json({ error: "Failed to load prepayments" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const year = parseYear(request)
  if (year === null) return NextResponse.json({ error: "Missing year" }, { status: 400 })
  try {
    const body = (await request.json()) as PrepaymentsInput
    await savePrepayments(year, {
      source_tax_withheld: body.source_tax_withheld ?? null,
      cantonal_prepayments: body.cantonal_prepayments ?? null,
      federal_prepayments: body.federal_prepayments ?? null,
      foreign_tax_credits: body.foreign_tax_credits ?? null,
      installment_payments: body.installment_payments ?? null,
      evidence_reference: body.evidence_reference ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[tax/prepayments] PUT failed", error)
    return NextResponse.json({ error: "Failed to save prepayments" }, { status: 500 })
  }
}
