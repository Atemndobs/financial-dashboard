import { TaxPrepChecklistClient } from "@/components/tax/tax-prep-checklist-client"
import { getTaxYears } from "@/lib/data/queries"

interface TaxChecklistPageProps {
  searchParams?: Promise<{ year?: string }>
}

export default async function TaxChecklistPage({ searchParams }: TaxChecklistPageProps) {
  const availableYears = await getTaxYears()
  const params = searchParams ? await searchParams : undefined
  const parsedYear = Number.parseInt(params?.year || "", 10)
  const initialYear = Number.isNaN(parsedYear) ? undefined : parsedYear

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:p-6 space-y-6 sm:space-y-8">
        <TaxPrepChecklistClient initialYears={availableYears} initialYear={initialYear} />
      </div>
    </div>
  )
}
