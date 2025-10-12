"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { MonthlyStats } from "@/lib/types"
import { formatCurrency, formatPercent, getMonthName } from "@/lib/utils/format"

interface MonthlyTrendChartProps {
  data: MonthlyStats[]
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>Income vs Expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">No data available</div>
        </CardContent>
      </Card>
    )
  }

  // Sort by year and month ascending for proper timeline
  const sortedData = [...data].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  const chartData = sortedData.map((item) => ({
    month: `${getMonthName(item.month).slice(0, 3)} ${item.year}`,
    income: item.total_income,
    expense: item.total_expense,
    net: item.net,
    savingsRate: item.savings_rate,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
        <CardDescription>Income vs Expenses and Savings Rate over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Income vs Expense Bar Chart */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
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
                          <p className="text-sm font-medium mb-2 text-slate-900 dark:text-slate-100">{payload[0].payload.month}</p>
                          <div className="space-y-1">
                            <p className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <span className="h-3 w-3 rounded-full bg-emerald-500" />
                              Income: {formatCurrency(payload[0].payload.income)}
                            </p>
                            <p className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <span className="h-3 w-3 rounded-full bg-rose-500" />
                              Expense: {formatCurrency(payload[0].payload.expense)}
                            </p>
                            <p className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <span className="h-3 w-3 rounded-full bg-blue-500" />
                              Net: {formatCurrency(payload[0].payload.net)}
                            </p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar dataKey="income" fill="hsl(142, 76%, 36%)" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" name="Expense" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Savings Rate Line Chart */}
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-white dark:bg-slate-900 p-3 shadow-lg backdrop-blur-sm bg-opacity-100 dark:bg-opacity-100">
                          <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">{payload[0].payload.month}</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">Savings Rate: {formatPercent(payload[0].payload.savingsRate)}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="savingsRate"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  name="Savings Rate (%)"
                  dot={{ fill: "hsl(217, 91%, 60%)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
