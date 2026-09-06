import { ReportingLimitError } from "@/lib/supabase/pagination"
import { InvalidReportPeriodError } from "@/lib/date-range"
import "server-only"

import { NextResponse } from "next/server"

import { getUserAccessContext, type UserAccessContext } from "@/lib/auth/session"

export class ApiAccessError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message)
  }
}

export async function requireApiAccess(): Promise<UserAccessContext> {
  const context = await getUserAccessContext()
  if (!context) throw new ApiAccessError(401, "Authentication required.")
  if (!context.onboardingComplete) throw new ApiAccessError(403, "Onboarding required.")
  if (!context.legalAccepted) throw new ApiAccessError(403, "Current legal terms must be accepted.")
  return context
}

export function assertStudioAccess(
  context: Pick<UserAccessContext, "allowedStudioIds">,
  requestedStudioId: string | number | undefined
) {
  if (requestedStudioId === undefined || requestedStudioId === "all") return

  const studioId = Number(requestedStudioId)
  if (!Number.isInteger(studioId) || !context.allowedStudioIds.includes(studioId)) {
    throw new ApiAccessError(403, "Studio access denied.")
  }
}

export function apiAccessResponse(error: unknown) {
  if (error instanceof ReportingLimitError || error instanceof InvalidReportPeriodError) {
    return NextResponse.json({ error: error.message }, { status: error instanceof ReportingLimitError ? 422 : 400, headers: { "Cache-Control": "private, no-store" } })
  }
  if (!(error instanceof ApiAccessError)) return null
  return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } })
}
