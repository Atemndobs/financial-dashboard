import { type NextRequest, NextResponse } from "next/server"
import { deleteForeignIncome, listForeignIncome } from "@/lib/data/tax-records"

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
    const rows = await listForeignIncome(year)
    return NextResponse.json({ year, items: rows })
  } catch (error) {
    console.error("[tax/foreign-income] GET failed", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await deleteForeignIncome(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[tax/foreign-income] DELETE failed", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
