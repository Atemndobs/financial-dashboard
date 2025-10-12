"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleTransactionExclusion(transactionId: string, exclude: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("fin_transactions")
    .update({ user_excluded: exclude })
    .eq("transaction_id", transactionId)

  if (error) {
    console.error("[v0] Error toggling exclusion:", error)
    return { success: false, error: error.message }
  }

  // Also update the exclusions table
  if (exclude) {
    await supabase.from("fin_exclusions").insert({
      transaction_id: transactionId,
      reason: "User excluded via dashboard",
    })
  } else {
    await supabase.from("fin_exclusions").delete().eq("transaction_id", transactionId)
  }

  revalidatePath("/")
  return { success: true }
}
