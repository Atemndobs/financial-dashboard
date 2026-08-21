"use client"

import { useState } from "react"
import { XIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { CategoryStats, Transaction, SupportedCurrency } from "@/lib/types"
import { convertAmount, formatCurrency, formatDate } from "@/lib/utils/format"
import { getCategoryColor, getCategoryIcon } from "@/lib/constants/category-visuals"
import { cn } from "@/lib/utils"

interface CategoryBreakdownChartProps {
  data: CategoryStats[]
  transactions?: Transaction[]
  displayCurrency: SupportedCurrency
}

type AggregatedCategoryRow = {
  category: string
  type: string
  total_amount: number
  transaction_count: number
  category_color: string | null
  category_icon: string | null
}

function aggregateByCategory(data: CategoryStats[], type: "income" | "expense"): AggregatedCategoryRow[] {
  const grouped = new Map<string, AggregatedCategoryRow>()

  for (const item of data.filter((row) => row.type === type)) {
    const existing = grouped.get(item.category)
    if (existing) {
      existing.total_amount += item.total_amount
      existing.transaction_count += item.transaction_count
      if (!existing.category_color && item.category_color) {
        existing.category_color = item.category_color
      }
      if (!existing.category_icon && item.category_icon) {
        existing.category_icon = item.category_icon
      }
      continue
    }

    grouped.set(item.category, {
      category: item.category,
      type: item.type,
      total_amount: item.total_amount,
      transaction_count: item.transaction_count,
      category_color: item.category_color,
      category_icon: item.category_icon,
    })
  }

  return Array.from(grouped.values()).sort((a, b) => b.total_amount - a.total_amount)
}

export function CategoryBreakdownChart({ data, transactions = [], displayCurrency }: CategoryBreakdownChartProps) {
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null)
  const toggleCategory = (category: string) =>
    setPinnedCategory((prev) => (prev === category ? null : category))

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Spending by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">No data available</div>
        </CardContent>
      </Card>
    )
  }

  const expenseData = aggregateByCategory(data, "expense").slice(0, 10).map((item) => ({
    ...item,
    category_color: getCategoryColor(item.category, item.category_color),
    category_icon: getCategoryIcon(item.category, item.category_icon),
    display_amount: convertAmount(item.total_amount, displayCurrency),
  }))

  const incomeData = aggregateByCategory(data, "income").slice(0, 10).map((item) => ({
    ...item,
    category_color: getCategoryColor(item.category, item.category_color),
    category_icon: getCategoryIcon(item.category, item.category_icon),
    display_amount: convertAmount(item.total_amount, displayCurrency),
  }))

  const pieChartData = expenseData.map((item) => ({
    name: item.category,
    icon: item.category_icon,
    value: item.display_amount,
    color: item.category_color,
    transactions: item.transaction_count,
  }))
  const expenseTotal = pieChartData.reduce((sum, item) => sum + item.value, 0)
  const incomeTotal = incomeData.reduce((sum, item) => sum + item.display_amount, 0)

  // Pinned-category detail (works for both expense and income rows).
  const pinnedRow = pinnedCategory
    ? [...expenseData, ...incomeData].find((r) => r.category === pinnedCategory) ?? null
    : null
  const pinnedTotalBase = pinnedRow?.type === "income" ? incomeTotal : expenseTotal
  const pinnedTransactions = pinnedRow
    ? transactions
        .filter((t) => t.category === pinnedRow.category)
        .map((t) => ({ ...t, displayAmount: convertAmount(t.amount, displayCurrency) }))
        .sort((a, b) => Math.abs(b.displayAmount) - Math.abs(a.displayAmount))
    : []

  const detailCard = pinnedRow ? (
    <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
      <div
        className="flex items-start justify-between gap-4 p-4 border-b"
        style={{ backgroundColor: `${pinnedRow.category_color}1a` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-xl"
            style={{ backgroundColor: `${pinnedRow.category_color}33` }}
          >
            {pinnedRow.category_icon}
          </div>
          <div>
            <p className="text-xl font-bold leading-tight">{pinnedRow.category}</p>
            <p className="text-xs text-muted-foreground">
              {pinnedRow.transaction_count} transactions
              {pinnedTotalBase > 0
                ? ` · ${((pinnedRow.display_amount / pinnedTotalBase) * 100).toFixed(0)}% of ${pinnedRow.type}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(pinnedRow.display_amount, displayCurrency, displayCurrency)}
          </p>
          <button
            type="button"
            onClick={() => setPinnedCategory(null)}
            aria-label="Close details"
            className="rounded-md p-1 hover:bg-accent text-muted-foreground"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="max-h-[320px] overflow-y-auto divide-y">
        {pinnedTransactions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No individual transactions available for this category in the current view.
          </p>
        ) : (
          pinnedTransactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-accent/50">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.description || t.counterparty || "—"}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums whitespace-nowrap",
                  t.displayAmount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                {formatCurrency(t.displayAmount, displayCurrency, displayCurrency)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  ) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>Analyze spending and income by category</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Pie Chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                      cursor="pointer"
                      onClick={(d: any) => d?.name && toggleCategory(d.name)}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={pinnedCategory && pinnedCategory !== entry.name ? 0.35 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-white dark:bg-slate-900 p-3 shadow-lg backdrop-blur-sm bg-opacity-100 dark:bg-opacity-100">
                              <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">
                                {payload[0].payload.icon} {payload[0].name}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {formatCurrency(payload[0].value as number, displayCurrency, displayCurrency)}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {payload[0].payload.transactions} transactions
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseData} layout="vertical">
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis dataKey="category" type="category" className="text-xs" width={120} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-white dark:bg-slate-900 p-3 shadow-lg backdrop-blur-sm bg-opacity-100 dark:bg-opacity-100">
                              <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">
                                {payload[0].payload.category_icon} {payload[0].payload.category}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {formatCurrency(payload[0].value as number, displayCurrency, displayCurrency)}
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
                    <Bar
                      dataKey="display_amount"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(d: any) => d?.category && toggleCategory(d.category)}
                    >
                      {expenseData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.category_color}
                          opacity={pinnedCategory && pinnedCategory !== entry.category ? 0.35 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {pinnedRow && pinnedRow.type !== "income" ? detailCard : null}

            <div className="grid gap-2">
              {expenseData.map((item) => (
                <button
                  type="button"
                  key={item.category}
                  onClick={() => toggleCategory(item.category)}
                  aria-pressed={pinnedCategory === item.category}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-2.5 text-left w-full hover:bg-accent transition-colors",
                    pinnedCategory === item.category && "ring-2 ring-primary border-primary",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.category_color }} />
                    <span>{item.category_icon}</span>
                    <span>{item.category}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(item.display_amount, displayCurrency, displayCurrency)}
                    {expenseTotal > 0 ? ` • ${((item.display_amount / expenseTotal) * 100).toFixed(0)}%` : ""}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData}>
                  <XAxis dataKey="category" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-white dark:bg-slate-900 p-3 shadow-lg backdrop-blur-sm bg-opacity-100 dark:bg-opacity-100">
                            <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">
                              {payload[0].payload.category_icon} {payload[0].payload.category}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {formatCurrency(payload[0].value as number, displayCurrency, displayCurrency)}
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
                  <Bar
                    dataKey="display_amount"
                    fill="hsl(142, 76%, 36%)"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(d: any) => d?.category && toggleCategory(d.category)}
                  >
                    {incomeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.category_color}
                        opacity={pinnedCategory && pinnedCategory !== entry.category ? 0.35 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {pinnedRow?.type === "income" ? detailCard : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
