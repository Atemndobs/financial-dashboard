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

// Combine the per-year summaries into a single "All years" summary.
function combineYearlySummaries(rows: YearlySummary[]): YearlySummary | null {
  if (!rows || rows.length === 0) return null
  if (rows.length === 1) return rows[0]

  const total_income = rows.reduce((s, r) => s + r.total_income, 0)
  const total_expense = rows.reduce((s, r) => s + r.total_expense, 0)
  const net_savings = rows.reduce((s, r) => s + r.net_savings, 0)
  // Reconstruct month counts from each year's average so the combined average
  // is a true per-month figure across all years.
  const incomeMonths = rows.reduce((s, r) => s + (r.avg_monthly_income > 0 ? r.total_income / r.avg_monthly_income : 0), 0)
  const expenseMonths = rows.reduce((s, r) => s + (r.avg_monthly_expense > 0 ? r.total_expense / r.avg_monthly_expense : 0), 0)

  return {
    year: 0, // sentinel: rendered as "All years"
    total_income,
    total_expense,
    net_savings,
    savings_rate: total_income > 0 ? (net_savings / total_income) * 100 : 0,
    transaction_count: rows.reduce((s, r) => s + r.transaction_count, 0),
    account_count: Math.max(...rows.map((r) => r.account_count)),
    category_count: Math.max(...rows.map((r) => r.category_count)),
    avg_monthly_income: incomeMonths > 0 ? total_income / incomeMonths : 0,
    avg_monthly_expense: expenseMonths > 0 ? total_expense / expenseMonths : 0,
  }
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

        setYearlySummary(
          filters.year === null ? combineYearlySummaries(summaryData) : summaryData[0] || null,
        )
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
