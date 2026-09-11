"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Info } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TAX_PREP_CHECKLIST_GROUPS, TAX_PREP_TRANSLATION_NOTICE } from "@/lib/tax/prep-checklist"

interface TaxPrepChecklistClientProps {
  initialYears: number[]
  initialYear?: number
}

interface ChecklistItem {
  deduction_key: string
  label_de: string
  label_en: string
  total_amount: number
  documents: string[]
}

const CURRENT_YEAR = new Date().getFullYear()
const STORAGE_PREFIX = "tax-prep-checklist:v1"

function storageKey(year: string) {
  return `${STORAGE_PREFIX}:${year}`
}

export function TaxPrepChecklistClient({ initialYears, initialYear }: TaxPrepChecklistClientProps) {
  const yearOptions = useMemo(
    () => (initialYears.length > 0 ? [...initialYears].sort((a, b) => b - a) : [CURRENT_YEAR]),
    [initialYears],
  )
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (initialYear && yearOptions.some((year) => year === initialYear)) return initialYear.toString()
    return yearOptions[0].toString()
  })
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [dynamicChecklist, setDynamicChecklist] = useState<ChecklistItem[]>([])
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(true)

  useEffect(() => {
    if (!yearOptions.some((y) => y.toString() === selectedYear)) {
      setSelectedYear(yearOptions[0].toString())
    }
  }, [selectedYear, yearOptions])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(selectedYear))
      setCompleted(raw ? (JSON.parse(raw) as Record<string, boolean>) : {})
    } catch {
      setCompleted({})
    }
  }, [selectedYear])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(selectedYear), JSON.stringify(completed))
    } catch {
      // Ignore storage errors; checklist still works in-session.
    }
  }, [completed, selectedYear])

  useEffect(() => {
    let cancelled = false
    async function loadDynamicChecklist() {
      setIsLoadingDynamic(true)
      try {
        const qs = new URLSearchParams({ year: selectedYear })
        const response = await fetch(`/api/tax/checklist?${qs}`, { cache: "no-store" })
        if (!response.ok) throw new Error("Failed to load dynamic checklist")
        const payload = await response.json()
        if (!cancelled) {
          setDynamicChecklist(Array.isArray(payload) ? payload : [])
        }
      } catch {
        if (!cancelled) setDynamicChecklist([])
      } finally {
        if (!cancelled) setIsLoadingDynamic(false)
      }
    }
    void loadDynamicChecklist()
    return () => {
      cancelled = true
    }
  }, [selectedYear])

  const checklistItems = useMemo(
    () =>
      TAX_PREP_CHECKLIST_GROUPS.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          key: `${group.id}:${item.id}`,
          groupTitle: group.title,
        })),
      ),
    [],
  )

  const totalCount = checklistItems.length
  const completedCount = checklistItems.filter((item) => completed[item.key]).length
  const completionPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  function toggleItem(itemKey: string) {
    setCompleted((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }))
  }

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight truncate">Tax Prep Checklist</h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="About this checklist"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Baseline checklist from your tax preparer document + dynamic checklist from detected deductions.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/tax">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Tax Dashboard</span>
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
          <div className="w-36 sm:w-52 space-y-1">
            <p className="text-xs text-muted-foreground">
              Progress: {completedCount}/{totalCount}
            </p>
            <Progress value={completionPercent} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Note</CardTitle>
          <CardDescription>{TAX_PREP_TRANSLATION_NOTICE}</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="base">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="base">Base Checklist</TabsTrigger>
          <TabsTrigger value="dynamic">Detected From Data</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-4">
          {TAX_PREP_CHECKLIST_GROUPS.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
                {group.description && <CardDescription>{group.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                {group.items.map((item) => {
                  const key = `${group.id}:${item.id}`
                  return (
                    <div key={key} className="flex items-start gap-3 rounded-md border p-3">
                      <Checkbox
                        id={key}
                        checked={Boolean(completed[key])}
                        onCheckedChange={() => toggleItem(key)}
                        className="mt-0.5"
                      />
                      <div className="space-y-1">
                        <Label htmlFor={key} className="font-medium cursor-pointer">
                          {item.label}
                        </Label>
                        {item.note && <p className="text-sm text-muted-foreground">{item.note}</p>}
                        <Badge variant={item.applicability === "required" ? "default" : "secondary"}>
                          {item.applicability === "required" ? "Required" : "If applicable"}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="dynamic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Deduction Documents</CardTitle>
              <CardDescription>
                Based on the categories and amounts currently detected for {selectedYear}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingDynamic ? (
                <p className="text-sm text-muted-foreground">Loading checklist…</p>
              ) : dynamicChecklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dynamic items for this year.</p>
              ) : (
                dynamicChecklist.map((item) => (
                  <div key={item.deduction_key} className="rounded-md border p-3">
                    <p className="font-medium">{item.label_en}</p>
                    <p className="text-xs text-muted-foreground mb-2">{item.label_de}</p>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {item.documents.map((doc, index) => (
                        <li key={`${item.deduction_key}:${index}`}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
