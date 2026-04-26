"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Upload, Loader2 } from "lucide-react"

interface ImportResponse {
  success: boolean
  message: string
  source_file?: string
  transactions_extracted?: number
  transactions_imported?: number
  duplicates_skipped?: number
  date_min?: string | null
  date_max?: string | null
  months_added?: string[]
  warnings?: string[]
  errors?: string[]
}

export function ImportPdfDialog({
  triggerLabel = "Import PDF",
  onImported,
}: {
  triggerLabel?: string
  onImported?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return
    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/imports/postfinance", {
        method: "POST",
        body: form,
      })
      const json = (await res.json()) as ImportResponse
      if (!res.ok || !json.success) {
        setError(
          json.message ||
            (Array.isArray(json.errors) && json.errors.length > 0
              ? json.errors.join("; ")
              : "Import failed."),
        )
        setResult(json)
      } else {
        setResult(json)
        onImported?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown upload error.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label={triggerLabel}>
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg !bg-white dark:!bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <DialogHeader>
          <DialogTitle>Import bank statement (PDF)</DialogTitle>
          <DialogDescription>
            Upload a PostFinance monthly statement PDF. It will be parsed, categorized,
            and imported into your dashboard data. Duplicate transactions are ignored.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result?.success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{result.message}</div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>File: {result.source_file}</div>
                  <div>
                    Extracted: {result.transactions_extracted} · Imported:{" "}
                    {result.transactions_imported}
                  </div>
                  {result.date_min && result.date_max && (
                    <div>
                      Date range: {result.date_min} → {result.date_max}
                    </div>
                  )}
                  {result.months_added && result.months_added.length > 0 && (
                    <div>Months: {result.months_added.join(", ")}</div>
                  )}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="text-amber-700">
                      Warnings: {result.warnings.join("; ")}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isUploading}
            >
              Close
            </Button>
            <Button type="submit" disabled={!file || isUploading} className="gap-2">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload &amp; import
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
