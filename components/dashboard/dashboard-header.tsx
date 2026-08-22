"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ReceiptText, HandCoins } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { ImportPdfDialog } from "@/components/dashboard/import-pdf-dialog"

interface DashboardHeaderProps {
  showFilterToggle?: boolean
  isFiltersCollapsed?: boolean
  onToggleFilters?: () => void
  activeYear?: number | null
}

export function DashboardHeader({
  showFilterToggle = false,
  isFiltersCollapsed = false,
  onToggleFilters,
  activeYear = null,
}: DashboardHeaderProps) {
  const currentDate = new Date()

  const handleImported = () => {
    // Refresh server components / client queries after a successful import.
    setTimeout(() => {
      window.location.reload()
    }, 1200)
  }

  const shortDate = currentDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight truncate">Financial Dashboard</h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            <span className="hidden sm:inline">Last updated:</span>
            <span className="sm:hidden">Updated</span>
            <span>{shortDate}</span>
            {showFilterToggle && (
              <>
                <span className="opacity-40">·</span>
                <button
                  type="button"
                  onClick={onToggleFilters}
                  className="inline-flex items-center gap-1 font-medium text-foreground"
                  aria-label={isFiltersCollapsed ? "Show filters" : "Hide filters"}
                >
                  <span>{activeYear || "All years"}</span>
                  {isFiltersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/loans" aria-label="Loans">
              <HandCoins className="h-4 w-4" />
              <span className="hidden sm:inline">Loans</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/tax" aria-label="Tax">
              <ReceiptText className="h-4 w-4" />
              <span className="hidden sm:inline">Tax</span>
            </Link>
          </Button>
          <ImportPdfDialog onImported={handleImported} />
          <UserMenu />
        </div>
      </div>
    </div>
  )
}
