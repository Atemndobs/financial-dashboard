"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { CategoryStats, Transaction, SupportedCurrency } from "@/lib/types"
import { convertAmount, formatCurrency } from "@/lib/utils/format"
import { getCategoryColor, getCategoryIcon } from "@/lib/constants/category-visuals"
import { cn } from "@/lib/utils"
import { CategoryDetailDialog } from "@/components/dashboard/category-detail-dialog"
import { getCategoryLucideIcon } from "@/lib/constants/category-lucide"

const RADIAN = Math.PI / 180

// Compact money: 1234 -> "1.2k", 3000 -> "3k", 950 -> "950".
function shortAmount(value: number): string {
  const n = Math.abs(value)
  if (n >= 1000) {
    const k = n / 1000
    return `${k >= 10 ? Math.round(k) : Number(k.toFixed(1))}k`
  }
  return `${Math.round(n)}`
}

// Big slices get an icon + amount painted inside; tiny slices are extracted
// with a leader line and labelled just outside the pie.
function renderExpensePieLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, percent, value, name, payload } = props
  if (!value) return null
  const fill = props.fill ?? payload?.color ?? "#888888"
  const cos = Math.cos(-midAngle * RADIAN)
  const sin = Math.sin(-midAngle * RADIAN)
  const Icon = getCategoryLucideIcon(name)
  const amount = shortAmount(value)
  const inside = percent >= 0.06

  if (inside) {
    const r = outerRadius * 0.62
    const x = cx + r * cos
    const y = cy + r * sin
    return (
      <g pointerEvents="none">
        <Icon x={x - 9} y={y - 21} width={18} height={18} color="#ffffff" strokeWidth={2.25} />
        <text
          x={x}
          y={y + 9}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#ffffff"
          stroke="rgba(0,0,0,0.28)"
          strokeWidth={2.5}
          paintOrder="stroke"
        >
          {amount}
        </text>
      </g>
    )
  }

  // Small slice: leader line out to a label sitting just outside the arc.
  const x1 = cx + outerRadius * cos
  const y1 = cy + outerRadius * sin
  const x2 = cx + (outerRadius + 12) * cos
  const y2 = cy + (outerRadius + 12) * sin
  const right = cos >= 0
  const x3 = x2 + (right ? 14 : -14)
  return (
    <g pointerEvents="none">
      <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y2}`} stroke={fill} strokeWidth={1.25} fill="none" />
      <Icon x={x3 + (right ? 1 : -15)} y={y2 - 15} width={13} height={13} color={fill} strokeWidth={2.25} />
      <text
        x={x3 + (right ? 17 : -17)}
        y={y2 + 4}
        textAnchor={right ? "start" : "end"}
        fontSize={11}
        fontWeight={600}
        fill={fill}
      >
        {amount}
      </text>
    </g>
  )
}

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

  const pinnedShareText =
    pinnedRow && pinnedTotalBase > 0
      ? `${((pinnedRow.display_amount / pinnedTotalBase) * 100).toFixed(0)}% of ${pinnedRow.type}`
      : undefined

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
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderExpensePieLabel}
                      outerRadius="88%"
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

            <div className="grid gap-2">
              {expenseData.map((item) => {
                const RowIcon = getCategoryLucideIcon(item.category)
                return (
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
                    <RowIcon className="h-4 w-4 shrink-0" style={{ color: item.category_color }} />
                    <span>{item.category}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(item.display_amount, displayCurrency, displayCurrency)}
                    {expenseTotal > 0 ? ` • ${((item.display_amount / expenseTotal) * 100).toFixed(0)}%` : ""}
                  </div>
                </button>
                )
              })}
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
          </TabsContent>
        </Tabs>

        <CategoryDetailDialog
          open={!!pinnedRow}
          onOpenChange={(open) => !open && setPinnedCategory(null)}
          category={pinnedRow?.category ?? null}
          color={pinnedRow?.category_color ?? "#888888"}
          total={pinnedRow?.display_amount ?? 0}
          displayCurrency={displayCurrency}
          transactionCount={pinnedRow?.transaction_count ?? 0}
          shareText={pinnedShareText}
          transactions={pinnedTransactions}
        />
      </CardContent>
    </Card>
  )
}
