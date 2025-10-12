"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { FilterState } from "@/lib/types"

interface FilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableYears: number[]
  availableAccounts: string[]
}

export function FilterBar({ filters, onFiltersChange, availableYears, availableAccounts }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 p-6 bg-card rounded-lg border">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Year Filter */}
          <div className="flex flex-col gap-2 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Year</Label>
            <Select
              value={filters.year?.toString() || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  year: value === "all" ? null : Number.parseInt(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All years" />
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
          <div className="flex flex-col gap-2 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">Account</Label>
            <Select
              value={filters.account || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  account: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All accounts" />
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
        </div>

        {/* Toggle Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="include-transfers"
              checked={filters.includeTransfers}
              onCheckedChange={(checked) =>
                onFiltersChange({
                  ...filters,
                  includeTransfers: checked,
                })
              }
            />
            <Label htmlFor="include-transfers" className="text-sm cursor-pointer">
              Include Transfers
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="include-savings"
              checked={filters.includeSavings}
              onCheckedChange={(checked) =>
                onFiltersChange({
                  ...filters,
                  includeSavings: checked,
                })
              }
            />
            <Label htmlFor="include-savings" className="text-sm cursor-pointer">
              Include Savings
            </Label>
          </div>
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
