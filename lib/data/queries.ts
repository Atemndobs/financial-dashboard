import { auth } from "@clerk/nextjs/server"
import { runConvexQuery } from "@/lib/convex/server"
import type { Transaction, Category, MonthlyStats, CategoryStats, YearlySummary, FilterState } from "@/lib/types"

async function getCurrentUserId() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  return userId
}

export async function getCategories(): Promise<Category[]> {
  try {
    return await runConvexQuery<Record<string, never>, Category[]>("dashboard:getCategories", {})
  } catch (error) {
    console.error("[v0] Error fetching categories:", error)
    return []
  }
}

export async function getYearlySummary(filters: FilterState): Promise<YearlySummary[]> {
  try {
    const userId = await getCurrentUserId()
    return await runConvexQuery<{ userId: string; year: number | null }, YearlySummary[]>("dashboard:getYearlySummary", {
      userId,
      year: filters.year,
    })
  } catch (error) {
    console.error("[v0] Error fetching yearly summary:", error)
    return []
  }
}

export async function getMonthlyStats(filters: FilterState): Promise<MonthlyStats[]> {
  try {
    const userId = await getCurrentUserId()
    return await runConvexQuery<{ userId: string; year: number | null; account: string | null }, MonthlyStats[]>(
      "dashboard:getMonthlyStats",
      {
        userId,
        year: filters.year,
        account: filters.account,
      },
    )
  } catch (error) {
    console.error("[v0] Error fetching monthly stats:", error)
    return []
  }
}

export async function getCategoryStats(filters: FilterState): Promise<CategoryStats[]> {
  try {
    const userId = await getCurrentUserId()
    return await runConvexQuery<{ userId: string; year: number | null }, CategoryStats[]>("dashboard:getCategoryStats", {
      userId,
      year: filters.year,
    })
  } catch (error) {
    console.error("[v0] Error fetching category stats:", error)
    return []
  }
}

export async function getTransactions(filters: FilterState, limit?: number): Promise<Transaction[]> {
  try {
    const userId = await getCurrentUserId()
    return await runConvexQuery<
      {
        userId: string
        year: number | null
        account: string | null
        includeTransfers: boolean
        includeSavings: boolean
        limit?: number
      },
      Transaction[]
    >("dashboard:getTransactions", {
      userId,
      year: filters.year,
      account: filters.account,
      includeTransfers: filters.includeTransfers,
      includeSavings: filters.includeSavings,
      ...(typeof limit === "number" ? { limit } : {}),
    })
  } catch (error) {
    console.error("[v0] Error fetching transactions:", error)
    return []
  }
}

export async function getAvailableYears(): Promise<number[]> {
  try {
    const userId = await getCurrentUserId()
    return await runConvexQuery<{ userId: string }, number[]>("dashboard:getAvailableYears", { userId })
  } catch (error) {
    console.error("[v0] Error fetching years:", error)
    return []
  }
}

export async function getAvailableAccounts(): Promise<string[]> {
  try {
    const userId = await getCurrentUserId()
    return await runConvexQuery<{ userId: string }, string[]>("dashboard:getAvailableAccounts", { userId })
  } catch (error) {
    console.error("[v0] Error fetching accounts:", error)
    return []
  }
}
