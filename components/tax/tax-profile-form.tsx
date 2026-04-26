"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TaxProfileInput } from "@/lib/tax/estimate-types"

const DEFAULT: Omit<TaxProfileInput, "tax_year"> = {
  canton: "AG",
  municipality: "Aarau",
  residence_permit: "B",
  source_tax_code: "",
  marital_status: "married",
  is_separated: false,
  children_count: 0,
  church_tax: false,
  tax_liability_start: null,
  tax_liability_end: null,
  country_of_residence: "CH",
}

export function TaxProfileForm({ year, onSaved }: { year: number; onSaved?: () => void }) {
  const [data, setData] = useState<Omit<TaxProfileInput, "tax_year">>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/tax/profile?year=${year}`, { cache: "no-store" })
        if (!res.ok) return
        const payload = await res.json()
        if (cancelled) return
        if (payload.profile) {
          setData({ ...DEFAULT, ...payload.profile })
        }
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
      await fetch(`/api/tax/profile?year=${year}`, {
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
        <CardTitle>Filing Profile</CardTitle>
        <CardDescription>Taxpayer context used for canton/municipal rate determination.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="canton">Canton</Label>
              <Input
                id="canton"
                value={data.canton ?? ""}
                onChange={(e) => setData({ ...data, canton: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipality">Municipality</Label>
              <Input
                id="municipality"
                value={data.municipality ?? ""}
                onChange={(e) => setData({ ...data, municipality: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permit">Residence Permit</Label>
              <Input
                id="permit"
                value={data.residence_permit ?? ""}
                onChange={(e) => setData({ ...data, residence_permit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stax">Source Tax Code</Label>
              <Input
                id="stax"
                value={data.source_tax_code ?? ""}
                onChange={(e) => setData({ ...data, source_tax_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Marital Status</Label>
              <Select
                value={data.marital_status ?? ""}
                onValueChange={(v) => setData({ ...data, marital_status: v as TaxProfileInput["marital_status"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                type="number"
                min="0"
                value={data.children_count}
                onChange={(e) => setData({ ...data, children_count: Number.parseInt(e.target.value || "0", 10) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Liability Start</Label>
              <Input
                id="start"
                type="date"
                value={data.tax_liability_start ?? ""}
                onChange={(e) => setData({ ...data, tax_liability_start: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Liability End</Label>
              <Input
                id="end"
                type="date"
                value={data.tax_liability_end ?? ""}
                onChange={(e) => setData({ ...data, tax_liability_end: e.target.value || null })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sep"
                checked={data.is_separated}
                onCheckedChange={(v) => setData({ ...data, is_separated: !!v })}
              />
              <Label htmlFor="sep">Separated</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="church"
                checked={data.church_tax}
                onCheckedChange={(v) => setData({ ...data, church_tax: !!v })}
              />
              <Label htmlFor="church">Church tax</Label>
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
