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
  return context
}

export function assertStudioAccess(
  context: UserAccessContext,
  requestedStudioId: string | number | undefined
) {
  if (requestedStudioId === undefined || requestedStudioId === "all") return

  const studioId = Number(requestedStudioId)
  if (!Number.isInteger(studioId) || !context.allowedStudioIds.includes(studioId)) {
    throw new ApiAccessError(403, "Studio access denied.")
  }
}

export function apiAccessResponse(error: unknown) {
  if (!(error instanceof ApiAccessError)) return null
  return NextResponse.json({ error: error.message }, { status: error.status })
}
