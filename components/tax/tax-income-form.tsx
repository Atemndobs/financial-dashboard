"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IncomeStatementInput } from "@/lib/tax/estimate-types"

const EMPTY: IncomeStatementInput = {
  source_type: "manual",
  gross_salary: null,
  bonus_income: null,
  other_taxable_income: null,
  salary_certificate_reference: null,
}

function numberOrNull(v: string): number | null {
  if (v === "") return null
  const n = Number.parseFloat(v)
  return Number.isNaN(n) ? null : n
}

export function TaxIncomeForm({ year, onSaved }: { year: number; onSaved?: () => void }) {
  const [data, setData] = useState<IncomeStatementInput>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/tax/income?year=${year}`, { cache: "no-store" })
        if (!res.ok) return
        const payload = await res.json()
        if (cancelled) return
        if (payload.income_statement) setData({ ...EMPTY, ...payload.income_statement })
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
      await fetch(`/api/tax/income?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Inputs</CardTitle>
        <CardDescription>
          Preferred source: salary certificate (Lohnausweis). Bank-derived income is a fallback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source type</Label>
              <Select
                value={data.source_type}
                onValueChange={(v) => setData({ ...data, source_type: v as IncomeStatementInput["source_type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary_certificate">Salary certificate</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Salary certificate reference</Label>
              <Input
                id="ref"
                value={data.salary_certificate_reference ?? ""}
                onChange={(e) => setData({ ...data, salary_certificate_reference: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross">Gross salary</Label>
              <Input
                id="gross"
                type="number"
                step="0.01"
                value={data.gross_salary === null ? "" : String(data.gross_salary)}
                onChange={(e) => setData({ ...data, gross_salary: numberOrNull(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus">Bonus</Label>
              <Input
                id="bonus"
                type="number"
                step="0.01"
                value={data.bonus_income === null ? "" : String(data.bonus_income)}
                onChange={(e) => setData({ ...data, bonus_income: numberOrNull(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="other">Other taxable income</Label>
              <Input
                id="other"
                type="number"
                step="0.01"
                value={data.other_taxable_income === null ? "" : String(data.other_taxable_income)}
                onChange={(e) => setData({ ...data, other_taxable_income: numberOrNull(e.target.value) })}
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
