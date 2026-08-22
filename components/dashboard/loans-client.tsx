"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, HandCoins, HeartHandshake } from "lucide-react"
import { cn } from "@/lib/utils"

// Loans are EUR-denominated; the ledger stores CHF, so convert at an approximate
// rate for the EUR balances. CHF figures come straight from live data.
const CHF_PER_EUR = 0.93
const ANCHEN = "#EF6C00"
const JULIANE = "#7C3AED"

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-US")

function monthName(offset: number) {
  // offset = number of payments; 1 => the first upcoming month
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}
function yearsLabel(m: number) {
  if (!isFinite(m)) return "never"
  const y = m / 12
  return y < 1 ? `${m} mo` : y % 1 < 0.08 ? `${Math.round(y)} yr` : `${y.toFixed(1)} yr`
}

interface LoansClientProps {
  anchenPaidChf: number
  julianePaidChf: number
  familyFundChf: number
  anchenLoanCount: number
  julianeLoanCount: number
}

export function LoansClient({
  anchenPaidChf,
  julianePaidChf,
  familyFundChf,
  anchenLoanCount,
  julianeLoanCount,
}: LoansClientProps) {
  const loans = {
    a: { name: "Anchen", principal: 20000, paidChf: anchenPaidChf, color: ANCHEN, count: anchenLoanCount },
    j: { name: "Juliane", principal: 70000, paidChf: julianePaidChf, color: JULIANE, count: julianeLoanCount },
  }
  const aRem = Math.max(0, Math.round(loans.a.principal - loans.a.paidChf / CHF_PER_EUR))
  const jRem = Math.max(0, Math.round(loans.j.principal - loans.j.paidChf / CHF_PER_EUR))

  const [payA, setPayA] = useState(1000)
  const [payJ, setPayJ] = useState(662)
  const [strategy, setStrategy] = useState<"indep" | "snow">("indep")
  const [targetMonths, setTargetMonths] = useState(36)

  function simulate(pA: number, pJ: number, strat: "indep" | "snow") {
    let a = aRem
    let j = jRem
    const A = [a]
    const J = [j]
    let aDone = 0
    let jDone = 0
    let m = 0
    while ((a > 0 || j > 0) && m < 1200) {
      m++
      if (strat === "snow") {
        let budget = pA + pJ
        const order = a > 0 && (a <= j || j <= 0) ? (["a", "j"] as const) : (["j", "a"] as const)
        for (const k of order) {
          if (budget <= 0) break
          if (k === "a" && a > 0) {
            const p = Math.min(budget, a)
            a -= p
            budget -= p
          }
          if (k === "j" && j > 0) {
            const p = Math.min(budget, j)
            j -= p
            budget -= p
          }
        }
      } else {
        if (a > 0) a = Math.max(0, a - pA)
        if (j > 0) j = Math.max(0, j - pJ)
      }
      A.push(a)
      J.push(j)
      if (a <= 0 && !aDone) aDone = m
      if (j <= 0 && !jDone) jDone = m
    }
    return { A, J, aMonths: a <= 0 ? aDone : Infinity, jMonths: j <= 0 ? jDone : Infinity }
  }

  const sim = simulate(payA, payJ, strategy)
  const indep = simulate(payA, payJ, "indep")
  const snow = simulate(payA, payJ, "snow")
  const debtFree = Math.max(sim.aMonths, sim.jMonths)
  const iDone = Math.max(indep.aMonths, indep.jMonths)
  const sDone = Math.max(snow.aMonths, snow.jMonths)
  const requiredPerMonth = Math.ceil((aRem + jRem) / targetMonths / 10) * 10

  const totalRem = aRem + jRem
  const totalPaidChf = loans.a.paidChf + loans.j.paidChf

  // chart geometry
  const W = 880
  const H = 240
  const pl = 52
  const pr = 14
  const pt = 12
  const pb = 26
  const n = sim.A.length
  const maxY = Math.max(jRem, aRem, 1)
  const xMax = Math.max(n - 1, 1)
  const X = (i: number) => pl + (i / xMax) * (W - pl - pr)
  const Y = (v: number) => pt + (1 - v / maxY) * (H - pt - pb)
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ")

  function payoffLine(months: number) {
    if (!isFinite(months))
      return <span className="text-rose-600 dark:text-rose-400">Never — increase the payment</span>
    return (
      <span>
        Paid off <span className="font-semibold tabular-nums">{monthName(months)}</span>
        <span className="text-muted-foreground"> · {yearsLabel(months)}</span>
      </span>
    )
  }

  const loanCard = (
    key: "a" | "j",
    rem: number,
    pay: number,
    setPay: (n: number) => void,
    months: number,
  ) => {
    const L = loans[key]
    const pct = Math.round((L.paidChf / CHF_PER_EUR / L.principal) * 100)
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: L.color }} />
            <span className="font-semibold">{L.name}</span>
            <span className="text-xs text-muted-foreground">was {eur(L.principal)} · {L.count} payments</span>
          </div>
          <div className="text-3xl font-bold tabular-nums">{eur(rem)}</div>
          <div className="text-xs text-muted-foreground -mt-2">still owed (approx.)</div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: L.color }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Repaid CHF {L.paidChf.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <label className="block text-sm text-muted-foreground pt-2">
            <span className="flex justify-between">
              Monthly payment
              <span className="font-semibold tabular-nums text-foreground">{eur(pay)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={6000}
              step={50}
              value={pay}
              onChange={(e) => setPay(Number(e.target.value))}
              className="w-full mt-2"
              style={{ accentColor: L.color }}
            />
          </label>
          <div className="text-sm pt-1">{payoffLine(months)}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Loan Payoff</h1>
          <p className="text-sm text-muted-foreground">Two interest-free personal loans · balances update from your live data</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
          <Link href="/" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </Button>
      </div>

      {/* Verdict */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">At the current plan</p>
          <div className="text-2xl sm:text-3xl font-bold mt-1">
            {isFinite(debtFree) ? (
              <>
                Debt-free by <span className="text-emerald-600 dark:text-emerald-400">{monthName(debtFree)}</span>
                <span className="text-base font-medium text-muted-foreground"> · {yearsLabel(debtFree)} from now</span>
              </>
            ) : (
              <span className="text-rose-600 dark:text-rose-400">Not on track — raise a payment</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 border-t pt-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Still owed</div>
              <div className="text-xl font-semibold tabular-nums">{eur(totalRem)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Repaid so far</div>
              <div className="text-xl font-semibold tabular-nums">CHF {totalPaidChf.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">To loans / month</div>
              <div className="text-xl font-semibold tabular-nums">{eur(payA + payJ)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {loanCard("a", aRem, payA, setPayA, sim.aMonths)}
        {loanCard("j", jRem, payJ, setPayJ, sim.jMonths)}
      </div>

      {/* Target-date solver */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hit a target date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block text-sm text-muted-foreground">
            <span className="flex justify-between">
              Debt-free in
              <span className="font-semibold text-foreground">
                {targetMonths < 12 ? `${targetMonths} mo` : `${(targetMonths / 12).toFixed(1)} yr`}
              </span>
            </span>
            <input
              type="range"
              min={6}
              max={120}
              step={3}
              value={targetMonths}
              onChange={(e) => setTargetMonths(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-600"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Target date</div>
              <div className="text-xl font-semibold tabular-nums">{monthName(targetMonths)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Required / month</div>
              <div className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{eur(requiredPerMonth)}</div>
            </div>
          </div>
          <Button
            onClick={() => {
              const pa = Math.min(6000, Math.round((requiredPerMonth * aRem) / totalRem / 10) * 10)
              setPayA(pa)
              setPayJ(Math.min(6000, requiredPerMonth - pa))
              setStrategy("snow")
            }}
          >
            Apply to the plan
          </Button>
        </CardContent>
      </Card>

      {/* Strategy + chart */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">How payments are applied</CardTitle>
          <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
            {(["indep", "snow"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                aria-pressed={strategy === s}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  strategy === s ? "bg-background shadow font-semibold" : "text-muted-foreground",
                )}
              >
                {s === "indep" ? "Independent" : "Snowball"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {strategy === "snow"
              ? `Combined ${eur(payA + payJ)}/mo aimed at the smaller balance first, then rolled onto the other.${
                  isFinite(iDone) && isFinite(sDone) && iDone - sDone > 0
                    ? ` Debt-free ${iDone - sDone} months sooner than paying them independently.`
                    : ""
                }`
              : `Each loan is paid on its own slider. Switch to Snowball to pool ${eur(payA + payJ)}/mo and clear the smaller loan first.`}
          </p>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Loan balances over time">
              {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                const g = maxY * f
                return (
                  <g key={f}>
                    <line x1={pl} y1={Y(g)} x2={W - pr} y2={Y(g)} className="stroke-border" strokeWidth={1} />
                    <text x={pl - 6} y={Y(g) + 3} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
                      €{Math.round(g / 1000)}k
                    </text>
                  </g>
                )
              })}
              {isFinite(sim.aMonths) && (
                <line x1={X(sim.aMonths)} y1={pt} x2={X(sim.aMonths)} y2={H - pb} stroke={ANCHEN} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              )}
              {isFinite(sim.jMonths) && (
                <line x1={X(sim.jMonths)} y1={pt} x2={X(sim.jMonths)} y2={H - pb} stroke={JULIANE} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              )}
              <path d={path(sim.J)} fill="none" stroke={JULIANE} strokeWidth={2.5} strokeLinejoin="round" />
              <path d={path(sim.A)} fill="none" stroke={ANCHEN} strokeWidth={2.5} strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 rounded" style={{ backgroundColor: ANCHEN }} />Anchen</span>
            <span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 rounded" style={{ backgroundColor: JULIANE }} />Juliane</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 text-sm text-muted-foreground">
        <HandCoins className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          0% interest, constant monthly payments. Balances are each loan minus repayments recorded in the Loan repayment
          category, converted to EUR at ~{CHF_PER_EUR} CHF/EUR (approximate). The <HeartHandshake className="inline h-3.5 w-3.5" />{" "}
          Family Fund (CHF {familyFundChf.toLocaleString("en-US", { maximumFractionDigits: 0 })} to date — USD 1,000/mo Jan–Jul,
          USD 500 from August) is taken off Esther's transfer first; the rest pays her loan.
        </p>
      </div>
    </div>
  )
}
