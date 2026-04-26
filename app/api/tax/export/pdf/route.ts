import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      error: "PDF export is not enabled in Convex-only tax mode yet. Use CSV export.",
    },
    { status: 501 },
  )
}
