"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { SupportedCurrency } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import { getCategoryLucideIcon } from "@/lib/constants/category-lucide"

export type CategoryDetailLine = {
  id: string
  description?: string | null
  counterparty?: string | null
  date: string
  displayAmount: number
}

interface CategoryDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: string | null
  color: string
  total: number
  displayCurrency: SupportedCurrency
  transactionCount: number
  shareText?: string
  transactions: CategoryDetailLine[]
}

// Keep list titles short so the amount is always visible on narrow screens.
function shortTitle(value: string, max = 22): string {
  const trimmed = value.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed
}

// An enlarged version of the chart hover popup: same idea, bigger, floating in
// the middle of the screen with the category's transaction breakdown.
export function CategoryDetailDialog({
  open,
  onOpenChange,
  category,
  color,
  total,
  displayCurrency,
  transactionCount,
  shareText,
  transactions,
}: CategoryDetailDialogProps) {
  const Icon = getCategoryLucideIcon(category ?? "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 sm:max-w-lg w-full">
        <div className="p-5 pr-12 border-b" style={{ backgroundColor: `${color}1a` }}>
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${color}33` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold leading-tight truncate">{category ?? ""}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {transactionCount} transactions{shareText ? ` · ${shareText}` : ""}
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums mt-3">
            {formatCurrency(total, displayCurrency, displayCurrency)}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {transactions.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No individual transactions available for this category in the current view.
            </p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {shortTitle(t.description || t.counterparty || "—")}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums whitespace-nowrap",
                    t.displayAmount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {formatCurrency(t.displayAmount, displayCurrency, displayCurrency)}
                </span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
