import { getTransactions } from "@/lib/data/queries"
import { LoansClient } from "@/components/dashboard/loans-client"

// Recipient markers embedded in the bank description.
const ANCHEN = "pascalkehre"
const JULIANE = "de89120300001068947843"

export default async function LoansPage() {
  const txs = await getTransactions(
    { year: null, account: null, includeTransfers: true, includeSavings: true },
  )

  const text = (t: (typeof txs)[number]) => `${t.counterparty ?? ""} ${t.description ?? ""}`.toLowerCase()
  const loan = txs.filter((t) => t.category === "Loan repayment")
  const anchen = loan.filter((t) => text(t).includes(ANCHEN))
  const juliane = loan.filter((t) => text(t).includes(JULIANE))
  const sumChf = (list: typeof loan) => list.reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:p-6">
        <LoansClient
          anchenPaidChf={sumChf(anchen)}
          julianePaidChf={sumChf(juliane)}
          familyFundChf={sumChf(txs.filter((t) => t.category === "Family Fund"))}
          anchenLoanCount={anchen.length}
          julianeLoanCount={juliane.length}
        />
      </div>
    </div>
  )
}
