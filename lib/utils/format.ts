export function formatCurrency(amount: number, currency = "CHF"): string {
  return new Intl.NumberFormat("en-CH", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
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
