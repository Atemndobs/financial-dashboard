"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { HouseholdContextInput } from "@/lib/tax/estimate-types"

const EMPTY: HouseholdContextInput = {
  spouse_income_country: null,
  spouse_income_currency: null,
  spouse_income_amount: null,
  spouse_income_exchange_rate: null,
  spouse_income_chf: null,
  progression_notes: null,
}

function numberOrNull(v: string): number | null {
  if (v === "") return null
  const n = Number.parseFloat(v)
  return Number.isNaN(n) ? null : n
}

export function TaxHouseholdForm({ year, onSaved }: { year: number; onSaved?: () => void }) {
  const [data, setData] = useState<HouseholdContextInput>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/tax/household?year=${year}`, { cache: "no-store" })
        if (!res.ok) return
        const payload = await res.json()
        if (cancelled) return
        if (payload.household) setData({ ...EMPTY, ...payload.household })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [year])

  const derivedChf = useMemo(() => {
    if (data.spouse_income_chf !== null) return data.spouse_income_chf
    if (data.spouse_income_amount !== null && data.spouse_income_exchange_rate !== null) {
      return data.spouse_income_amount * data.spouse_income_exchange_rate
    }
    return null
  }, [data])

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/tax/household?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, spouse_income_chf: derivedChf }),
      })
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spouse Income (Progression)</CardTitle>
        <CardDescription>
          For married filers with spouse abroad. Used for rate determination only — not added to Swiss taxable income.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={data.spouse_income_country ?? ""}
                onChange={(e) => setData({ ...data, spouse_income_country: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                placeholder="EUR"
                value={data.spouse_income_currency ?? ""}
                onChange={(e) => setData({ ...data, spouse_income_currency: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (foreign)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={data.spouse_income_amount === null ? "" : String(data.spouse_income_amount)}
                onChange={(e) => setData({ ...data, spouse_income_amount: numberOrNull(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Exchange rate to CHF</Label>
              <Input
                id="rate"
                type="number"
                step="0.0001"
                value={data.spouse_income_exchange_rate === null ? "" : String(data.spouse_income_exchange_rate)}
                onChange={(e) => setData({ ...data, spouse_income_exchange_rate: numberOrNull(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Converted CHF</Label>
              <div className="text-sm px-3 py-2 rounded-md border bg-muted/30">
                {derivedChf !== null ? derivedChf.toFixed(2) : "—"}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Progression notes</Label>
              <Input
                id="notes"
                value={data.progression_notes ?? ""}
                onChange={(e) => setData({ ...data, progression_notes: e.target.value || null })}
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
