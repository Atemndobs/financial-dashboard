"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading profile...</div>
  }

  if (!user) {
    return <div className="text-sm text-muted-foreground">No user found.</div>
  }

  const emailAddress = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? ""
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "User"
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Button asChild variant="outline">
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>Profile details from Clerk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.imageUrl} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">{emailAddress}</p>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Username</span>
              <span>{user.username || "—"}</span>
            </div>
            <div className="flex justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Primary Email</span>
              <span>{emailAddress || "—"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/settings">Edit Profile & Settings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/security">Security</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
