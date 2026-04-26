"use client"

import Link from "next/link"
import { UserProfile } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <Button asChild variant="outline">
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <UserProfile routing="path" path="/settings" />
      </div>
    </div>
  )
}
