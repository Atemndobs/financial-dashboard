import { type NextRequest, NextResponse } from "next/server"
import { assembleEstimate } from "@/lib/tax/assemble-estimate"

function csvEscape(value: string | number) {
  const text = String(value)
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`
  }
  return text
}

function row(fields: Array<string | number>) {
  return fields.map(csvEscape).join(",")
}

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)

  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid 'year' query parameter." }, { status: 400 })
  }

  try {
    const est = await assembleEstimate(year)

    const rows: string[] = []
    rows.push("# Swiss Tax Estimate — NOT AN OFFICIAL FILING DOCUMENT")
    rows.push(`# Engine ${est.engine_version}  Rules ${est.rule_version}  Year ${year}`)
    rows.push("")

    rows.push("section,field,value")
    rows.push(row(["profile", "canton", est.profile.canton ?? ""]))
    rows.push(row(["profile", "municipality", est.profile.municipality ?? ""]))
    rows.push(row(["profile", "residence_permit", est.profile.residence_permit ?? ""]))
    rows.push(row(["profile", "marital_status", est.profile.marital_status ?? ""]))
    rows.push(row(["profile", "children_count", est.profile.children_count]))
    rows.push(row(["profile", "church_tax", est.profile.church_tax ? "yes" : "no"]))
    rows.push("")

    rows.push("section,field,value")
    rows.push(row(["income", "gross_salary", est.income_breakdown.gross_salary.toFixed(2)]))
    rows.push(row(["income", "bonus", est.income_breakdown.bonus_income.toFixed(2)]))
    rows.push(row(["income", "other", est.income_breakdown.other_taxable_income.toFixed(2)]))
    rows.push(row(["income", "gross_taxable_income", est.income_breakdown.gross_taxable_income.toFixed(2)]))
    rows.push(row(["income", "provenance", est.income_breakdown.provenance]))
    rows.push("")

    rows.push("section,key,label,total_detected,deductible_amount,limit_info,transactions")
    for (const d of est.deduction_breakdown.items) {
      rows.push(
        row([
          "deduction",
          d.key,
          d.label_en,
          d.total_detected.toFixed(2),
          d.deductible_amount.toFixed(2),
          d.limit_info,
          d.transaction_count,
        ]),
      )
    }
    rows.push(row(["deduction", "_total_allowed", "Total Allowed", "", est.deduction_breakdown.total_allowed.toFixed(2), "", ""]))
    rows.push("")

    rows.push("section,field,value")
    rows.push(row(["prepayments", "source_tax_withheld", est.prepayments.source_tax_withheld.toFixed(2)]))
    rows.push(row(["prepayments", "cantonal", est.prepayments.cantonal_prepayments.toFixed(2)]))
    rows.push(row(["prepayments", "federal", est.prepayments.federal_prepayments.toFixed(2)]))
    rows.push(row(["prepayments", "foreign_credits", est.prepayments.foreign_tax_credits.toFixed(2)]))
    rows.push(row(["prepayments", "installments", est.prepayments.installment_payments.toFixed(2)]))
    rows.push(row(["prepayments", "total", est.prepayments.total.toFixed(2)]))
    rows.push("")

    rows.push("section,field,value")
    rows.push(row(["estimate", "taxable_income", est.estimated_taxable_income.toFixed(2)]))
    rows.push(row(["estimate", "federal_tax", est.estimated_final_tax.federal.toFixed(2)]))
    rows.push(row(["estimate", "cantonal_tax", est.estimated_final_tax.cantonal.toFixed(2)]))
    rows.push(row(["estimate", "municipal_tax", est.estimated_final_tax.municipal.toFixed(2)]))
    rows.push(row(["estimate", "church_tax", est.estimated_final_tax.church.toFixed(2)]))
    rows.push(row(["estimate", "total_final_tax", est.estimated_final_tax.total.toFixed(2)]))
    rows.push(row(["estimate", "balance", est.estimated_balance.estimated_balance.toFixed(2)]))
    rows.push(row(["estimate", "direction", est.estimated_balance.direction]))
    rows.push("")

    rows.push("section,code,severity,message")
    for (const w of est.warnings) rows.push(row(["warning", w.code, w.severity, w.message]))
    for (const a of est.assumptions) rows.push(row(["assumption", a.code, "info", a.message]))

    const csv = `${rows.join("\n")}\n`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tax_estimate_${year}.csv"`,
      },
    })
  } catch (error) {
    console.error("[tax] Failed to export csv:", error)
    return NextResponse.json({ error: "Failed to export tax CSV" }, { status: 500 })
  }
}
