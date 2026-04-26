"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PrepaymentsInput } from "@/lib/tax/estimate-types"

const EMPTY: PrepaymentsInput = {
  source_tax_withheld: null,
  cantonal_prepayments: null,
  federal_prepayments: null,
  foreign_tax_credits: null,
  installment_payments: null,
  evidence_reference: null,
}

function numberOrNull(v: string): number | null {
  if (v === "") return null
  const n = Number.parseFloat(v)
  return Number.isNaN(n) ? null : n
}

export function TaxPrepaymentsForm({ year, onSaved }: { year: number; onSaved?: () => void }) {
  const [data, setData] = useState<PrepaymentsInput>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/tax/prepayments?year=${year}`, { cache: "no-store" })
        if (!res.ok) return
        const payload = await res.json()
        if (cancelled) return
        if (payload.prepayments) setData({ ...EMPTY, ...payload.prepayments })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [year])

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/tax/prepayments?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const fields: Array<[keyof PrepaymentsInput, string]> = [
    ["source_tax_withheld", "Source Tax Withheld (Quellensteuer)"],
    ["cantonal_prepayments", "Cantonal Prepayments"],
    ["federal_prepayments", "Federal Prepayments"],
    ["foreign_tax_credits", "Foreign Tax Credits"],
    ["installment_payments", "Installment Payments"],
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxes Already Withheld / Prepaid</CardTitle>
        <CardDescription>Required for final balance calculation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([k, label]) => (
              <div key={k} className="space-y-2">
                <Label htmlFor={k}>{label}</Label>
                <Input
                  id={k}
                  type="number"
                  step="0.01"
                  value={data[k] === null ? "" : String(data[k])}
                  onChange={(e) => setData({ ...data, [k]: numberOrNull(e.target.value) })}
                />
              </div>
            ))}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="evidence">Evidence reference (payslip file, statement ID)</Label>
              <Input
                id="evidence"
                value={data.evidence_reference ?? ""}
                onChange={(e) => setData({ ...data, evidence_reference: e.target.value || null })}
              />
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
