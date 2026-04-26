import { type NextRequest, NextResponse } from "next/server"
import {
  addForeignIncome,
  loadProfile,
  saveIncomeStatement,
  savePrepayments,
  saveProfile,
} from "@/lib/data/tax-records"
import {
  parseLohnsteuerbescheinigung,
  type LohnsteuerbescheinigungParsed,
} from "@/lib/tax/parsers/lohnsteuerbescheinigung"
import {
  detectSwissLohnausweis,
  parseLohnausweisCh,
  type LohnausweisChParsed,
} from "@/lib/tax/parsers/lohnausweis-ch"
import type { ForeignIncomeTreatment, TaxProfileInput } from "@/lib/tax/estimate-types"

type AnyParsed = LohnsteuerbescheinigungParsed | LohnausweisChParsed

const DEFAULT_PROFILE: Omit<TaxProfileInput, "tax_year"> = {
  canton: "AG",
  municipality: "Aarau",
  residence_permit: "B",
  source_tax_code: null,
  marital_status: "married",
  is_separated: false,
  children_count: 0,
  church_tax: false,
  tax_liability_start: null,
  tax_liability_end: null,
  country_of_residence: "CH",
}

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  // Import the inner module directly to avoid pdf-parse@1.1.1's debug-mode top-level
  // code, which tries to read a test fixture at ./test/data/05-versions-space.pdf.
  const mod: any = await import("pdf-parse/lib/pdf-parse.js")
  const pdfParse = mod.default || mod
  const result = await pdfParse(buffer)
  return result.text as string
}

export async function POST(request: NextRequest) {
  const url = request.nextUrl
  const action = url.searchParams.get("action") ?? "parse"
  const yearParam = url.searchParams.get("year")
  const year = Number.parseInt(yearParam || "", 10)

  if (!yearParam || Number.isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid 'year'." }, { status: 400 })
  }

  try {
    if (action === "parse") {
      const contentType = request.headers.get("content-type") || ""
      if (!contentType.includes("multipart/form-data")) {
        return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 })
      }
      const form = await request.formData()
      const file = form.get("file")
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file missing" }, { status: 400 })
      }
      const text = await extractText(file)
      if (detectSwissLohnausweis(text)) {
        const parsed = parseLohnausweisCh(text)
        return NextResponse.json({ parsed, advisory: buildSwissAdvisory(parsed, year) })
      }
      const parsed = parseLohnsteuerbescheinigung(text)
      return NextResponse.json({ parsed, advisory: buildAdvisory(parsed, year) })
    }

    if (action === "apply") {
      const body = (await request.json()) as {
        parsed: AnyParsed
        fx_rate?: number
        populate_profile_defaults?: boolean
      }
      const { parsed } = body
      const populateProfile = body.populate_profile_defaults ?? true
      if (!parsed) {
        return NextResponse.json({ error: "Invalid parsed payload" }, { status: 400 })
      }

      if (parsed.document_type === "ch_lohnausweis") {
        return await applySwiss(year, parsed, populateProfile)
      }
      if (parsed.document_type === "de_lohnsteuerbescheinigung") {
        const fx = body.fx_rate
        if (!Number.isFinite(fx) || (fx as number) <= 0) {
          return NextResponse.json({ error: "Invalid fx_rate" }, { status: 400 })
        }
        return await applyGerman(year, parsed, fx as number, populateProfile)
      }
      return NextResponse.json({ error: "Unknown document_type" }, { status: 400 })
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
  } catch (error) {
    console.error("[tax/import/lohnsteuerbescheinigung] failed", error)
    const message = error instanceof Error ? error.message : "Parse failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildAdvisory(parsed: LohnsteuerbescheinigungParsed, swissYear: number) {
  const notes: string[] = []
  notes.push(
    "This is a German Lohnsteuerbescheinigung — it is NOT a Swiss Lohnausweis. Do not import as Swiss gross salary.",
  )
  if (parsed.tax_year && parsed.tax_year !== swissYear) {
    notes.push(
      `Document year (${parsed.tax_year}) differs from selected Swiss tax year (${swissYear}). Verify this is the right file.`,
    )
  }
  notes.push(
    "If this period precedes your Swiss tax-liability start date, treat as 'Pre-liability informational'. If liability periods overlap, consult a tax advisor about foreign tax credit or progression treatment.",
  )
  return notes
}

