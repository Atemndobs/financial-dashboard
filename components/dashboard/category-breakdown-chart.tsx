"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { CategoryStats } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/format"

interface CategoryBreakdownChartProps {
  data: CategoryStats[]
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
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

  const expenseData = data
    .filter((item) => item.type === "expense")
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 10)

  const incomeData = data.filter((item) => item.type === "income").sort((a, b) => b.total_amount - a.total_amount)

  const pieChartData = expenseData.map((item) => ({
    name: item.category,
    value: item.total_amount,
    color: item.category_color || "#94a3b8",
  }))

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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
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
                              <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">{payload[0].name}</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payload[0].value as number)}</p>
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
                    <YAxis dataKey="category" type="category" className="text-xs" width={100} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-white dark:bg-slate-900 p-3 shadow-lg backdrop-blur-sm bg-opacity-100 dark:bg-opacity-100">
                              <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">{payload[0].payload.category}</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payload[0].value as number)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {payload[0].payload.transaction_count} transactions
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="total_amount" radius={[0, 4, 4, 0]}>
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.category_color || "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                            <p className="text-sm font-medium mb-1 text-slate-900 dark:text-slate-100">{payload[0].payload.category}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(payload[0].value as number)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {payload[0].payload.transaction_count} transactions
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="total_amount" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]}>
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.category_color || "#10b981"} />
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
