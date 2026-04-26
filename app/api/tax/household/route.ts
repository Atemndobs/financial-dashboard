import { type NextRequest, NextResponse } from "next/server"
import { loadHousehold, saveHousehold } from "@/lib/data/tax-records"
import type { HouseholdContextInput } from "@/lib/tax/estimate-types"

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
    const household = await loadHousehold(year)
    return NextResponse.json({ year, household })
  } catch (error) {
    console.error("[tax/household] GET failed", error)
    return NextResponse.json({ error: "Failed to load household" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const year = parseYear(request)
  if (year === null) return NextResponse.json({ error: "Missing year" }, { status: 400 })
  try {
    const body = (await request.json()) as HouseholdContextInput
    const amount = body.spouse_income_amount ?? null
    const rate = body.spouse_income_exchange_rate ?? null
    const chf = body.spouse_income_chf ?? (amount !== null && rate !== null ? amount * rate : null)
    await saveHousehold(year, {
      spouse_income_country: body.spouse_income_country ?? null,
      spouse_income_currency: body.spouse_income_currency ?? null,
      spouse_income_amount: amount,
      spouse_income_exchange_rate: rate,
      spouse_income_chf: chf,
      progression_notes: body.progression_notes ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[tax/household] PUT failed", error)
    return NextResponse.json({ error: "Failed to save household" }, { status: 500 })
  }
}
