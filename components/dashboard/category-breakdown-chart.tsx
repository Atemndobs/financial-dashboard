"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { icons, type LucideIcon } from "lucide-react"
import type { CategoryStats } from "@/lib/types"
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat"
import { cn } from "@/lib/utils"

const lucideIcons = icons as Record<string, LucideIcon>
const iconCache = new Map<string, LucideIcon | null>()

type CategoryGraphic =
  | { kind: "lucide"; icon: LucideIcon }
  | { kind: "image"; src: string }

const CATEGORY_ICON_OVERRIDES: Record<string, string> = {
  rent: "Sofa",
  household: "Home",
  shopping: "ShoppingBag",
  groceries: "ShoppingCart",
  insurance: "ShieldCheck",
  transportation: "Car",
  dining: "Utensils",
  vacation: "Plane",
  subscriptions: "Repeat",
  savings: "PiggyBank",
  jna: "Briefcase",
}

const CATEGORY_IMAGE_OVERRIDES: Record<string, string> = {
  jna: "/android-icon-36x36.png",
  "jna business": "/android-icon-36x36.png",
  "jna business solutions": "/android-icon-36x36.png",
  "jna business expenses": "/android-icon-36x36.png",
}

function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("")
}

function buildIconCandidates(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return []

  const candidates = new Set<string>()
  const pascal = toPascalCase(trimmed)
  const camel = pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : ""
  const slug = trimmed.replace(/\s+/g, "-")
  const squished = trimmed.replace(/[^a-zA-Z0-9]/g, "")

  const baseVariants = [trimmed, trimmed.toLowerCase(), pascal, camel, slug, slug.toLowerCase(), squished]
  baseVariants.forEach((variant) => {
    if (!variant) return
    candidates.add(variant)
    if (variant.endsWith("Icon")) {
      candidates.add(variant.slice(0, -4))
    } else {
      candidates.add(`${variant}Icon`)
    }
  })

  return Array.from(candidates)
}

function resolveIconByName(name?: string | null): LucideIcon | null {
  if (!name) return null
  const cacheKey = name.trim()
  if (!cacheKey) return null

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey) ?? null
  }

  const candidates = buildIconCandidates(cacheKey)
  for (const candidate of candidates) {
    const IconComponent = lucideIcons[candidate]
    if (IconComponent) {
      iconCache.set(cacheKey, IconComponent)
      return IconComponent
    }
  }

  iconCache.set(cacheKey, null)
  return null
}

function resolveLucideCategoryIcon(iconName?: string | null, fallbackCategory?: string | null) {
  const attempts: Array<string | null | undefined> = []
  const normalizedFallback = fallbackCategory?.trim().toLowerCase()

  if (normalizedFallback && CATEGORY_ICON_OVERRIDES[normalizedFallback]) {
    attempts.push(CATEGORY_ICON_OVERRIDES[normalizedFallback])
  }

  attempts.push(iconName, fallbackCategory)

  for (const attempt of attempts) {
    const icon = resolveIconByName(attempt)
    if (icon) {
      return icon
    }
  }

  return null
}

function resolveCategoryGraphic(iconName?: string | null, fallbackCategory?: string | null): CategoryGraphic | null {
  const normalizedFallback = fallbackCategory?.trim().toLowerCase()

  if (normalizedFallback && CATEGORY_IMAGE_OVERRIDES[normalizedFallback]) {
    return { kind: "image", src: CATEGORY_IMAGE_OVERRIDES[normalizedFallback] }
  }

  const lucideIcon = resolveLucideCategoryIcon(iconName, fallbackCategory)

  if (lucideIcon) {
    return { kind: "lucide", icon: lucideIcon }
  }

  return null
}

interface CategoryBreakdownChartProps {
  data: CategoryStats[]
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const { formatCurrency } = useCurrencyFormat()
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

