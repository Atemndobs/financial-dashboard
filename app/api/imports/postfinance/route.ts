import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"

import { api } from "@/convex/_generated/api"

export const runtime = "nodejs"
export const maxDuration = 60

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!CONVEX_URL) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Server misconfiguration: NEXT_PUBLIC_CONVEX_URL is not set.",
      },
      { status: 500 },
    )
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' in multipart body." },
      { status: 400 },
    )
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { success: false, message: "Only .pdf files are accepted." },
      { status: 400 },
    )
  }

  const bytes = await file.arrayBuffer()

  try {
    const client = new ConvexHttpClient(CONVEX_URL)
    const result = await client.action(api.imports.importPostFinancePdf, {
      userId,
      filename: file.name,
      fileBytes: bytes,
    })
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    })
  } catch (error) {
    console.error("[imports/postfinance] Convex action failed:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Convex import action failed.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
