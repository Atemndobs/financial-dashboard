"use client"

import { useState } from "react"
import { formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserMenu } from "@/components/user-menu"

export function DashboardHeader() {
  const currentDate = new Date()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  })
  const isDevelopment = process.env.NODE_ENV === "development"

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus({ type: null, message: "" })

    try {
      // Call the Python backend sync endpoint
      const response = await fetch("http://localhost:8000/convex/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSyncStatus({
          type: "success",
          message: `✅ ${data.message} (Inserted: ${data.stats.inserted}, Updated: ${data.stats.updated})`,
        })
        // Reload the page after successful sync to show new data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setSyncStatus({
          type: "error",
          message: `❌ Sync failed: ${data.detail || data.message || "Unknown error"}`,
        })
      }
    } catch (error) {
      setSyncStatus({
        type: "error",
        message: `❌ Failed to connect to backend API at http://localhost:8000. Make sure the backend is running.`,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">Track your expenses, income, and savings with detailed insights</p>
          <p className="text-sm text-muted-foreground">Last updated: {formatDate(currentDate.toISOString())}</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {isDevelopment && (
            <Button onClick={handleSync} disabled={isSyncing} variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync to Convex"}
            </Button>
          )}
          <UserMenu />
        </div>
      </div>

      {syncStatus.type && (
        <Alert variant={syncStatus.type === "error" ? "destructive" : "default"}>
          {syncStatus.type === "error" && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{syncStatus.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
