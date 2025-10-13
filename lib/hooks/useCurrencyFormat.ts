"use client"

import { useCurrency } from "@/lib/currency-context"

export function useCurrencyFormat() {
  const { currency, convertAmount } = useCurrency()

  const formatCurrency = (amount: number, fromCurrency: "CHF" | "EUR" | "USD" = "CHF"): string => {
    const convertedAmount = convertAmount(amount, fromCurrency)

    return new Intl.NumberFormat("en-CH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedAmount)
  }

  return { formatCurrency, currency }
}
