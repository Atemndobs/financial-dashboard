"use node"

import { actionGeneric } from "convex/server"
import { v } from "convex/values"
// pdf-parse@1.x index.js has a debug block that tries to open a test PDF at
// import time. Import the inner module directly to avoid that.
import pdfParse from "pdf-parse/lib/pdf-parse.js"

import { api } from "./_generated/api"
import {
  normalizeAndCategorize,
  parsePostFinanceText,
} from "./lib/postfinanceParser"

const action = actionGeneric

const BATCH_SIZE = 200

export const importPostFinancePdf = action({
  args: {
    userId: v.string(),
    filename: v.string(),
    fileBytes: v.bytes(),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return {
        success: false,
        message: "Missing user_id.",
        source_file: args.filename,
        transactions_extracted: 0,
        transactions_imported: 0,
        duplicates_skipped: 0,
        date_min: null,
        date_max: null,
        months_added: [],
        accounts: [],
        warnings: [],
        errors: ["user_id is required."],
      }
    }

    const buffer = Buffer.from(args.fileBytes)
    const warnings: string[] = []
    const errors: string[] = []

    if (!args.filename.toLowerCase().endsWith(".pdf")) {
      return {
        success: false,
        message: "Only .pdf files are accepted.",
        source_file: args.filename,
        transactions_extracted: 0,
        transactions_imported: 0,
        duplicates_skipped: 0,
        date_min: null,
        date_max: null,
        months_added: [],
        accounts: [],
        warnings,
        errors: ["Invalid file type."],
      }
    }

    if (!args.filename.toUpperCase().startsWith("REP")) {
      warnings.push(
        `Filename does not start with 'REP_'; parser is tuned for PostFinance REP_* statements: ${args.filename}`,
      )
    }

    let pdfText = ""
    try {
      const parsed = await pdfParse(buffer)
      pdfText = parsed.text
      console.log(
        `[imports] parsed pdf: bytes=${buffer.length} text_len=${pdfText.length} pages=${parsed.numpages}`,
      )
      console.log(
        `[imports] text sample (first 300): ${pdfText.slice(0, 300).replace(/\n/g, "\\n")}`,
      )
    } catch (err) {
      console.error("[imports] pdf-parse threw:", err)
      return {
        success: false,
        message: "Failed to extract text from PDF.",
        source_file: args.filename,
        transactions_extracted: 0,
        transactions_imported: 0,
        duplicates_skipped: 0,
        date_min: null,
        date_max: null,
        months_added: [],
        accounts: [],
        warnings,
        errors: [`pdf-parse error: ${String(err)}`],
      }
    }

    const rawRows = parsePostFinanceText(pdfText, args.filename)
    if (rawRows.length === 0) {
      return {
        success: false,
        message: "No transactions extracted from PDF.",
        source_file: args.filename,
        transactions_extracted: 0,
        transactions_imported: 0,
        duplicates_skipped: 0,
        date_min: null,
        date_max: null,
        months_added: [],
        accounts: [],
        warnings: [...warnings, "Parser returned zero rows."],
        errors,
      }
    }

    const canonical = normalizeAndCategorize(rawRows)
    const dates = canonical.map((r) => r.date).sort()
    const dateMin = dates[0] ?? null
    const dateMax = dates[dates.length - 1] ?? null
    const monthsAdded = Array.from(
      new Set(canonical.map((r) => r.month_label)),
    ).sort()
    const accounts = Array.from(
      new Set(canonical.map((r) => r.account)),
    ).sort()

    // Upsert in batches through the existing migration mutation.
    let inserted = 0
    let updated = 0
    for (let i = 0; i < canonical.length; i += BATCH_SIZE) {
      const batch = canonical.slice(i, i + BATCH_SIZE)
      const result = (await ctx.runMutation(
        api.migration.upsertTransactionsBatch,
        {
          userId: args.userId,
          items: batch.map((row) => ({
            transaction_id: row.transaction_id,
            date: row.date,
            account: row.account,
            counterparty: row.counterparty || undefined,
            description: row.description || undefined,
            amount: row.amount,
            currency: row.currency,
            type: row.type,
            category: row.category,
            sub_category: row.sub_category ?? undefined,
            source: row.source,
            year: row.year,
            month: row.month,
            month_label: row.month_label,
            is_expense: row.is_expense,
            abs_amount: row.abs_amount,
            exclude_from_spending: row.exclude_from_spending,
            user_excluded: row.user_excluded,
          })),
        },
      )) as { inserted: number; updated: number }
      inserted += result.inserted ?? 0
      updated += result.updated ?? 0
    }

    return {
      success: true,
      message: `Imported ${inserted + updated} transactions from ${args.filename} (${dateMin} → ${dateMax}). Inserted ${inserted}, updated ${updated}.`,
      source_file: args.filename,
      transactions_extracted: rawRows.length,
      transactions_imported: inserted + updated,
      duplicates_skipped: updated,
      date_min: dateMin,
      date_max: dateMax,
      months_added: monthsAdded,
      accounts,
      warnings,
      errors,
    }
  },
})
