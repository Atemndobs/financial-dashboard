import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { getAvailableYears, getAvailableAccounts } from "@/lib/data/queries"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function Home() {
  const [availableYears, availableAccounts] = await Promise.all([getAvailableYears(), getAvailableAccounts()])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-8">
        <DashboardHeader />
        <DashboardClient availableYears={availableYears} availableAccounts={availableAccounts} />
      </div>
    </div>
  )
}
