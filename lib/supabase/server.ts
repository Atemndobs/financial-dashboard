import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let serverClient: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (serverClient) return serverClient

  serverClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  return serverClient
}
