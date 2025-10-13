"use client"

import { useState, useEffect } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { YearlyKPIs } from "@/components/dashboard/yearly-kpis"
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart"
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart"
import { MonthlyExplorer } from "@/components/dashboard/monthly-explorer"
import { TransactionsTable } from "@/components/dashboard/transactions-table"
import type { FilterState, YearlySummary, MonthlyStats, CategoryStats, Transaction } from "@/lib/types"

interface DashboardClientProps {
  availableYears: number[]
  availableAccounts: string[]
}

export function DashboardClient({ availableYears, availableAccounts }: DashboardClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    year: availableYears[0] || null,
    account: null,
    includeTransfers: false,
    includeSavings: false,
  })

  const [yearlySummary, setYearlySummary] = useState<YearlySummary | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          year: filters.year?.toString() || "",
          account: filters.account || "",
          includeTransfers: filters.includeTransfers.toString(),
          includeSavings: filters.includeSavings.toString(),
        })

        const [summaryRes, monthlyRes, categoryRes, transactionsRes] = await Promise.all([
          fetch(`/api/yearly-summary?${params}`),
          fetch(`/api/monthly-stats?${params}`),
          fetch(`/api/category-stats?${params}`),
          fetch(`/api/transactions?${params}`),
        ])

        const [summaryData, monthlyData, categoryData, transactionsData] = await Promise.all([
          summaryRes.json(),
          monthlyRes.json(),
          categoryRes.json(),
          transactionsRes.json(),
        ])

        setYearlySummary(summaryData[0] || null)
        setMonthlyStats(monthlyData)
        setCategoryStats(categoryData)
        setTransactions(transactionsData)
      } catch (error) {
        console.error("[v0] Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [filters])

  return (
    <div className="space-y-4 sm:space-y-8">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        availableYears={availableYears}
        availableAccounts={availableAccounts}
      />

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : (
        <>
          <YearlyKPIs summary={yearlySummary} />

          <div className="grid gap-4 sm:gap-6">
            <MonthlyTrendChart data={monthlyStats} />
            <CategoryBreakdownChart data={categoryStats} />
          </div>

          <MonthlyExplorer monthlyStats={monthlyStats} categoryStats={categoryStats} />

          <TransactionsTable initialTransactions={transactions} />
        </>
      )}
    </div>
  )
}