function buildSwissAdvisory(parsed: LohnausweisChParsed, swissYear: number) {
  const notes: string[] = []
  if (parsed.tax_year && parsed.tax_year !== swissYear) {
    notes.push(
      `Document year (${parsed.tax_year}) differs from selected tax year (${swissYear}). Verify this is the right file.`,
    )
  }
  if (parsed.is_source_tax_liable) {
    notes.push(
      "Source-tax liable (Quellensteuerpflichtig): Ziffer 12 will be applied as withholding against the computed final tax.",
    )
  }
  if (parsed.validation.matches_net === false) {
    notes.push(
      `Validation: Bruttolohn − AHV − BVG = ${parsed.validation.expected_net_chf} CHF, but Nettolohn reads ${parsed.net_salary_chf} CHF. Re-check parsed values before applying.`,
    )
  }
  if (parsed.bvg_ordinary_chf || parsed.bvg_buyback_chf) {
    notes.push(
      "2nd-pillar (BVG) contributions are tax-deductible — they will feed the deductions pipeline.",
    )
  }
  return notes
}

async function applySwiss(year: number, parsed: LohnausweisChParsed, populateProfile: boolean) {
  if (parsed.gross_salary_chf === null) {
    return NextResponse.json({ error: "Gross salary (Ziffer 8) not detected" }, { status: 400 })
  }
  const gross = Math.round(parsed.gross_salary_chf * 100) / 100
  const withheld =
    parsed.source_tax_withheld_chf !== null
      ? Math.round(parsed.source_tax_withheld_chf * 100) / 100
      : 0

  await saveIncomeStatement(year, {
    source_type: "salary_certificate",
    gross_salary: gross,
    bonus_income: parsed.irregular_payments_chf ?? 0,
    other_taxable_income: 0,
    salary_certificate_reference:
      parsed.employer.name ?? parsed.employee.ahv_number ?? "Lohnausweis",
  })

  await savePrepayments(year, {
    source_tax_withheld: withheld,
    cantonal_prepayments: 0,
    federal_prepayments: 0,
    foreign_tax_credits: 0,
    installment_payments: 0,
    evidence_reference: parsed.employer.name ?? null,
  })

  if (populateProfile) {
    const existing = await loadProfile(year)
    if (!existing || !existing.canton) {
      await saveProfile(year, {
        ...DEFAULT_PROFILE,
        tax_liability_start: parsed.period_start,
        tax_liability_end: parsed.period_end,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    applied: {
      gross_chf: gross,
      source_tax_withheld_chf: withheld,
      bvg_ordinary_chf: parsed.bvg_ordinary_chf,
      bvg_buyback_chf: parsed.bvg_buyback_chf,
      social_contributions_chf: parsed.social_contributions_chf,
    },
  })
}

async function applyGerman(
  year: number,
  parsed: LohnsteuerbescheinigungParsed,
  fx_rate: number,
  populateProfile: boolean,
) {
  if (parsed.gross_salary_eur === null) {
    return NextResponse.json({ error: "Gross salary not detected" }, { status: 400 })
  }

  const grossChf = parsed.gross_salary_eur * fx_rate
  const withheldTaxEur =
    (parsed.wage_tax_eur ?? 0) +
    (parsed.solidarity_surcharge_eur ?? 0) +
    (parsed.church_tax_eur ?? 0)
  const withheldChf = withheldTaxEur * fx_rate

  await saveIncomeStatement(year, {
    source_type: "salary_certificate",
    gross_salary: Math.round(grossChf * 100) / 100,
    bonus_income: 0,
    other_taxable_income: 0,
    salary_certificate_reference:
      parsed.transfer_ticket ?? parsed.employer.name ?? "Lohnsteuerbescheinigung",
  })

  await savePrepayments(year, {
    source_tax_withheld: Math.round(withheldChf * 100) / 100,
    cantonal_prepayments: 0,
    federal_prepayments: 0,
    foreign_tax_credits: 0,
    installment_payments: 0,
    evidence_reference: parsed.transfer_ticket ?? null,
  })

  if (populateProfile) {
    const existing = await loadProfile(year)
    if (!existing || !existing.canton) {
      await saveProfile(year, {
        ...DEFAULT_PROFILE,
        tax_liability_start: parsed.period_start,
        tax_liability_end: parsed.period_end,
      })
    }
  }

  await addForeignIncome(year, {
    document_type: "de_lohnsteuerbescheinigung",
    country: "DE",
    period_start: parsed.period_start,
    period_end: parsed.period_end,
    gross_amount: parsed.gross_salary_eur,
    currency: "EUR",
    foreign_tax_paid: withheldTaxEur || null,
    treatment: "foreign_tax_credit_candidate" as ForeignIncomeTreatment,
    notes: `Imported as primary salary statement; fx_rate=${fx_rate}`,
    raw_parsed: parsed as unknown,
  })

  return NextResponse.json({
    ok: true,
    applied: {
      gross_chf: Math.round(grossChf * 100) / 100,
      source_tax_withheld_chf: Math.round(withheldChf * 100) / 100,
      fx_rate,
    },
  })
}
