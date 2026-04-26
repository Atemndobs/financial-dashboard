/**
 * Parser for Swiss "Lohnausweis / Certificat de salaire / Certificato di salario"
 * (Form 11, 605.040.18N). Trilingual (DE/FR/IT), CHF-native, apostrophe thousands.
 *
 * Maps line items into the Swiss tax-estimation pipeline directly — no FX conversion.
 * Line 12 (Quellensteuerabzug) is the source-tax withholding that offsets the final bill.
 */

export interface LohnausweisChParsed {
  document_type: "ch_lohnausweis"
  tax_year: number | null
  period_start: string | null
  period_end: string | null
  employer: { name: string | null; address: string | null; contact: string | null }
  employee: { name: string | null; ahv_number: string | null; date_of_birth: string | null }
  base_salary_chf: number | null            // Ziffer 1
  irregular_payments_chf: number | null     // Ziffer 3
  gross_salary_chf: number | null           // Ziffer 8 — Bruttolohn total
  social_contributions_chf: number | null   // Ziffer 9 — AHV/IV/EO/ALV/NBUV
  bvg_ordinary_chf: number | null           // Ziffer 10.1
  bvg_buyback_chf: number | null            // Ziffer 10.2
  net_salary_chf: number | null             // Ziffer 11 — Nettolohn
  source_tax_withheld_chf: number | null    // Ziffer 12 — Quellensteuerabzug
  is_source_tax_liable: boolean
  validation: { expected_net_chf: number | null; matches_net: boolean | null }
  raw_text: string
}

