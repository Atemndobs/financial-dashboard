"use node"

// PostFinance PDF block-based transaction parser.
//
// `pdf-parse` emits text tokens one per line (layout columns become separate
// lines), so the Python line-regex approach in `app/ingest/pdf_loader.py` does
// not apply here. Instead we walk the token stream, group tokens into
// transaction blocks delimited by a known "kind" header at the top and a
// (date, amount) footer at the bottom, and extract the fields.

import { createHash } from "node:crypto"
import { categorize } from "./rules"

export type ParsedRow = {
  date: string // YYYY-MM-DD (booking date)
  account: string
  counterparty: string
  description: string
  amount: number // signed (negative for expense, positive for income)
  currency: string
  type: "income" | "expense"
  source: string
}

export type CanonicalTransaction = ParsedRow & {
  transaction_id: string
  category: string
  sub_category: string | null
  year: number
  month: number
  month_label: string
  is_expense: boolean
  abs_amount: number
  exclude_from_spending: boolean
  user_excluded: boolean
}

// A line counts as a "kind" header if it starts with one of these.
// Order matters: longer first so "APPLE PAY" is preferred over none.
const KIND_REGEX =
  /^(LASTSCHRIFT|GUTSCHRIFT|AUSLANDZAHLUNG(?: \(SEPA\))?|DAUERAUFTRAG|APPLE PAY|TWINT|PAYMENT CARDS CTR|PREIS FÜR|KAUF\/DIENSTLEISTUNG VOM)\b/

