import { TaxDashboardClient } from "@/components/tax/tax-dashboard-client"
import { getTaxYears } from "@/lib/data/queries"

export default async function TaxPage() {
  const availableYears = await getTaxYears()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:p-6 space-y-6 sm:space-y-8">
        <TaxDashboardClient initialYears={availableYears} />
      </div>
    </div>
  )
}
