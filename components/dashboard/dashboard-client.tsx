"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { YearlyKPIs } from "@/components/dashboard/yearly-kpis"
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart"
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart"
import { MonthlyExplorer } from "@/components/dashboard/monthly-explorer"
import { TransactionsTable } from "@/components/dashboard/transactions-table"
import { useIsMobile } from "@/components/ui/use-mobile"
import type { FilterState, YearlySummary, MonthlyStats, CategoryStats, Transaction, SupportedCurrency } from "@/lib/types"

interface DashboardClientProps {
  availableYears: number[]
  availableAccounts: string[]
}

export function DashboardClient({ availableYears, availableAccounts }: DashboardClientProps) {
  const isMobile = useIsMobile()
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
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("CHF")
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsFiltersCollapsed(isMobile)
  }, [isMobile])

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
    <div className="space-y-8 overflow-x-clip">
      <DashboardHeader
        showFilterToggle={isMobile}
        isFiltersCollapsed={isFiltersCollapsed}
        onToggleFilters={() => setIsFiltersCollapsed((prev) => !prev)}
        activeYear={filters.year}
      />

      {(!isMobile || !isFiltersCollapsed) && (
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          availableYears={availableYears}
          availableAccounts={availableAccounts}
          displayCurrency={displayCurrency}
          onCurrencyChange={setDisplayCurrency}
        />
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : (
        <>
          <YearlyKPIs summary={yearlySummary} displayCurrency={displayCurrency} />

          <div className="grid gap-6">
            <MonthlyTrendChart data={monthlyStats} displayCurrency={displayCurrency} />
            <CategoryBreakdownChart data={categoryStats} transactions={transactions} displayCurrency={displayCurrency} />
          </div>

          <MonthlyExplorer
            monthlyStats={monthlyStats}
            categoryStats={categoryStats}
            transactions={transactions}
            displayCurrency={displayCurrency}
          />

          <TransactionsTable initialTransactions={transactions} displayCurrency={displayCurrency} />
        </>
      )}
    </div>
  )
}