// Transaction block footer lines.
const DATE_TOKEN = /\d{2}\.\d{2}\.\d{2}/g
const DATE_ONLY_LINE = /^(\d{2}\.\d{2}\.\d{2})(?:\s+\d{2}\.\d{2}\.\d{2})?$/
// A line with 1 or 2 numbers (saldo + amount, or just amount) possibly with
// thousand-separator spaces or apostrophes. We accept up to 3 numeric tokens
// for edge cases; the amount is always the LAST numeric token.
const NUMERIC_LINE = /^-?[\d'\s.,]+$/

// Lines that should not be treated as descriptive content.
const PAGE_NOISE = [
  /^Seite\s+\d+\s*\/\s*\d+/i,
  /^Datum\s+Saldo\s+Valuta/i,
  /^Datum\s*$/i,
  /^IBAN\s*$/i,
  /^Kontonummer\s*$/i,
  /^BIC\s*$/i,
  /^POFICHBEXXX\s*$/i,
  /^Privatkonto\s*$/i,
  /^Kontoauszug/i,
  /^CH\d{2}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{1,2}\s*$/i,
  /^PostFinance/i,
  /^P\.P\./i,
  /^www\./i,
  /^Telefon/i,
  /^Sie werden betreut von/i,
  /^Atemkeng Bertrand Ndobegang$/i,
  /^Aarau$/i,
  /^Kontostand$/i,
  /^Zinssatz/i,
  /^CHF\s*$/i,
  /^16-\d+-\d+\s*$/i,
]

function isPageNoise(line: string): boolean {
  return PAGE_NOISE.some((re) => re.test(line))
}

function parseAmount(raw: string): number | null {
  if (!raw) return null
  let s = raw.trim()
  s = s.replace(/\u00a0/g, " ")
  s = s.replace(/\s+/g, "")
  s = s.replace(/'/g, "")
  const commas = (s.match(/,/g) ?? []).length
  const dots = (s.match(/\./g) ?? []).length
  if (commas === 1 && dots >= 1) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else {
    s = s.replace(/,/g, ".")
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function splitNumbers(line: string): number[] {
  // Numbers may contain spaces as thousands separators, so we need to
  // recombine: "2 783.29 5.63" → [2783.29, 5.63]
  // Strategy: tokenise on whitespace, then merge consecutive tokens until the
  // last one contains the decimal.
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  const out: number[] = []
  let buf: string[] = []
  for (const t of tokens) {
    buf.push(t)
    if (/[.,]/.test(t)) {
      const joined = buf.join("")
      const num = parseAmount(joined)
      if (num != null) out.push(num)
      buf = []
    }
  }
  if (buf.length > 0) {
    const num = parseAmount(buf.join(""))
    if (num != null) out.push(num)
  }
  return out
}

function ddmmyyToIso(ddmmyy: string): string {
  const [dd, mm, yy] = ddmmyy.split(".")
  const year = Number(yy) + 2000
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
}

// Pull first DD.MM.YY from a line (or full-year DD.MM.YYYY — reduce to YY).
function extractFirstDate(line: string): string | null {
  const m = line.match(DATE_TOKEN)
  if (!m || m.length === 0) return null
  return m[0]
}

function extractCounterparty(descLines: string[]): string {
  const skip = [
    /^REFERENZ/i,
    /^REFERENCES/i,
    /^SENDER REFERENZ/i,
    /^MITTEILUNGEN/i,
    /^AUFTRAGGEBER/i,
    /^EUR /,
    /^USD /,
    /^CHF /,
    /^ZUM KURS/,
    /^IBAN/,
    /^KARTEN NR/,
    /^SEITE /i,
    /^KONTOAUSZUG/i,
    /^BETRAG IN KONTOWÄHRUNG/i,
    /^\d+(\.\d+)?%/,
    /^\d{2}\.\d{2}\.\d{4}/, // full-year date within block
    /^CH\d{2}/, // IBAN-like
    /^[A-Z]{2}\d{20,}/, // long IBAN
    /^\d{15,}$/, // long ref numbers
    /^[\d'\s.,]+$/, // pure numeric (exchange rate, saldo carry)
    /^KAUF\/DIENSTLEISTUNG VOM$/i,
    /^APPLE PAY$/i,
  ]
  for (const l of descLines) {
    if (!l) continue
    if (skip.some((re) => re.test(l))) continue
    return l.trim()
  }
  return ""
}

// Patterns that indicate a block is a statement summary / artifact, not a
// real transaction. Blocks matching any of these are dropped.
const BLOCK_NOISE_PATTERNS = [
  /REDUZIERTER ÜBERWEISUNGS/i,
  /GESAMTER ÜBERWEISUNGS-BETRAG/i,
  /ANZAHL TRANSAKTIONEN/i,
  /TOTAL ÜBERWEISUNGEN/i,
]

function isBlockNoise(descLines: string[]): boolean {
  const joined = descLines.join(" ")
  return BLOCK_NOISE_PATTERNS.some((re) => re.test(joined))
}

export function parsePostFinanceText(
  text: string,
  sourceName: string,
): ParsedRow[] {
  const rows: ParsedRow[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim())

  type Block = {
    kind: string
    descLines: string[]
    bookingDate: string | null
    amount: number | null
  }
  let current: Block | null = null

  const flush = () => {
    if (!current) return
    if (!current.bookingDate || current.amount == null) {
      current = null
      return
    }
    if (isBlockNoise(current.descLines)) {
      current = null
      return
    }
    if (Math.abs(current.amount) < 0.01) {
      current = null
      return
    }
    const kindUpper = current.kind.toUpperCase()
    const isCredit = /GUTSCHRIFT/.test(kindUpper)
    const signed = isCredit
      ? Math.abs(current.amount)
      : -Math.abs(current.amount)
    const counterparty = extractCounterparty(current.descLines)
    const description = current.descLines
      .filter((l) => l && !isPageNoise(l))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
    rows.push({
      date: ddmmyyToIso(current.bookingDate),
      account: "PostFinance",
      counterparty,
      description,
      amount: signed,
      currency: "CHF",
      type: isCredit ? "income" : "expense",
      source: sourceName,
    })
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    if (!ln) continue

    // Opening / closing balance ("Kontostand") lines — close block.
    if (/^\d{2}\.\d{2}\.\d{2}\s+.*Kontostand/i.test(ln)) {
      flush()
      continue
    }
    if (/^Kontostand/i.test(ln)) {
      flush()
      continue
    }

    const kindMatch = KIND_REGEX.exec(ln)
    if (kindMatch) {
      // If KAUF/DIENSTLEISTUNG comes right after APPLE PAY, keep current block.
      if (
        current &&
        /^KAUF\/DIENSTLEISTUNG VOM/.test(ln) &&
        /^APPLE PAY/.test(current.kind)
      ) {
        current.descLines.push(ln)
        continue
      }
      flush()
      current = {
        kind: kindMatch[1],
        descLines: [],
        bookingDate: null,
        amount: null,
      }
      continue
    }

    if (!current) continue

    // Footer line: date-only (1 or 2 dates)
    if (DATE_ONLY_LINE.test(ln)) {
      const booking = extractFirstDate(ln)
      if (booking) current.bookingDate = booking
      // Next line should be numeric footer
      const next = lines[i + 1] ?? ""
      if (NUMERIC_LINE.test(next) && /[.,]/.test(next)) {
        const nums = splitNumbers(next)
        if (nums.length > 0) {
          current.amount = nums[nums.length - 1] // last numeric = amount
          i += 1 // consume next line
          flush()
          continue
        }
      }
      // If we set the date but no numeric follows immediately, keep going;
      // occasionally the amount is on the SAME line (e.g. "02.03.26 681.93 21.92")
      const nums = splitNumbers(ln)
      if (nums.length >= 2) {
        current.amount = nums[nums.length - 1]
        flush()
        continue
      }
      continue
    }

    // Some transactions footer has date + amount on same line:
    // "02.03.26 681.93 21.92" — single date, saldo + amount
    if (/^\d{2}\.\d{2}\.\d{2}\b/.test(ln) && /[.,]/.test(ln)) {
      const booking = extractFirstDate(ln)
      if (booking) current.bookingDate = booking
      const nums = splitNumbers(ln.replace(DATE_TOKEN, ""))
      if (nums.length >= 1) {
        current.amount = nums[nums.length - 1]
        flush()
        continue
      }
    }

    // Otherwise descriptive content.
    if (!isPageNoise(ln)) {
      current.descLines.push(ln)
    }
  }
  flush()
  return rows
}

function hashTransactionId(row: ParsedRow): string {
  // Match Python: md5("<str(Timestamp)>|<account>|<str(amount)>|<desc[:50]>")
  // pandas str(Timestamp('YYYY-MM-DD')) => 'YYYY-MM-DD 00:00:00'
  const dateStr = `${row.date} 00:00:00`
  const key = [
    dateStr,
    row.account,
    String(row.amount),
    (row.description ?? "").slice(0, 50),
  ].join("|")
  return createHash("md5").update(key).digest("hex")
}

export function normalizeAndCategorize(
  rows: ParsedRow[],
): CanonicalTransaction[] {
  const out: CanonicalTransaction[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const { category, excludeFromSpending } = categorize({
      counterparty: row.counterparty,
      description: row.description,
      type: row.type,
      amount: row.amount,
    })
    const [yearStr, monthStr] = row.date.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)
    const txId = hashTransactionId(row)
    if (seen.has(txId)) continue
    seen.add(txId)
    out.push({
      ...row,
      transaction_id: txId,
      category,
      sub_category: null,
      year,
      month,
      month_label: `${yearStr}-${monthStr}`,
      is_expense: row.amount < 0,
      abs_amount: Math.abs(row.amount),
      exclude_from_spending: excludeFromSpending,
      user_excluded: false,
    })
  }
  return out.sort((a, b) =>
    a.date === b.date
      ? a.transaction_id.localeCompare(b.transaction_id)
      : a.date.localeCompare(b.date),
  )
}
