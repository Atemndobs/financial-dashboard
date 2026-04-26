import { type NextRequest, NextResponse } from "next/server"
import { loadProfile, saveProfile } from "@/lib/data/tax-records"
import type { TaxProfileInput } from "@/lib/tax/estimate-types"

function parseYear(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)
  if (!yearParam || Number.isNaN(year)) return null
  return year
}

export async function GET(request: NextRequest) {
  const year = parseYear(request)
  if (year === null) {
    return NextResponse.json({ error: "Missing or invalid 'year'." }, { status: 400 })
  }
  try {
    const profile = await loadProfile(year)
    return NextResponse.json({ year, profile })
  } catch (error) {
    console.error("[tax/profile] GET failed", error)
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const year = parseYear(request)
  if (year === null) {
    return NextResponse.json({ error: "Missing or invalid 'year'." }, { status: 400 })
  }
  try {
    const body = (await request.json()) as Omit<TaxProfileInput, "tax_year">
    await saveProfile(year, {
      canton: body.canton ?? null,
      municipality: body.municipality ?? null,
      residence_permit: body.residence_permit ?? null,
      source_tax_code: body.source_tax_code ?? null,
      marital_status: body.marital_status ?? null,
      is_separated: body.is_separated ?? false,
      children_count: body.children_count ?? 0,
      church_tax: body.church_tax ?? false,
      tax_liability_start: body.tax_liability_start ?? null,
      tax_liability_end: body.tax_liability_end ?? null,
      country_of_residence: body.country_of_residence ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[tax/profile] PUT failed", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}
