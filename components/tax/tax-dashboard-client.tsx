"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, ArrowLeft, Download, Info } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { StagedTaxEstimate } from "@/lib/tax/estimate-types"
import { ProvenanceChip } from "./provenance-chip"
import { TaxHouseholdForm } from "./tax-household-form"
import { TaxSalaryStatementImport } from "./tax-salary-statement-import"
import { TaxIncomeForm } from "./tax-income-form"
import { TaxPrepaymentsForm } from "./tax-prepayments-form"
import { TaxProfileForm } from "./tax-profile-form"
import { TaxWarningsPanel } from "./tax-warnings-panel"

interface TaxDashboardClientProps {
  initialYears: number[]
}

interface ChecklistItem {
  deduction_key: string
  label_de: string
  label_en: string
  total_amount: number
  documents: string[]
}

const CURRENT_YEAR = new Date().getFullYear()

function formatMoney(amount: number, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

async function parseApiError(response: Response) {
  try {
    const payload = await response.json()
    if (typeof payload?.error === "string") return payload.error
    if (typeof payload?.detail === "string") return payload.detail
  } catch {
    /* fall through */
  }
  return `Request failed (${response.status})`
}

export function TaxDashboardClient({ initialYears }: TaxDashboardClientProps) {
  const [availableYears, setAvailableYears] = useState<number[]>(
    initialYears.length > 0 ? initialYears : [CURRENT_YEAR],
  )
  const yearOptions = useMemo(
    () => (availableYears.length > 0 ? availableYears : [CURRENT_YEAR]),
    [availableYears],
  )

  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0].toString())
  const [estimate, setEstimate] = useState<StagedTaxEstimate | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadYears() {
      try {
        const response = await fetch("/api/tax/years", { cache: "no-store" })
        if (!response.ok) return
        const payload = await response.json()
        if (cancelled || !Array.isArray(payload.years) || payload.years.length === 0) return
        setAvailableYears([...payload.years].sort((a: number, b: number) => b - a))
      } catch {
        /* keep fallback */
      }
    }
    void loadYears()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!yearOptions.some((y) => y.toString() === selectedYear)) {
      setSelectedYear(yearOptions[0].toString())
    }
  }, [selectedYear, yearOptions])

  useEffect(() => {
    let cancelled = false
    async function loadEstimate() {
      setIsLoading(true)
      setErrorMessage(null)
      const qs = new URLSearchParams({ year: selectedYear })
      try {
        const [estRes, checkRes] = await Promise.all([
          fetch(`/api/tax/assessment?${qs}`, { cache: "no-store" }),
          fetch(`/api/tax/checklist?${qs}`, { cache: "no-store" }),
        ])
        if (!estRes.ok) throw new Error(await parseApiError(estRes))
        if (!checkRes.ok) throw new Error(await parseApiError(checkRes))
        const [estPayload, checkPayload] = await Promise.all([estRes.json(), checkRes.json()])
        if (cancelled) return
        setEstimate(estPayload as StagedTaxEstimate)
        setChecklist(Array.isArray(checkPayload) ? checkPayload : [])
      } catch (error) {
        if (cancelled) return
        setEstimate(null)
        setChecklist([])
        setErrorMessage(error instanceof Error ? error.message : "Failed to load tax estimate.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void loadEstimate()
    return () => {
      cancelled = true
    }
  }, [selectedYear, refreshToken])

  const onSaved = useCallback(() => setRefreshToken((t) => t + 1), [])
  const year = Number.parseInt(selectedYear, 10)

  const balanceCard = useMemo(() => {
    if (!estimate) return null
    const { direction, estimated_balance } = estimate.estimated_balance
    if (direction === "indeterminate") {
      return {
        title: "Estimated Balance",
        value: "—",
        caption: "Enter source tax withheld to compute balance.",
        tone: "text-muted-foreground",
      }
    }
    if (direction === "refund") {
      return {
        title: "Estimated Refund",
        value: formatMoney(Math.abs(estimated_balance), estimate.currency),
        caption: "You appear to have overpaid.",
        tone: "text-emerald-600",
      }
    }
    if (direction === "due") {
      return {
        title: "Estimated Balance Due",
        value: formatMoney(estimated_balance, estimate.currency),
        caption: "Additional amount likely owed.",
        tone: "text-amber-600",
      }
    }
    return {
      title: "Estimated Balance",
      value: formatMoney(0, estimate.currency),
      caption: "No balance.",
      tone: "text-muted-foreground",
    }
  }, [estimate])

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight truncate">Swiss Tax Estimation</h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="About this estimate"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Estimation only — not an official tax filing. Outputs reflect configurable assumptions and the
                currently supported AG/Aarau scenario.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
      </TooltipProvider>

      <Card>
        <CardContent className="flex flex-row items-end gap-2 p-3 sm:p-4">
          <div className="flex-1 min-w-0 space-y-1">
            <Label htmlFor="tax-year" className="text-xs text-muted-foreground">
              Tax Year
            </Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="tax-year" className="w-full sm:w-40">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
            <a href={`/api/tax/export/csv?year=${selectedYear}`}>
              <Download className="h-4 w-4" />
              CSV
            </a>
          </Button>
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tax data unavailable</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <TaxSalaryStatementImport year={year} onApplied={onSaved} />

      {isLoading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Loading tax estimate…</div>
      ) : estimate ? (
        <>
          <TaxWarningsPanel warnings={estimate.warnings} assumptions={estimate.assumptions} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  Gross Taxable Income
                  <ProvenanceChip source={estimate.income_breakdown.provenance} />
                </CardDescription>
                <CardTitle className="text-2xl">
                  {formatMoney(estimate.income_breakdown.gross_taxable_income, estimate.currency)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Allowed Deductions</CardDescription>
                <CardTitle className="text-2xl">
                  {formatMoney(estimate.deduction_breakdown.total_allowed, estimate.currency)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Estimated Taxable Income</CardDescription>
                <CardTitle className="text-2xl">
                  {formatMoney(estimate.estimated_taxable_income, estimate.currency)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tax Already Withheld</CardDescription>
                <CardTitle className="text-2xl">
                  {formatMoney(estimate.prepayments.total, estimate.currency)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Estimated Final Tax</CardDescription>
                <CardTitle className="text-2xl">
                  {formatMoney(estimate.estimated_final_tax.total, estimate.currency)}
                </CardTitle>
              </CardHeader>
            </Card>

            {balanceCard && (
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{balanceCard.title}</CardDescription>
                  <CardTitle className={`text-2xl ${balanceCard.tone}`}>{balanceCard.value}</CardTitle>
                  <p className="text-xs text-muted-foreground pt-1">{balanceCard.caption}</p>
                </CardHeader>
              </Card>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TaxProfileForm year={year} onSaved={onSaved} />
            <TaxIncomeForm year={year} onSaved={onSaved} />
            <TaxHouseholdForm year={year} onSaved={onSaved} />
            <TaxPrepaymentsForm year={year} onSaved={onSaved} />

            <Card>
              <CardHeader>
                <CardTitle>Estimated Final Tax Breakdown</CardTitle>
                <CardDescription>Federal + cantonal + municipal (+ church).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Federal</span><span>{formatMoney(estimate.estimated_final_tax.federal)}</span></div>
                <div className="flex justify-between"><span>Cantonal</span><span>{formatMoney(estimate.estimated_final_tax.cantonal)}</span></div>
                <div className="flex justify-between"><span>Municipal</span><span>{formatMoney(estimate.estimated_final_tax.municipal)}</span></div>
                <div className="flex justify-between"><span>Church</span><span>{formatMoney(estimate.estimated_final_tax.church)}</span></div>
                <div className="flex justify-between font-semibold pt-2 border-t"><span>Total</span><span>{formatMoney(estimate.estimated_final_tax.total)}</span></div>
                {estimate.progression_inputs.applied && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Progression: rate determined on {formatMoney(estimate.progression_inputs.rate_determining_income)} (includes spouse income {formatMoney(estimate.progression_inputs.spouse_income_chf)}).
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Allowed Deductions</CardTitle>
              <CardDescription>
                {estimate.deduction_breakdown.items.length} categories • total allowed{" "}
                {formatMoney(estimate.deduction_breakdown.total_allowed, estimate.currency)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Deductible</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimate.deduction_breakdown.items.map((d) => (
                    <TableRow key={d.key}>
                      <TableCell>
                        <div className="font-medium">{d.label_en}</div>
                        <div className="text-xs text-muted-foreground">{d.label_de}</div>
                      </TableCell>
                      <TableCell>{formatMoney(d.total_detected, estimate.currency)}</TableCell>
                      <TableCell>{formatMoney(d.deductible_amount, estimate.currency)}</TableCell>
                      <TableCell className="text-xs">{d.limit_info}</TableCell>
                      <TableCell>{d.transaction_count}</TableCell>
                      <TableCell>
                        <Badge variant={d.over_limit ? "destructive" : "secondary"}>
                          {d.over_limit ? "Over limit" : "Within limit"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informational Expenses</CardTitle>
              <CardDescription>
                Non-deductible spend — {formatMoney(estimate.informational_non_deductible_total, estimate.currency)}.
                These do NOT affect the estimated balance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">Show details</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
                  <p>
                    Informational expenses are shown separately to avoid being mistaken for tax-affecting amounts. See
                    your transactions list for the underlying entries.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Checklist</CardTitle>
              <CardDescription>Collect these documents before filing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checklist items for this year.</p>
              ) : (
                checklist.map((item) => (
                  <div key={item.deduction_key} className="rounded-md border p-3">
                    <p className="font-medium">
                      {item.label_en} {item.total_amount > 0 && `(${formatMoney(item.total_amount)})`}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">{item.label_de}</p>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {item.documents.map((doc) => (
                        <li key={doc}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engine metadata</CardTitle>
              <CardDescription>
                Engine {estimate.engine_version} · Rules {estimate.rule_version}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {estimate.provenance_summary.map((p) => (
                  <div key={p.field} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{p.field}:</span>
                    <ProvenanceChip source={p.source} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No tax data found for {selectedYear}.
        </div>
      )}
    </div>
  )
}
