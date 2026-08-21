import { KPICard } from "./kpi-card"
import { TrendingUpIcon, TrendingDownIcon, WalletIcon, PiggyBankIcon } from "lucide-react"
import type { YearlySummary, SupportedCurrency } from "@/lib/types"

interface YearlyKPIsProps {
  summary: YearlySummary | null
  displayCurrency: SupportedCurrency
}

export function YearlyKPIs({ summary, displayCurrency }: YearlyKPIsProps) {
  if (!summary) {
    return (
      <div className="text-center text-muted-foreground py-12 border rounded-lg">
        No data available for the selected filters
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Yearly Overview</h2>
        <p className="text-muted-foreground">Key financial metrics for {summary.year}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Income"
          value={summary.total_income}
          isCurrency
          variant="income"
          icon={<TrendingUpIcon className="h-4 w-4" />}
          subtitle={`${summary.transaction_count} transactions`}
          currency={displayCurrency}
        />

        <KPICard
          title="Total Expenses"
          value={summary.total_expense}
          isCurrency
          variant="expense"
          icon={<TrendingDownIcon className="h-4 w-4" />}
          subtitle={`Across ${summary.category_count} categories`}
          currency={displayCurrency}
        />

        <KPICard
          title="Net Savings"
          value={summary.net_savings}
          isCurrency
          variant="savings"
          icon={<PiggyBankIcon className="h-4 w-4" />}
          trend={summary.net_savings > 0 ? "up" : summary.net_savings < 0 ? "down" : "neutral"}
          subtitle="Incl. investments & funds"
          currency={displayCurrency}
        />

        <KPICard
          title="Savings Rate"
          value={summary.savings_rate}
          isPercentage
          variant="default"
          icon={<WalletIcon className="h-4 w-4" />}
          subtitle="Saved + invested / income"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard
          title="Avg Monthly Income"
          value={summary.avg_monthly_income}
          isCurrency
          subtitle="Average per month"
          currency={displayCurrency}
        />

        <KPICard
          title="Avg Monthly Expense"
          value={summary.avg_monthly_expense}
          isCurrency
          subtitle="Average per month"
          currency={displayCurrency}
        />
      </div>
    </div>
  )
}
