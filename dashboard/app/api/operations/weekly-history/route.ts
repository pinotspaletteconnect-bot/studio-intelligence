import { NextResponse } from "next/server"

import { getWeeklyOperationsHistory } from "@/lib/services/operations"

export async function GET() {
  try {
    return NextResponse.json(await getWeeklyOperationsHistory())
  } catch (error) {
    console.error("Operations weekly history failed", error)
    return NextResponse.json(
      { error: "Weekly Operations history is temporarily unavailable." },
      { status: 500 }
    )
  }
}