const SWISS_AMOUNT = /(\d{1,3}(?:['\u2019]\d{3})+|\d+)(?:[.,]\d{1,2})?/

function parseSwissNumber(value: string): number | null {
  const cleaned = value.replace(/['\u2019\s]/g, "").replace(",", ".").trim()
  if (!cleaned) return null
  const n = Number.parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

function toIsoDate(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

export function detectSwissLohnausweis(text: string): boolean {
  const header =
    /Lohnausweis|Certificat\s+de\s+salaire|Certificato\s+di\s+salario/i.test(text)
  const ahv = /AHV[-\s]?Nr|No\s*AVS|N\.\s*AVS/i.test(text)
  const ahvNumber = /\b756[.\s]\d{4}[.\s]\d{4}[.\s]\d{2}\b/.test(text)
  return (header && ahv) || ahvNumber
}

function extractAhvAndDob(text: string): { ahv: string | null; dob: string | null } {
  // pdf-parse concatenates AHV + DOB onto one line: `756.2234.3333.6903.02.1985`.
  const m = text.match(/\b(756\.\d{4}\.\d{4}\.\d{2})(\d{2}\.\d{2}\.\d{4})\b/)
  if (m) return { ahv: m[1], dob: toIsoDate(m[2]) }
  // Fallback: separated variant.
  const sep = text.match(/\b(756\.\d{4}\.\d{4}\.\d{2})\b[^\d]*(\d{2}\.\d{2}\.\d{4})?/)
  if (sep) return { ahv: sep[1], dob: sep[2] ? toIsoDate(sep[2]) : null }
  return { ahv: null, dob: null }
}

function extractYearAndPeriod(
  text: string,
): { year: number | null; start: string | null; end: string | null } {
  // pdf-parse concatenates year + both dates onto one line: `202501.03.202531.12.2025`.
  const packed = text.match(/\b(20\d{2})(\d{2}\.\d{2}\.\d{4})(\d{2}\.\d{2}\.\d{4})\b/)
  if (packed) {
    return {
      year: Number.parseInt(packed[1], 10),
      start: toIsoDate(packed[2]),
      end: toIsoDate(packed[3]),
    }
  }
  const spaced = text.match(/\b(20\d{2})\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})\b/)
  if (spaced) {
    return {
      year: Number.parseInt(spaced[1], 10),
      start: toIsoDate(spaced[2]),
      end: toIsoDate(spaced[3]),
    }
  }
  return { year: null, start: null, end: null }
}

/**
 * pdf-parse on the Swiss Lohnausweis emits all trilingual labels first, then the
 * values column top-to-bottom — so label-anchored regex returns Line 1's value for
 * every line. Instead we extract the ordered values block and map positionally,
 * then validate via gross = net + social + bvg.
 */
function extractValuesBlock(text: string): { values: number[]; markers: string[] } {
  // Drop the header block up to and including the barcode UUID (present on every form).
  const barcodeRe = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/i
  const barcodeMatch = barcodeRe.exec(text)
  const startIdx = barcodeMatch ? barcodeMatch.index + barcodeMatch[0].length : 0
  // Stop at the employer signature block to avoid phone numbers / postcodes leaking in.
  const footerRe = /Die\s+Richtigkeit|Certifi(?:é|e)\s+exact|Certificato\s+esatto/i
  const footerMatch = footerRe.exec(text.slice(startIdx))
  const endIdx = footerMatch ? startIdx + footerMatch.index : text.length
  const block = text.slice(startIdx, endIdx)

  const values: number[] = []
  const markers: string[] = []
  const lines = block.split(/\n+/)
  const amountRe = /^(\d{1,3}(?:['\u2019]\d{3})+|\d{3,7})(?:[.,]\d{1,2})?$/
  const amountSuffixRe = /\s(\d{1,3}(?:['\u2019]\d{3})+|\d{1,7})(?:[.,]\d{1,2})?$/
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    // Skip the date row that sometimes survives the barcode strip.
    if (/^\d{2}\.\d{2}\.\d{4}/.test(line)) continue
    if (/^20\d{2}\s+\d{2}\.\d{2}\.\d{4}/.test(line)) continue
    // Marker lines let us anchor Line 3 (Unregelmässige Leistungen) and the "X"
    // checkbox rows which otherwise would collapse our positional sequence.
    if (/^[Xx]$/.test(line)) {
      markers.push("X")
      continue
    }
    const pure = line.match(amountRe)
    if (pure) {
      const n = parseSwissNumber(pure[1])
      if (n !== null) values.push(n)
      continue
    }
    const suffixed = line.match(amountSuffixRe)
    if (suffixed && /[A-Za-zÄÖÜäöü]/.test(line)) {
      const n = parseSwissNumber(suffixed[1])
      if (n !== null) {
        markers.push(line.replace(suffixed[0], "").trim())
        values.push(n)
      }
      continue
    }
    // Label-glued amount: `Überzeit, Feriengeld24` (pdf-parse drops the gap).
    const glued = line.match(
      /^([A-Za-zÄÖÜäöü][^\n]*?)(\d{1,3}(?:['\u2019]\d{3})+|\d{1,7})(?:[.,]\d{1,2})?$/,
    )
    if (glued && /[A-Za-zÄÖÜäöü]/.test(glued[1].trim())) {
      const n = parseSwissNumber(glued[2])
      if (n !== null) {
        markers.push(glued[1].trim())
        values.push(n)
      }
    }
  }
  return { values, markers }
}

type MappedValues = {
  base: number | null
  irregular: number | null
  gross: number | null
  social: number | null
  bvgOrdinary: number | null
  bvgBuyback: number | null
  net: number | null
  sourceTax: number | null
}

function mapValues(values: number[]): MappedValues {
  // Try every plausible split and score by the identity: gross = net + social + bvg.
  // Assumes Line 8 (gross total) is the first value that equals base + irregular or,
  // if no Line 3, matches Line 1. Falls back to the largest of the first three values.
  const empty: MappedValues = {
    base: null,
    irregular: null,
    gross: null,
    social: null,
    bvgOrdinary: null,
    bvgBuyback: null,
    net: null,
    sourceTax: null,
  }
  if (values.length === 0) return empty

  const candidates: MappedValues[] = []
  // Candidate A: [Line1, Line8, Line9, Line10.1, Line11, Line12]
  if (values.length >= 4) {
    candidates.push({
      base: values[0] ?? null,
      irregular: null,
      gross: values[1] ?? null,
      social: values[2] ?? null,
      bvgOrdinary: values[3] ?? null,
      bvgBuyback: null,
      net: values[4] ?? null,
      sourceTax: values[5] ?? null,
    })
  }
  // Candidate B: [Line1, Line3, Line8, Line9, Line10.1, Line11, Line12]
  if (values.length >= 5) {
    candidates.push({
      base: values[0] ?? null,
      irregular: values[1] ?? null,
      gross: values[2] ?? null,
      social: values[3] ?? null,
      bvgOrdinary: values[4] ?? null,
      bvgBuyback: null,
      net: values[5] ?? null,
      sourceTax: values[6] ?? null,
    })
  }
  // Candidate C: same as B but with Line 10.2 present
  if (values.length >= 6) {
    candidates.push({
      base: values[0] ?? null,
      irregular: values[1] ?? null,
      gross: values[2] ?? null,
      social: values[3] ?? null,
      bvgOrdinary: values[4] ?? null,
      bvgBuyback: values[5] ?? null,
      net: values[6] ?? null,
      sourceTax: values[7] ?? null,
    })
  }
  // Candidate D: [Line1, Line8, Line9, Line11, Line12] — no BVG, no irregular
  if (values.length >= 3) {
    candidates.push({
      base: values[0] ?? null,
      irregular: null,
      gross: values[1] ?? null,
      social: values[2] ?? null,
      bvgOrdinary: null,
      bvgBuyback: null,
      net: values[3] ?? null,
      sourceTax: values[4] ?? null,
    })
  }

  // Score: prefer candidates where gross ≈ base + irregular AND net ≈ gross - social - bvg.
  let best = candidates[0] ?? empty
  let bestScore = -Infinity
  for (const c of candidates) {
    if (c.gross === null) continue
    let score = 0
    const sumParts = (c.base ?? 0) + (c.irregular ?? 0)
    if (sumParts > 0 && Math.abs(sumParts - c.gross) <= 2) score += 3
    const expectedNet =
      c.gross - (c.social ?? 0) - (c.bvgOrdinary ?? 0) - (c.bvgBuyback ?? 0)
    if (c.net !== null && Math.abs(c.net - expectedNet) <= 2) score += 5
    if (c.sourceTax !== null && c.sourceTax > 0 && c.sourceTax < c.gross) score += 1
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

function extractEmployer(text: string): {
  name: string | null
  address: string | null
  contact: string | null
} {
  // The employer block sits between the "City, DD.MM.YYYY" signature-location line
  // and the "Herr/Frau/Madame/Monsieur/Signor/Signora" salutation of the recipient.
  const m = text.match(
    /^\s*([A-ZÄÖÜ][\wäöüéèàâ .-]+,\s+\d{2}\.\d{2}\.\d{4})\s*\n([\s\S]*?)\n\s*(?:Herr|Frau|Madame|Monsieur|Signor|Signora)\b/m,
  )
  if (!m) return { name: null, address: null, contact: null }
  const lines = m[2]
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length === 0) return { name: null, address: null, contact: null }
  const name = lines[0] ?? null
  const contactLines = lines.filter(
    (l) => l !== name && (/@/.test(l) || /-\s*\+?\d{2,}/.test(l)),
  )
  const addressLines = lines.filter((l) => l !== name && !contactLines.includes(l))
  return {
    name,
    address: addressLines.length ? addressLines.join(", ") : null,
    contact: contactLines.length ? contactLines.join(" · ") : null,
  }
}

function extractEmployeeName(text: string): string | null {
  // Recipient block: salutation (Herr/Frau/Madame/Monsieur/Signor/Signora) then name.
  const m = text.match(
    /\b(?:Herr|Frau|Madame|Monsieur|Madame\/Monsieur|Signor|Signora)\s*\n+\s*([^\n]+)/i,
  )
  return m ? m[1].trim() : null
}

export function parseLohnausweisCh(text: string): LohnausweisChParsed {
  const { ahv, dob } = extractAhvAndDob(text)
  const { year, start, end } = extractYearAndPeriod(text)
  const employer = extractEmployer(text)
  const employeeName = extractEmployeeName(text)

  const { values } = extractValuesBlock(text)
  const mapped = mapValues(values)
  const { base, irregular, gross, social, bvgOrdinary, bvgBuyback, net, sourceTax } = mapped

  const expectedNet =
    gross !== null && social !== null
      ? gross - social - (bvgOrdinary ?? 0) - (bvgBuyback ?? 0)
      : null
  const matchesNet =
    net !== null && expectedNet !== null ? Math.abs(net - expectedNet) <= 2 : null

  const isSourceTaxLiable =
    /Quellensteuerpflichtig|imp(?:o|ô)t\s+(?:à|a)\s+la\s+source|ritenuta\s+d['\u2019]imposta\s+alla\s+fonte/i.test(
      text,
    ) || (sourceTax !== null && sourceTax > 0)

  return {
    document_type: "ch_lohnausweis",
    tax_year: year,
    period_start: start,
    period_end: end,
    employer,
    employee: { name: employeeName, ahv_number: ahv, date_of_birth: dob },
    base_salary_chf: base,
    irregular_payments_chf: irregular,
    gross_salary_chf: gross,
    social_contributions_chf: social,
    bvg_ordinary_chf: bvgOrdinary,
    bvg_buyback_chf: bvgBuyback,
    net_salary_chf: net,
    source_tax_withheld_chf: sourceTax,
    is_source_tax_liable: isSourceTaxLiable,
    validation: { expected_net_chf: expectedNet, matches_net: matchesNet },
    raw_text: text,
  }
}
