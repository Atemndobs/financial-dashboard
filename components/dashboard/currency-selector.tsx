"use client"

import { useCurrency } from "@/lib/currency-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Currency = "CHF" | "EUR" | "USD"

export function CurrencySelector() {
  const { currency, setCurrency, isLoading, lastUpdate, refreshRates } = useCurrency()

  return (
    <div className="flex items-center gap-2">
      <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
        <SelectTrigger className="h-10 w-[85px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CHF">CHF</SelectItem>
          <SelectItem value="EUR">EUR</SelectItem>
          <SelectItem value="USD">USD</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={refreshRates}
        disabled={isLoading}
        title="Refresh exchange rates"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      </Button>

      {lastUpdate && (
        <span className="text-xs text-muted-foreground hidden lg:inline whitespace-nowrap">
          {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
