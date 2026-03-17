import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"

function createConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL

  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  }

  return new ConvexHttpClient(url)
}

export async function runConvexQuery<TArgs extends Record<string, unknown>, TResult>(
  functionName: string,
  args: TArgs,
): Promise<TResult> {
  const client = createConvexClient()
  const reference = makeFunctionReference<"query">(functionName)
  return client.query(reference as any, args as any) as Promise<TResult>
}

export async function runConvexMutation<TArgs extends Record<string, unknown>, TResult>(
  functionName: string,
  args: TArgs,
): Promise<TResult> {
  const client = createConvexClient()
  const reference = makeFunctionReference<"mutation">(functionName)
  return client.mutation(reference as any, args as any) as Promise<TResult>
}
