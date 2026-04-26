"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { CategoryStats, SupportedCurrency } from "@/lib/types"
import { convertAmount, formatCurrency } from "@/lib/utils/format"
import { getCategoryColor, getCategoryIcon } from "@/lib/constants/category-visuals"

interface CategoryBreakdownChartProps {
  data: CategoryStats[]
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

export function CategoryBreakdownChart({ data, displayCurrency }: CategoryBreakdownChartProps) {
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
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                    <Bar dataKey="display_amount" radius={[0, 4, 4, 0]}>
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.category_color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-2">
              {expenseData.map((item) => (
                <div key={item.category} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.category_color }} />
                    <span>{item.category_icon}</span>
                    <span>{item.category}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(item.display_amount, displayCurrency, displayCurrency)}
                    {expenseTotal > 0 ? ` • ${((item.display_amount / expenseTotal) * 100).toFixed(0)}%` : ""}
                  </div>
                </div>
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
                  <Bar dataKey="display_amount" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]}>
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.category_color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
