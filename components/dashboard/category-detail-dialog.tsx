"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { SupportedCurrency } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

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
  icon: string
  color: string
  total: number
  displayCurrency: SupportedCurrency
  transactionCount: number
  shareText?: string
  transactions: CategoryDetailLine[]
}

// An enlarged version of the chart hover popup: same idea, bigger, floating in
// the middle of the screen with the category's transaction breakdown.
export function CategoryDetailDialog({
  open,
  onOpenChange,
  category,
  icon,
  color,
  total,
  displayCurrency,
  transactionCount,
  shareText,
  transactions,
}: CategoryDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 sm:max-w-xl w-full">
        <div className="flex items-start justify-between gap-4 p-5 border-b" style={{ backgroundColor: `${color}1a` }}>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${color}33` }}
            >
              {icon}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold leading-tight">{category ?? ""}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {transactionCount} transactions{shareText ? ` · ${shareText}` : ""}
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums pr-6">
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
              <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-accent/50">
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
      </DialogContent>
    </Dialog>
  )
}
