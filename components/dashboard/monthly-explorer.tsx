"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { MonthlyStats, CategoryStats } from "@/lib/types"
import { formatPercent, getMonthName } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat"

interface MonthlyExplorerProps {
  monthlyStats: MonthlyStats[]
  categoryStats: CategoryStats[]
}

export function MonthlyExplorer({ monthlyStats, categoryStats }: MonthlyExplorerProps) {
  const { formatCurrency } = useCurrencyFormat()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    monthlyStats.length > 0 ? monthlyStats[0].month_label : null,
  )
  const categoryTooltipWrapperStyle = { zIndex: 99999, pointerEvents: "none" as const }

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
                  onClick={() => setSelectedMonth(month.month_label)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all min-w-[120px]",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary ring-offset-2 scale-105"
                      : "bg-card hover:bg-accent hover:border-accent-foreground/20 border-border",
                  )}
                >
                  <span className={cn("text-sm font-medium", isSelected && "font-bold")}>
                    {getMonthName(month.month)} {month.year}
                  </span>
                  <span className={cn("text-xs", isSelected ? "text-primary-foreground/90 font-semibold" : "text-muted-foreground")}>
                    {formatCurrency(month.total_expense)}
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
                <span className="text-2xl font-bold">{formatCurrency(selectedMonthData.total_income)}</span>
                <span className="text-xs text-muted-foreground">{selectedMonthData.income_count} transactions</span>
              </div>

              <div className="flex flex-col gap-1 p-4 rounded-lg bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900">
                <span className="text-sm text-muted-foreground">Expenses</span>
                <span className="text-2xl font-bold">{formatCurrency(selectedMonthData.total_expense)}</span>
                <span className="text-xs text-muted-foreground">{selectedMonthData.expense_count} transactions</span>
              </div>

              <div className="flex flex-col gap-1 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <span className="text-sm text-muted-foreground">Net</span>
                <span className="text-2xl font-bold">{formatCurrency(selectedMonthData.net)}</span>
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
            {selectedMonthCategories.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Category Breakdown</h3>

                {/* Category Chart */}
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedMonthCategories.slice(0, 10)}>
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
                        wrapperStyle={categoryTooltipWrapperStyle}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-white dark:bg-slate-900 p-3 shadow-lg backdrop-blur-sm bg-opacity-100 dark:bg-opacity-100">
                                <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">
                                  {payload[0].payload.category}
                                </p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {formatCurrency(payload[0].value as number)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {payload[0].payload.transaction_count} transactions
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="total_amount" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category List */}
                <div className="grid gap-2">
                  {selectedMonthCategories.slice(0, 10).map((category) => (
                    <div
                      key={category.category}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.category_color || "#94a3b8" }}
                        />
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-xs text-muted-foreground">{category.transaction_count} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(category.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">Avg: {formatCurrency(category.avg_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Highlights</h3>
              <div className="flex flex-wrap gap-2">
                {selectedMonthCategories.length > 0 && (
                  <>
                    <Badge variant="outline" className="text-sm">
                      Biggest expense: {selectedMonthCategories[0].category} (
                      {formatCurrency(selectedMonthCategories[0].total_amount)})
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {selectedMonthCategories.length} expense categories
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
