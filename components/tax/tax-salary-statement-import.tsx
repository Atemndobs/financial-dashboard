"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FileUp, Sparkles, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ForeignIncomeRecord } from "@/lib/tax/estimate-types"
import type { LohnsteuerbescheinigungParsed } from "@/lib/tax/parsers/lohnsteuerbescheinigung"
import type { LohnausweisChParsed } from "@/lib/tax/parsers/lohnausweis-ch"

type AnyParsed = LohnsteuerbescheinigungParsed | LohnausweisChParsed

const DEFAULT_FX = 0.95

function isSwiss(p: AnyParsed | null): p is LohnausweisChParsed {
  return p?.document_type === "ch_lohnausweis"
}

function formatEur(n: number | null) {
  if (n === null || n === undefined) return "—"
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n)
}

function formatChf(n: number | null) {
  if (n === null || n === undefined) return "—"
  return new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(n)
}

export function TaxSalaryStatementImport({ year, onApplied }: { year: number; onApplied?: () => void }) {
  const [items, setItems] = useState<(ForeignIncomeRecord & { _id: string })[]>([])
  const [parsing, setParsing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState<AnyParsed | null>(null)
  const [advisory, setAdvisory] = useState<string[]>([])
  const [fxRate, setFxRate] = useState<number>(DEFAULT_FX)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tax/foreign-income?year=${year}`, { cache: "no-store" })
      if (!res.ok) return
      const payload = await res.json()
      setItems(payload.items ?? [])
    } catch {
      /* noop */
    }
  }, [year])

  useEffect(() => {
    void load()
  }, [load])

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(null)
    setParsing(true)
    setPreview(null)
    setAdvisory([])
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`/api/tax/import/lohnsteuerbescheinigung?year=${year}&action=parse`, {
        method: "POST",
        body: form,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || "Parse failed")
      setPreview(payload.parsed)
      setAdvisory(payload.advisory ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed")
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function apply() {
    if (!preview) return
    setApplying(true)
    setError(null)
    setSuccess(null)
    try {
      const body = isSwiss(preview)
        ? { parsed: preview, populate_profile_defaults: true }
        : { parsed: preview, fx_rate: fxRate, populate_profile_defaults: true }
      const res = await fetch(`/api/tax/import/lohnsteuerbescheinigung?year=${year}&action=apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || "Apply failed")
      const fxNote = payload.applied?.fx_rate ? ` at FX ${payload.applied.fx_rate}` : ""
      setSuccess(
        `Applied. Gross ${formatChf(payload.applied?.gross_chf ?? null)}, source tax withheld ${formatChf(payload.applied?.source_tax_withheld_chf ?? null)}${fxNote}.`,
      )
      setPreview(null)
      setAdvisory([])
      await load()
      onApplied?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed")
    } finally {
      setApplying(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      const res = await fetch(`/api/tax/foreign-income?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      await load()
      onApplied?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    }
  }

  const swiss = isSwiss(preview) ? preview : null
  const german = preview && !isSwiss(preview) ? preview : null
  const grossEur = german?.gross_salary_eur ?? null
  const withheldEur =
    (german?.wage_tax_eur ?? 0) +
    (german?.solidarity_surcharge_eur ?? 0) +
    (german?.church_tax_eur ?? 0)

  return (
    <Card className="border-primary/40 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Import Annual Salary Statement</CardTitle>
        </div>
        <CardDescription>
          Upload your yearly Lohnsteuerbescheinigung / salary certificate. We'll pre-fill your profile, income, and
          withholding for {year} in one click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertTitle>Imported</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!preview && (
          <div className="flex flex-col items-start gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              type="button"
              size="lg"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
            >
              <FileUp className="h-4 w-4" />
              {parsing ? "Parsing…" : "Upload salary statement (PDF)"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Supports Swiss Lohnausweis (CHF-native) and German electronic Lohnsteuerbescheinigung
              (EUR, auto-converted).
            </p>
          </div>
        )}

        {preview && (
          <div className="rounded-md border p-4 space-y-3 bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">Preview</p>
                <p className="text-xs text-muted-foreground">
                  {preview.employer.name ?? "Unknown employer"} · {preview.period_start ?? "?"} to{" "}
                  {preview.period_end ?? "?"}
                </p>
              </div>
              <Badge variant="secondary">{swiss ? "CH · CHF" : "DE · EUR"}</Badge>
            </div>

            {swiss ? (
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Base salary (Ziffer 1)</dt>
                <dd className="text-right">{formatChf(swiss.base_salary_chf)}</dd>
                {swiss.irregular_payments_chf ? (
                  <>
                    <dt className="text-muted-foreground">Irregular (Ziffer 3)</dt>
                    <dd className="text-right">{formatChf(swiss.irregular_payments_chf)}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground font-medium pt-1">Gross total (Ziffer 8)</dt>
                <dd className="text-right font-medium pt-1">{formatChf(swiss.gross_salary_chf)}</dd>
                <dt className="text-muted-foreground">AHV/IV/EO/ALV/NBUV (Ziffer 9)</dt>
                <dd className="text-right">− {formatChf(swiss.social_contributions_chf)}</dd>
                <dt className="text-muted-foreground">BVG 2nd pillar (Ziffer 10.1)</dt>
                <dd className="text-right">− {formatChf(swiss.bvg_ordinary_chf)}</dd>
                {swiss.bvg_buyback_chf ? (
                  <>
                    <dt className="text-muted-foreground">BVG buyback (Ziffer 10.2)</dt>
                    <dd className="text-right">− {formatChf(swiss.bvg_buyback_chf)}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">Net salary (Ziffer 11)</dt>
                <dd className="text-right">{formatChf(swiss.net_salary_chf)}</dd>
                <dt className="text-muted-foreground font-medium pt-1">
                  Source tax withheld (Ziffer 12)
                </dt>
                <dd className="text-right font-medium pt-1">
                  {formatChf(swiss.source_tax_withheld_chf)}
                </dd>
              </dl>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Gross (Bruttoarbeitslohn)</dt>
                  <dd className="text-right">{formatEur(grossEur)}</dd>
                  <dt className="text-muted-foreground">Wage tax (Lohnsteuer)</dt>
                  <dd className="text-right">{formatEur(german?.wage_tax_eur ?? null)}</dd>
                  <dt className="text-muted-foreground">Solidarity surcharge</dt>
                  <dd className="text-right">
                    {formatEur(german?.solidarity_surcharge_eur ?? null)}
                  </dd>
                  <dt className="text-muted-foreground">Church tax</dt>
                  <dd className="text-right">{formatEur(german?.church_tax_eur ?? null)}</dd>
                  <dt className="text-muted-foreground font-medium pt-1">Total withheld</dt>
                  <dd className="text-right font-medium pt-1">{formatEur(withheldEur)}</dd>
                </dl>

                <div className="grid gap-3 sm:grid-cols-2 items-end pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="fx">EUR → CHF rate</Label>
                    <Input
                      id="fx"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={fxRate}
                      onChange={(e) => {
                        const n = Number.parseFloat(e.target.value)
                        setFxRate(Number.isNaN(n) ? 0 : n)
                      }}
                    />
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Converted:</p>
                    <p>Gross {formatChf(grossEur !== null ? grossEur * fxRate : null)}</p>
                    <p>Withheld {formatChf(withheldEur ? withheldEur * fxRate : null)}</p>
                  </div>
                </div>
              </>
            )}

            {advisory.length > 0 && (
              <Alert>
                <AlertTitle>Advisory</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {advisory.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreview(null)} disabled={applying}>
                Cancel
              </Button>
              <Button onClick={apply} disabled={applying}>
                {applying ? "Applying…" : "Apply & populate forms"}
              </Button>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Imported statements</p>
            {items.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div className="space-y-0.5">
                  <p className="font-medium">
                    {item.country} · {formatEur(item.gross_amount)} {item.currency}
                    {item.foreign_tax_paid ? ` · withheld ${formatEur(item.foreign_tax_paid)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.period_start ?? "?"} – {item.period_end ?? "?"}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(item._id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
