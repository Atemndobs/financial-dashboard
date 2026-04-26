/**
 * Parser for German "Elektronische Lohnsteuerbescheinigung" (annual wage tax certificate).
 *
 * NOT a Swiss Lohnausweis. When the taxpayer has partial-year Swiss liability, this
 * document covers the pre-move German employment period — it must NOT be imported as
 * Swiss taxable income. The caller decides whether to treat it as pre-liability
 * informational data, foreign-income progression input, or (if both countries applied in
 * the same year) evidence for a double-taxation treaty credit.
 */

export interface LohnsteuerbescheinigungParsed {
  document_type: "de_lohnsteuerbescheinigung"
  tax_year: number | null
  period_start: string | null
  period_end: string | null
  employer: { name: string | null; address: string | null; tax_number: string | null }
  employee: { name: string | null; tax_id: string | null; personnel_number: string | null }
  gross_salary_eur: number | null
  wage_tax_eur: number | null
  solidarity_surcharge_eur: number | null
  church_tax_eur: number | null
  pension_employee_contribution_eur: number | null
  health_insurance_employee_eur: number | null
  long_term_care_employee_eur: number | null
  unemployment_employee_eur: number | null
  tax_class: string | null
  transfer_ticket: string | null
  raw_text: string
}

function parseGermanNumber(value: string): number | null {
  const cleaned = value.replace(/\./g, "").replace(",", ".").trim()
  const n = Number.parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

function extractAmount(text: string, itemNumber: number): number | null {
  // The PDF layout puts the item label and the value on separate lines. Anchor on
  // `^{n}.` at the start of a line, then capture the first amount appearing within
  // ~400 chars (labels can span multiple lines before the number).
  const anchor = new RegExp(`(^|\\n)${itemNumber}\\.[^\\n]*`, "g")
  const match = anchor.exec(text)
  if (!match) return null
  const startIndex = match.index + match[0].length
  const window = text.slice(startIndex, startIndex + 400)
  const amountMatch = window.match(/(\d+(?:\.\d{3})*,\d{2})/)
  if (!amountMatch) return null
  return parseGermanNumber(amountMatch[1])
}

function extractPeriod(text: string): { start: string | null; end: string | null } {
  const m = text.match(
    /Bescheinigungszeitraum[^0-9]*(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/,
  )
  if (!m) return { start: null, end: null }
  return { start: toIsoDate(m[1]), end: toIsoDate(m[2]) }
}

function toIsoDate(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function extractAfter(text: string, label: string): string | null {
  const m = text.match(new RegExp(`${label}\\s*:?\\s*([^\\n]+)`))
  return m ? m[1].trim() : null
}

function extractYear(text: string): number | null {
  const m = text.match(/Lohnsteuerbescheinigung\s+f(?:ü|u)r\s+(\d{4})/i)
  if (m) return Number.parseInt(m[1], 10)
  const m2 = text.match(/elektronischen[^\n]*?(\d{4})/i)
  return m2 ? Number.parseInt(m2[1], 10) : null
}

export function parseLohnsteuerbescheinigung(text: string): LohnsteuerbescheinigungParsed {
  const period = extractPeriod(text)
  const year = extractYear(text)

  const taxClassMatch = text.match(/Steuerklasse\/Faktor\s*\n?\s*([0-9IVX]+)/i)
  const transferTicketMatch = text.match(/Transferticket\s*:?\s*([A-Za-z0-9]+)/)
  const tarIdMatch = text.match(/Identifikationsnummer\s*:?\s*([0-9]+)/)
  const personnelMatch = text.match(/Personalnummer\s*:?\s*([^\n]+)/)
  const agSteuerMatch = text.match(/AG-Steuernummer\s*:?\s*([0-9]+)/)

  const employerLines = text.match(/Anschrift des Arbeitgebers:\s*\n([\s\S]{0,200}?)(?=\n\d{2}\.\d{2}\.\d{4}|\nvom|$)/)
  const employerBlock = employerLines ? employerLines[1].trim() : ""
  const employerName = employerBlock.split(/\n/)[0]?.trim() || null
  const employerAddress = employerBlock.split(/\n/).slice(1).join(", ") || null

  return {
    document_type: "de_lohnsteuerbescheinigung",
    tax_year: year,
    period_start: period.start,
    period_end: period.end,
    employer: {
      name: employerName,
      address: employerAddress,
      tax_number: agSteuerMatch?.[1] ?? null,
    },
    employee: {
      name: null,
      tax_id: tarIdMatch?.[1] ?? null,
      personnel_number: personnelMatch?.[1]?.trim() ?? null,
    },
    gross_salary_eur: extractAmount(text, 3),
    wage_tax_eur: extractAmount(text, 4),
    solidarity_surcharge_eur: extractAmount(text, 5),
    church_tax_eur: extractAmount(text, 6),
    pension_employee_contribution_eur: extractAmount(text, 23),
    health_insurance_employee_eur: extractAmount(text, 25),
    long_term_care_employee_eur: extractAmount(text, 26),
    unemployment_employee_eur: extractAmount(text, 27),
    tax_class: taxClassMatch?.[1] ?? null,
    transfer_ticket: transferTicketMatch?.[1] ?? null,
    raw_text: text,
  }
}
