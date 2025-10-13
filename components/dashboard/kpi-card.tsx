"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from "lucide-react"
import { formatPercent } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import { useCurrencyFormat } from "@/lib/hooks/useCurrencyFormat"

interface KPICardProps {
  title: string
  value: number
  isCurrency?: boolean
  isPercentage?: boolean
  trend?: "up" | "down" | "neutral"
  subtitle?: string
  icon?: React.ReactNode
  variant?: "default" | "income" | "expense" | "savings"
  className?: string
}

export function KPICard({
  title,
  value,
  isCurrency = false,
  isPercentage = false,
  trend,
  subtitle,
  icon,
  variant = "default",
  className,
}: KPICardProps) {
  const { formatCurrency } = useCurrencyFormat()

  const formattedValue = isCurrency
    ? formatCurrency(value)
    : isPercentage
      ? formatPercent(value)
      : value.toLocaleString()

  const variantStyles = {
    default: "bg-card",
    income: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900",
    expense: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900",
    savings: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
  }

  return (
    <Card className={cn("overflow-hidden", variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground hidden sm:block">{icon}</div>}
      </CardHeader>
      <CardContent className="pb-3 sm:pb-6">
        <div className="flex items-baseline gap-1 sm:gap-2">
          <div className="text-xl sm:text-3xl font-bold tracking-tight">{formattedValue}</div>
          {trend && (
            <div
              className={cn("flex items-center text-xs sm:text-sm font-medium", {
                "text-emerald-600 dark:text-emerald-400": trend === "up",
                "text-rose-600 dark:text-rose-400": trend === "down",
                "text-muted-foreground": trend === "neutral",
              })}
            >
              {trend === "up" && <ArrowUpIcon className="h-3 w-3 sm:h-4 sm:w-4" />}
              {trend === "down" && <ArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4" />}
              {trend === "neutral" && <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4" />}
            </div>
          )}
        </div>
        {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
