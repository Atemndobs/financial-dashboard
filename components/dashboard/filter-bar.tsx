"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeftRight, PiggyBank } from "lucide-react"
import type { FilterState } from "@/lib/types"

interface FilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableYears: number[]
  availableAccounts: string[]
}

export function FilterBar({ filters, onFiltersChange, availableYears, availableAccounts }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 bg-card rounded-lg border">
      <div className="flex flex-wrap items-center gap-2">
        {/* Year Filter */}
        <div className="flex flex-col gap-1 min-w-[100px]">
          <Label className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">Year</Label>
          <Select
            value={filters.year?.toString() || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                year: value === "all" ? null : Number.parseInt(value),
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Account Filter */}
        <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-none">
          <Label className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">Account</Label>
          <Select
            value={filters.account || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                account: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {availableAccounts.map((account) => (
                <SelectItem key={account} value={account}>
                  {account}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Filters - Icon only on mobile */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant={filters.includeTransfers ? "default" : "outline"}
            size="sm"
            onClick={() =>
              onFiltersChange({
                ...filters,
                includeTransfers: !filters.includeTransfers,
              })
            }
            className="h-9 px-2 sm:px-3"
            title="Include Transfers"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Transfers</span>
          </Button>

          <Button
            variant={filters.includeSavings ? "default" : "outline"}
            size="sm"
            onClick={() =>
              onFiltersChange({
                ...filters,
                includeSavings: !filters.includeSavings,
              })
            }
            className="h-9 px-2 sm:px-3"
            title="Include Savings"
          >
            <PiggyBank className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Savings</span>
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.year || filters.account || !filters.includeTransfers || !filters.includeSavings) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filters.year && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{filters.year}</span>
          )}
          {filters.account && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{filters.account}</span>
          )}
          {!filters.includeTransfers && (
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">Transfers excluded</span>
          )}
          {!filters.includeSavings && (
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">Savings excluded</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() =>
              onFiltersChange({
                year: null,
                account: null,
                includeTransfers: true,
                includeSavings: true,
              })
            }
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