  const aggregateCategoryData = (items: CategoryStats[]) => {
    const aggregated = new Map<string, CategoryStats>()

    items.forEach((item) => {
      const key = `${item.type}-${item.category}`
      const existing = aggregated.get(key)

      if (existing) {
        existing.total_amount += item.total_amount
        existing.transaction_count += item.transaction_count
        existing.min_amount = Math.min(existing.min_amount, item.min_amount)
        existing.max_amount = Math.max(existing.max_amount, item.max_amount)

        if (!existing.category_color && item.category_color) {
          existing.category_color = item.category_color
        }

        if (!existing.category_icon && item.category_icon) {
          existing.category_icon = item.category_icon
        }
      } else {
        aggregated.set(key, { ...item })
      }
    })

    return Array.from(aggregated.values()).map((item) => ({
      ...item,
      avg_amount: item.transaction_count > 0 ? item.total_amount / item.transaction_count : 0,
    }))
  }

  const expenseData = aggregateCategoryData(
    data.filter((item) => item.type === "expense"),
  )
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 10)

  const incomeData = aggregateCategoryData(
    data.filter((item) => item.type === "income"),
  ).sort((a, b) => b.total_amount - a.total_amount)

  const pieChartData = expenseData.map((item) => ({
    name: item.category,
    value: item.total_amount,
    transactions: item.transaction_count,
    color: item.category_color || "#94a3b8",
    icon: item.category_icon,
  }))

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640
  const pieChartHeight = isMobile ? 260 : 340

  const renderGraphicElement = (graphic: CategoryGraphic | null, sliceColor: string, sizeClass = "h-4 w-4") => {
    if (graphic?.kind === "lucide") {
      const IconComponent = graphic.icon
      return <IconComponent className={sizeClass} style={{ color: "hsl(var(--foreground))" }} aria-hidden="true" />
    }

    if (graphic?.kind === "image") {
      return <img src={graphic.src} alt="" className={cn("object-contain", sizeClass)} aria-hidden="true" />
    }

    return (
      <span
        className={cn("block rounded-full", sizeClass)}
        style={{ backgroundColor: sliceColor }}
        aria-hidden="true"
      />
    )
  }

  // Custom label rendering with better spacing
  const renderCustomLabel = (props: any) => {
    const RADIAN = Math.PI / 180
    const { cx, cy, midAngle, outerRadius, name, percent } = props
    const sin = Math.sin(-RADIAN * midAngle)
    const cos = Math.cos(-RADIAN * midAngle)

    const connectorOffset = outerRadius + (isMobile ? 6 : 12)
    const horizontalExtension = isMobile ? 18 : 26

    const sx = cx + outerRadius * cos
    const sy = cy + outerRadius * sin
    const mx = cx + connectorOffset * cos
    const my = cy + connectorOffset * sin
    const ex = mx + (cos >= 0 ? 1 : -1) * horizontalExtension
    const ey = my
    const percentageValue = percent * 100
    const percentageLabel = `${percentageValue.toFixed(0)}%`
    const isRightSide = cos >= 0
    const sliceColor = props.payload?.color || props.fill || "#94a3b8"
    const iconName = props.payload?.icon ?? props.payload?.category_icon ?? null
    const graphic = resolveCategoryGraphic(iconName, name)
    const showText = !isMobile

    const minInsidePercent = isMobile ? 18 : 10
    const showInsideBadge = percentageValue >= minInsidePercent
    const showOutsideLabel = !isMobile || !showInsideBadge

    const labelText = `${name} ${percentageLabel}`

    const badgeSize = isMobile ? 48 : 60
    const badgeRadiusFactor = isMobile ? 0.58 : 0.6
    const angleForLabel = ((midAngle % 360) + 360) % 360
    const bandMargin = isMobile ? 70 : 50
    const isWithinBand = angleForLabel >= bandMargin && angleForLabel <= 360 - bandMargin

    const insideBadge = showInsideBadge && isWithinBand ? (
      <foreignObject
        x={cx + outerRadius * badgeRadiusFactor * cos - badgeSize / 2}
        y={cy + outerRadius * badgeRadiusFactor * sin - badgeSize / 2}
        width={badgeSize}
        height={badgeSize}
      >
        <div
          className={cn(
            "flex h-full items-center justify-center text-[10px] font-semibold text-foreground",
            isMobile ? "flex-row gap-2" : "flex-col gap-1"
          )}
        >
          <div
            className="flex items-center justify-center rounded-full shadow-sm"
            style={{
              boxShadow: "0 8px 20px -12px rgba(15, 23, 42, 0.35)",
              backgroundColor: "hsl(var(--background))",
              border: `2px solid ${sliceColor}`,
              height: isMobile ? "1.75rem" : "2.2rem",
              width: isMobile ? "1.75rem" : "2.2rem",
            }}
          >
            {renderGraphicElement(graphic, sliceColor, isMobile ? "h-4 w-4" : "h-5 w-5")}
          </div>
          <span className={cn("tracking-tight", isMobile ? "text-xs" : "text-[11px]")}>{percentageLabel}</span>
          <span className="sr-only">{labelText}</span>
        </div>
      </foreignObject>
    ) : null

    if (!showOutsideLabel) {
      return <g>{insideBadge}</g>
    }

    if (!showText) {
      const badgeRadius = outerRadius + 28
      const mobileBadgeSize = 48
      const badgeX = cx + badgeRadius * cos - mobileBadgeSize / 2
      const badgeY = cy + badgeRadius * sin - mobileBadgeSize / 2
      const badgeCenterX = badgeX + mobileBadgeSize / 2
      const badgeCenterY = badgeY + mobileBadgeSize / 2

      return (
        <g>
          <path d={`M${sx},${sy} L${badgeCenterX},${badgeCenterY}`} stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="none" />
          <foreignObject x={badgeX} y={badgeY} width={mobileBadgeSize} height={mobileBadgeSize}>
            <div className="flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold text-foreground">
              <div
                className="flex items-center justify-center rounded-full shadow-sm"
                style={{
                  boxShadow: "0 8px 20px -12px rgba(15, 23, 42, 0.35)",
                  backgroundColor: "hsl(var(--background))",
                  border: `2px solid ${sliceColor}`,
                  height: "1.75rem",
                  width: "1.75rem",
                }}
              >
                {renderGraphicElement(graphic, sliceColor, "h-4 w-4")}
              </div>
              <span>{percentageLabel}</span>
              <span className="sr-only">{labelText}</span>
            </div>
          </foreignObject>
          {insideBadge}
        </g>
      )
    }

    const labelWidth = 200
    const labelHeight = 34
    const horizontalGap = 12
    const labelX = isRightSide ? ex + horizontalGap : ex - (labelWidth + horizontalGap)
    const labelY = ey - labelHeight / 2

    const textNode = showText ? (
      <span className="max-w-[150px] truncate">{labelText}</span>
    ) : (
      <span className="text-xs font-semibold">{percentageLabel}</span>
    )

    return (
      <g>
        <path
          d={`M${sx},${sy} L${mx},${my} L${ex},${ey}`}
          stroke="hsl(var(--foreground))"
          strokeWidth={1.5}
          fill="none"
        />
        <foreignObject x={labelX} y={labelY} width={labelWidth} height={labelHeight}>
          <div
            className={cn(
              "flex h-full items-center gap-2 text-xs font-medium text-foreground",
              isRightSide ? "justify-start" : "justify-end"
            )}
          >
            {isRightSide ? (
              <>
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-sm"
                  style={{
                    boxShadow: "0 8px 20px -12px rgba(15, 23, 42, 0.35)",
                    backgroundColor: "hsl(var(--background))",
                    border: `2px solid ${sliceColor}`,
                  }}
                >
                  {renderGraphicElement(graphic, sliceColor, "h-3.5 w-3.5")}
                </div>
                {textNode}
              </>
            ) : (
              <>
                {textNode}
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-sm"
                  style={{
                    boxShadow: "0 8px 20px -12px rgba(15, 23, 42, 0.35)",
                    backgroundColor: "hsl(var(--background))",
                    border: `2px solid ${sliceColor}`,
                  }}
                >
                  {renderGraphicElement(graphic, sliceColor, "h-3.5 w-3.5")}
                </div>
              </>
            )}
            {!showText && <span className="sr-only">{labelText}</span>}
          </div>
        </foreignObject>
        {insideBadge}
      </g>
    )
  }

  const tooltipWrapperStyle = { zIndex: 1000 }
  const tooltipContainerClass =
    "rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-slate-900 p-4 shadow-lg backdrop-blur-sm bg-opacity-100 dark:bg-opacity-100"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>Analyze spending and income by category</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-0">
        <Tabs defaultValue="expenses" className="space-y-2 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-6 md:items-center">
              {/* Pie Chart */}
              <div className="flex w-full items-center justify-center" style={{ height: pieChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart
                    margin={
                      isMobile
                        ? { top: 10, right: 20, bottom: 10, left: 20 }
                        : { top: 16, right: 36, bottom: 16, left: 36 }
                    }
                  >
                    <Pie
                      data={pieChartData}
                      cx={isMobile ? "50%" : "46%"}
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={Math.max(70, Math.min(pieChartHeight / 2 - 18, isMobile ? 110 : 140))}
                      fill="#8884d8"
                      dataKey="value"
                      minAngle={3}
                      isAnimationActive={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={tooltipWrapperStyle}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const { name, value, payload: piePayload } = payload[0]
                          const sliceColor = piePayload.color || "#94a3b8"
                          const iconName = piePayload.icon ?? piePayload.category_icon ?? null
                          const graphic = resolveCategoryGraphic(iconName, name)
                          return (
                            <div className={`${tooltipContainerClass} space-y-2`}>
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                <span
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                                  style={{
                                    boxShadow: "0 12px 24px -18px rgba(15, 23, 42, 0.45)",
                                    backgroundColor: "hsl(var(--background))",
                                    border: `2px solid ${sliceColor}`,
                                  }}
                                >
                                  {renderGraphicElement(graphic, sliceColor, "h-4 w-4")}
                                </span>
                                <span className="truncate">{name}</span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <span
                                    className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                                    style={{ backgroundColor: sliceColor }}
                                  />
                                  Total: {formatCurrency(value as number)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {piePayload?.transactions ?? 0} transactions
                                </p>
                              </div>
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
                      wrapperStyle={tooltipWrapperStyle}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const { category, category_color, total_amount, transaction_count, category_icon } =
                            payload[0].payload
                          const graphic = resolveCategoryGraphic(category_icon, category)
                          return (
                            <div className={`${tooltipContainerClass} space-y-2`}>
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                <span
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                                  style={{
                                    boxShadow: "0 12px 24px -18px rgba(15, 23, 42, 0.45)",
                                    backgroundColor: "hsl(var(--background))",
                                    border: `2px solid ${category_color || "#94a3b8"}`,
                                  }}
                                >
                                  {renderGraphicElement(graphic, category_color || "#94a3b8", "h-4 w-4")}
                                </span>
                                <span className="truncate">{category}</span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <span
                                    className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                                    style={{ backgroundColor: category_color || "#94a3b8" }}
                                  />
                                  Total: {formatCurrency(total_amount)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{transaction_count} transactions</p>
                              </div>
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
                    wrapperStyle={tooltipWrapperStyle}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { category, category_color, total_amount, transaction_count, category_icon } =
                          payload[0].payload
                        const graphic = resolveCategoryGraphic(category_icon, category)
                        return (
                          <div className={`${tooltipContainerClass} space-y-2`}>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                                style={{
                                  boxShadow: "0 12px 24px -18px rgba(15, 23, 42, 0.45)",
                                  backgroundColor: "hsl(var(--background))",
                                  border: `2px solid ${category_color || "#10b981"}`,
                                }}
                              >
                                {renderGraphicElement(graphic, category_color || "#10b981", "h-4 w-4")}
                              </span>
                              <span className="truncate">{category}</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                                  style={{ backgroundColor: category_color || "#10b981" }}
                                />
                                Total: {formatCurrency(total_amount)}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{transaction_count} transactions</p>
                            </div>
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
