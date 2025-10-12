export interface Transaction {
  id: string
  transaction_id: string
  date: string
  account: string
  counterparty: string | null
  description: string | null
  amount: number
  currency: string
  category: string
  sub_category: string | null
  type: string | null
  is_expense: boolean
  abs_amount: number
  exclude_from_spending: boolean
  user_excluded: boolean
  year: number
  month: number
  month_label: string
  category_color?: string
  category_icon?: string
}

export interface Category {
  id: number
  name: string
  type: string
  description: string | null
  color: string
  icon: string | null
  is_active: boolean
  sort_order: number
}

export interface MonthlyStats {
  account: string
  year: number
  month: number
  month_label: string
  total_income: number
  total_expense: number
  net: number
  savings_rate: number
  transaction_count: number
  expense_count: number
  income_count: number
}

export interface CategoryStats {
  category: string
  year: number
  month: number
  month_label: string
  type: string
  total_amount: number
  transaction_count: number
  avg_amount: number
  min_amount: number
  max_amount: number
  category_color: string | null
  category_icon: string | null
}

export interface YearlySummary {
  year: number
  total_income: number
  total_expense: number
  net_savings: number
  savings_rate: number
  transaction_count: number
  account_count: number
  category_count: number
  avg_monthly_income: number
  avg_monthly_expense: number
}

export interface FilterState {
  year: number | null
  account: string | null
  includeTransfers: boolean
  includeSavings: boolean
}
