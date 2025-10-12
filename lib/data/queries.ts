import { createClient } from "@/lib/supabase/server"
import type { Transaction, Category, MonthlyStats, CategoryStats, YearlySummary, FilterState } from "@/lib/types"

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("fin_categories").select("*").eq("is_active", true).order("sort_order")

  if (error) {
    console.error("[v0] Error fetching categories:", error)
    return []
  }

  return data || []
}

export async function getYearlySummary(filters: FilterState): Promise<YearlySummary[]> {
  const supabase = await createClient()
  let query = supabase.from("fin_yearly_summary").select("*")

  if (filters.year) {
    query = query.eq("year", filters.year)
  }

  query = query.order("year", { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching yearly summary:", error)
    return []
  }

  return data || []
}

export async function getMonthlyStats(filters: FilterState): Promise<MonthlyStats[]> {
  const supabase = await createClient()
  let query = supabase.from("fin_monthly_stats").select("*")

  if (filters.year) {
    query = query.eq("year", filters.year)
  }

  if (filters.account) {
    query = query.eq("account", filters.account)
  }

  query = query.order("year", { ascending: false }).order("month", { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching monthly stats:", error)
    return []
  }

  return data || []
}

export async function getCategoryStats(filters: FilterState): Promise<CategoryStats[]> {
  const supabase = await createClient()
  let query = supabase.from("fin_category_stats").select("*")

  if (filters.year) {
    query = query.eq("year", filters.year)
  }

  query = query.order("total_amount", { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching category stats:", error)
    return []
  }

  return data || []
}

export async function getTransactions(filters: FilterState, limit?: number): Promise<Transaction[]> {
  const supabase = await createClient()

  // Use the fin_recent_transactions view which already has category colors and icons
  let query = supabase.from("fin_recent_transactions").select("*").eq("user_excluded", false)

  if (!filters.includeTransfers) {
    query = query.neq("type", "transfer")
  }

  if (!filters.includeSavings) {
    query = query.eq("exclude_from_spending", false)
  }

  if (filters.year) {
    query = query.eq("year", filters.year)
  }

  if (filters.account) {
    query = query.eq("account", filters.account)
  }

  query = query.order("date", { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching transactions:", error)
    return []
  }

  return data || []
}

export async function getAvailableYears(): Promise<number[]> {
  const supabase = await createClient()

  // Get distinct years from the yearly summary view for better performance
  const { data, error } = await supabase.from("fin_yearly_summary").select("year").order("year", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching years:", error)
    return []
  }

  return data.map((d) => d.year)
}

export async function getAvailableAccounts(): Promise<string[]> {
  const supabase = await createClient()

  // Use the account summary view for better performance
  const { data, error } = await supabase.from("fin_account_summary").select("account").order("account")

  if (error) {
    console.error("[v0] Error fetching accounts:", error)
    return []
  }

  return data.map((d) => d.account)
}
