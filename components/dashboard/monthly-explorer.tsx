"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { MonthlyStats, CategoryStats, Transaction, SupportedCurrency } from "@/lib/types"
import { convertAmount, formatCurrency, formatPercent, getMonthName } from "@/lib/utils/format"
import { getCategoryColor, getCategoryIcon } from "@/lib/constants/category-visuals"
import { getCategoryLucideIcon } from "@/lib/constants/category-lucide"
import { cn } from "@/lib/utils"
import { CategoryDetailDialog } from "@/components/dashboard/category-detail-dialog"

interface MonthlyExplorerProps {
  monthlyStats: MonthlyStats[]
  categoryStats: CategoryStats[]
  transactions?: Transaction[]
  displayCurrency: SupportedCurrency
}

export function MonthlyExplorer({ monthlyStats, categoryStats, transactions = [], displayCurrency }: MonthlyExplorerProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    monthlyStats.length > 0 ? monthlyStats[0].month_label : null,
  )
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null)

  if (!monthlyStats || monthlyStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Explorer</CardTitle>
          <CardDescription>Explore detailed monthly breakdowns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">No monthly data available</div>
        </CardContent>
      </Card>
    )
  }

  const selectedMonthData = monthlyStats.find((m) => m.month_label === selectedMonth)
  const selectedMonthCategories = categoryStats.filter((c) => c.month_label === selectedMonth && c.type === "expense")
  const selectedMonthCategoriesWithVisuals = [...selectedMonthCategories]
    .sort((a, b) => b.total_amount - a.total_amount)
    .map((category) => ({
      ...category,
      displayTotal: convertAmount(category.total_amount, displayCurrency),
      displayAvg: convertAmount(category.avg_amount, displayCurrency),
      resolvedColor: getCategoryColor(category.category, category.category_color),
      resolvedIcon: getCategoryIcon(category.category, category.category_icon),
    }))

  const monthExpenseTotal = selectedMonthCategoriesWithVisuals.reduce((sum, c) => sum + c.displayTotal, 0)

  const toggleCategory = (category: string) =>
    setPinnedCategory((prev) => (prev === category ? null : category))

  // Detail for the pinned category in the selected month.
  const pinned = pinnedCategory
    ? selectedMonthCategoriesWithVisuals.find((c) => c.category === pinnedCategory) ?? null
    : null
  const pinnedTransactions = pinned
    ? transactions
        .filter((t) => t.month_label === selectedMonth && t.category === pinned.category)
        .map((t) => ({ ...t, displayAmount: convertAmount(t.amount, displayCurrency) }))
        .sort((a, b) => Math.abs(b.displayAmount) - Math.abs(a.displayAmount))
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Explorer</CardTitle>
        <CardDescription>Click on a month to see detailed breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Selector */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-4">
            {monthlyStats.map((month) => {
              const isSelected = month.month_label === selectedMonth
              return (
                <button
                  key={month.month_label}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedMonth(month.month_label)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all min-w-[120px]",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.03]"
                      : "bg-card border-border hover:bg-accent hover:border-accent-foreground/20",
                  )}
                >
                  <span className="text-sm font-medium">
                    {getMonthName(month.month)} {month.year}
                  </span>
                  <span className={cn("text-[10px] uppercase tracking-wide", isSelected ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                    Spent
                  </span>
                  <span className={cn("text-xs font-semibold", isSelected ? "text-primary-foreground" : "text-foreground")}>
                    {formatCurrency(month.total_expense, displayCurrency)}
                  </span>
                </button>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Selected Month Details */}
        {selectedMonthData && (
          <div className="space-y-6">
            {/* Month KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1 p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                <span className="text-sm text-muted-foreground">Income</span>
                <span className="text-2xl font-bold">{formatCurrency(selectedMonthData.total_income, displayCurrency)}</span>
                <span className="text-xs text-muted-foreground">{selectedMonthData.income_count} transactions</span>
              </div>

              <div className="flex flex-col gap-1 p-4 rounded-lg bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900">
                <span className="text-sm text-muted-foreground">Expenses</span>
                <span className="text-2xl font-bold">{formatCurrency(selectedMonthData.total_expense, displayCurrency)}</span>
                <span className="text-xs text-muted-foreground">{selectedMonthData.expense_count} transactions</span>
              </div>

              <div className="flex flex-col gap-1 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <span className="text-sm text-muted-foreground">Net</span>
                <span className="text-2xl font-bold">{formatCurrency(selectedMonthData.net, displayCurrency)}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedMonthData.net > 0 ? "Surplus" : "Deficit"}
                </span>
              </div>

              <div className="flex flex-col gap-1 p-4 rounded-lg bg-card border">
                <span className="text-sm text-muted-foreground">Savings Rate</span>
                <span className="text-2xl font-bold">{formatPercent(selectedMonthData.savings_rate)}</span>
                <span className="text-xs text-muted-foreground">Of income</span>
              </div>
            </div>

            {/* Category Breakdown */}
            {selectedMonthCategoriesWithVisuals.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Category Breakdown</h3>

                {/* Category Chart */}
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedMonthCategoriesWithVisuals.slice(0, 10)}>
                      <XAxis
                        dataKey="category"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-3 shadow-md">
                                <p className="text-sm font-medium mb-1">{payload[0].payload.category}</p>
                                <p className="text-sm">
                                  {formatCurrency(payload[0].payload.displayTotal, displayCurrency, displayCurrency)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {payload[0].payload.transaction_count} transactions
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1">Click to see details</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar
                        dataKey="displayTotal"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(data: any) => data?.category && toggleCategory(data.category)}
                      >
                        {selectedMonthCategoriesWithVisuals.slice(0, 10).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.resolvedColor}
                            opacity={pinnedCategory && pinnedCategory !== entry.category ? 0.35 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <CategoryDetailDialog
                  open={!!pinned}
                  onOpenChange={(open) => !open && setPinnedCategory(null)}
                  category={pinned?.category ?? null}
                  color={pinned?.resolvedColor ?? "#888888"}
                  total={pinned?.displayTotal ?? 0}
                  displayCurrency={displayCurrency}
                  transactionCount={pinned?.transaction_count ?? 0}
                  shareText={
                    pinned && monthExpenseTotal > 0
                      ? `${((pinned.displayTotal / monthExpenseTotal) * 100).toFixed(0)}% of month`
                      : undefined
                  }
                  transactions={pinnedTransactions}
                />

                {/* Category List */}
                <div className="grid gap-2">
                  {selectedMonthCategoriesWithVisuals.slice(0, 10).map((category) => {
                    const RowIcon = getCategoryLucideIcon(category.category)
                    return (
                    <button
                      type="button"
                      key={category.category}
                      onClick={() => toggleCategory(category.category)}
                      aria-pressed={pinnedCategory === category.category}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left w-full",
                        pinnedCategory === category.category && "ring-2 ring-primary border-primary",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: category.resolvedColor }}
                        >
                          <RowIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-xs text-muted-foreground">{category.transaction_count} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(category.displayTotal, displayCurrency, displayCurrency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Avg: {formatCurrency(category.displayAvg, displayCurrency, displayCurrency)}
                        </p>
                      </div>
                    </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Highlights */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Highlights</h3>
              <div className="flex flex-wrap gap-2">
                {selectedMonthCategoriesWithVisuals.length > 0 && (
                  <>
                    <Badge variant="outline" className="text-sm">
                      Biggest expense: {selectedMonthCategoriesWithVisuals[0].category} (
                      {formatCurrency(selectedMonthCategoriesWithVisuals[0].displayTotal, displayCurrency, displayCurrency)})
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {selectedMonthCategoriesWithVisuals.length} expense categories
                    </Badge>
                    {selectedMonthData.savings_rate > 20 && (
                      <Badge variant="default" className="text-sm bg-emerald-500">
                        Great savings rate!
                      </Badge>
                    )}
                    {selectedMonthData.savings_rate < 0 && (
                      <Badge variant="destructive" className="text-sm">
                        Spending exceeded income
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
