"use server"

import { auth } from "@clerk/nextjs/server"
import { runConvexMutation } from "@/lib/convex/server"
import { revalidatePath } from "next/cache"

export async function toggleTransactionExclusion(transactionId: string, exclude: boolean) {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const result = await runConvexMutation<
      {
        userId: string
        transactionId: string
        exclude: boolean
        reason: string
      },
      { success: boolean; error?: string }
    >("dashboard:toggleTransactionExclusion", {
      userId,
      transactionId,
      exclude,
      reason: "User excluded via dashboard",
    })

    if (!result.success) {
      return result
    }
  } catch (error) {
    console.error("[v0] Error toggling exclusion:", error)
    return { success: false, error: "Failed to update transaction exclusion" }
  }

  revalidatePath("/")
  return { success: true }
}
