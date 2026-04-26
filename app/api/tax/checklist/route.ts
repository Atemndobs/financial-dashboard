import { type NextRequest, NextResponse } from "next/server"
import { getTaxTransactions } from "@/lib/data/queries"
import { computeTaxSummary } from "@/lib/tax/engine"

const STATIC_ITEMS = [
  {
    deduction_key: "_general",
    label_de: "Allgemeine Unterlagen",
    label_en: "General Documents",
    total_amount: 0,
    documents: [
      "Lohnausweis (salary certificate) from employer",
      "Bank account statements (all accounts)",
      "Wertschriftenverzeichnis (securities statement)",
      "Previous year's tax assessment (Veranlagungsverfügung)",
    ],
  },
  {
    deduction_key: "_withholding",
    label_de: "Quellensteuerbelege",
    label_en: "Source Tax Evidence",
    total_amount: 0,
    documents: [
      "Monthly payslips (Lohnabrechnungen) with source tax line",
      "Annual source tax summary from employer or cantonal tax office",
      "Any proof of cantonal/federal prepayments",
    ],
  },
  {
    deduction_key: "_spouse",
    label_de: "Ehepartner-Einkommensnachweise",
    label_en: "Spouse Income Evidence",
    total_amount: 0,
    documents: [
      "Spouse annual income statement (foreign or domestic)",
      "Exchange rate reference if income is in foreign currency",
    ],
  },
]

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)
  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid 'year' query parameter." }, { status: 400 })
  }
  try {
    const transactions = await getTaxTransactions(year)
    const summary = computeTaxSummary(transactions, year)
    const deductionItems = summary.document_checklist.filter((c) => c.deduction_key !== "_general")
    return NextResponse.json([...STATIC_ITEMS, ...deductionItems])
  } catch (error) {
    console.error("[tax] Failed to build checklist:", error)
    return NextResponse.json({ error: "Failed to compute tax checklist" }, { status: 500 })
  }
}
