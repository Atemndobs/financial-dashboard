import type { SupportedCurrency } from "@/lib/types"

const BASE_CURRENCY: SupportedCurrency = "CHF"

// Approximate conversion rates from CHF, used for client-side display conversion.
const RATE_FROM_CHF: Record<SupportedCurrency, number> = {
  CHF: 1,
  EUR: 1.04,
  USD: 1.14,
}

const LOCALE_BY_CURRENCY: Record<SupportedCurrency, string> = {
  CHF: "de-CH",
  EUR: "de-DE",
  USD: "en-US",
}

export function convertAmount(
  amount: number,
  targetCurrency: SupportedCurrency = BASE_CURRENCY,
  sourceCurrency: SupportedCurrency = BASE_CURRENCY,
): number {
  if (targetCurrency === sourceCurrency) {
    return amount
  }

  const sourceRate = RATE_FROM_CHF[sourceCurrency] || 1
  const targetRate = RATE_FROM_CHF[targetCurrency] || 1
  const amountInChf = amount / sourceRate

  return amountInChf * targetRate
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = BASE_CURRENCY,
  sourceCurrency: SupportedCurrency = BASE_CURRENCY,
): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertAmount(amount, currency, sourceCurrency))
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatMonthLabel(monthLabel: string): string {
  const [year, month] = monthLabel.split("-")
  const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  })
}

export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1)
  return date.toLocaleDateString("en-US", { month: "long" })
}
