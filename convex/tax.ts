import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

const query = queryGeneric
const mutation = mutationGeneric

const profileFields = {
  canton: v.union(v.string(), v.null()),
  municipality: v.union(v.string(), v.null()),
  residence_permit: v.union(v.string(), v.null()),
  source_tax_code: v.union(v.string(), v.null()),
  marital_status: v.union(v.string(), v.null()),
  is_separated: v.boolean(),
  children_count: v.number(),
  church_tax: v.boolean(),
  tax_liability_start: v.union(v.string(), v.null()),
  tax_liability_end: v.union(v.string(), v.null()),
  country_of_residence: v.union(v.string(), v.null()),
}

export const getProfile = query({
  args: { userId: v.string(), taxYear: v.number() },
  handler: async (ctx, { userId, taxYear }) => {
    const row = await ctx.db
      .query("fin_tax_profiles")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    return row ?? null
  },
})

export const upsertProfile = mutation({
  args: { userId: v.string(), taxYear: v.number(), ...profileFields },
  handler: async (ctx, args) => {
    const { userId, taxYear, ...fields } = args
    const now = new Date().toISOString()
    const existing = await ctx.db
      .query("fin_tax_profiles")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updated_at: now })
      return existing._id
    }
    return await ctx.db.insert("fin_tax_profiles", {
      user_id: userId,
      tax_year: taxYear,
      ...fields,
      created_at: now,
      updated_at: now,
    })
  },
})

export const getHousehold = query({
  args: { userId: v.string(), taxYear: v.number() },
  handler: async (ctx, { userId, taxYear }) => {
    const row = await ctx.db
      .query("fin_tax_household_context")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    return row ?? null
  },
})

export const upsertHousehold = mutation({
  args: {
    userId: v.string(),
    taxYear: v.number(),
    spouse_income_country: v.union(v.string(), v.null()),
    spouse_income_currency: v.union(v.string(), v.null()),
    spouse_income_amount: v.union(v.number(), v.null()),
    spouse_income_exchange_rate: v.union(v.number(), v.null()),
    spouse_income_chf: v.union(v.number(), v.null()),
    progression_notes: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { userId, taxYear, ...fields } = args
    const now = new Date().toISOString()
    const existing = await ctx.db
      .query("fin_tax_household_context")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updated_at: now })
      return existing._id
    }
    return await ctx.db.insert("fin_tax_household_context", {
      user_id: userId,
      tax_year: taxYear,
      ...fields,
      created_at: now,
      updated_at: now,
    })
  },
})

export const getIncomeStatement = query({
  args: { userId: v.string(), taxYear: v.number() },
  handler: async (ctx, { userId, taxYear }) => {
    const row = await ctx.db
      .query("fin_tax_income_statements")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    return row ?? null
  },
})

export const upsertIncomeStatement = mutation({
  args: {
    userId: v.string(),
    taxYear: v.number(),
    source_type: v.string(),
    gross_salary: v.union(v.number(), v.null()),
    bonus_income: v.union(v.number(), v.null()),
    other_taxable_income: v.union(v.number(), v.null()),
    salary_certificate_reference: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { userId, taxYear, ...fields } = args
    const now = new Date().toISOString()
    const existing = await ctx.db
      .query("fin_tax_income_statements")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updated_at: now })
      return existing._id
    }
    return await ctx.db.insert("fin_tax_income_statements", {
      user_id: userId,
      tax_year: taxYear,
      ...fields,
      created_at: now,
      updated_at: now,
    })
  },
})

export const getPrepayments = query({
  args: { userId: v.string(), taxYear: v.number() },
  handler: async (ctx, { userId, taxYear }) => {
    const row = await ctx.db
      .query("fin_tax_prepayments")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    return row ?? null
  },
})

export const upsertPrepayments = mutation({
  args: {
    userId: v.string(),
    taxYear: v.number(),
    source_tax_withheld: v.union(v.number(), v.null()),
    cantonal_prepayments: v.union(v.number(), v.null()),
    federal_prepayments: v.union(v.number(), v.null()),
    foreign_tax_credits: v.union(v.number(), v.null()),
    installment_payments: v.union(v.number(), v.null()),
    evidence_reference: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { userId, taxYear, ...fields } = args
    const now = new Date().toISOString()
    const existing = await ctx.db
      .query("fin_tax_prepayments")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updated_at: now })
      return existing._id
    }
    return await ctx.db.insert("fin_tax_prepayments", {
      user_id: userId,
      tax_year: taxYear,
      ...fields,
      created_at: now,
      updated_at: now,
    })
  },
})

export const listForeignIncome = query({
  args: { userId: v.string(), taxYear: v.number() },
  handler: async (ctx, { userId, taxYear }) => {
    return await ctx.db
      .query("fin_tax_foreign_income")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .collect()
  },
})

export const addForeignIncome = mutation({
  args: {
    userId: v.string(),
    taxYear: v.number(),
    document_type: v.string(),
    country: v.string(),
    period_start: v.union(v.string(), v.null()),
    period_end: v.union(v.string(), v.null()),
    gross_amount: v.number(),
    currency: v.string(),
    foreign_tax_paid: v.union(v.number(), v.null()),
    treatment: v.string(),
    notes: v.union(v.string(), v.null()),
    raw_parsed: v.union(v.any(), v.null()),
  },
  handler: async (ctx, args) => {
    const { userId, taxYear, ...fields } = args
    const now = new Date().toISOString()
    return await ctx.db.insert("fin_tax_foreign_income", {
      user_id: userId,
      tax_year: taxYear,
      ...fields,
      created_at: now,
      updated_at: now,
    })
  },
})

export const deleteForeignIncome = mutation({
  args: { id: v.id("fin_tax_foreign_income") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})

export const saveEstimate = mutation({
  args: {
    userId: v.string(),
    taxYear: v.number(),
    engine_version: v.string(),
    rule_version: v.string(),
    inputs_hash: v.string(),
    result_payload: v.any(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    return await ctx.db.insert("fin_tax_estimates", {
      user_id: args.userId,
      tax_year: args.taxYear,
      engine_version: args.engine_version,
      rule_version: args.rule_version,
      inputs_hash: args.inputs_hash,
      result_payload: args.result_payload,
      created_at: now,
    })
  },
})

export const getLatestEstimate = query({
  args: { userId: v.string(), taxYear: v.number() },
  handler: async (ctx, { userId, taxYear }) => {
    const rows = await ctx.db
      .query("fin_tax_estimates")
      .withIndex("by_user_and_year", (q: any) => q.eq("user_id", userId).eq("tax_year", taxYear))
      .collect()
    if (rows.length === 0) return null
    return rows.sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))[0]
  },
})
