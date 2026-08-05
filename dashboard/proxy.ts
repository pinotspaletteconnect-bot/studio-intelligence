import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabasePublicConfig } from "@/lib/supabase/config"
import {
  activityCookieOptions,
  createActivityCookieValue,
  readActivityTimestamp,
  SESSION_ABSOLUTE_LIMIT_MS,
  SESSION_ACTIVITY_COOKIE,
  SESSION_IDLE_LIMIT_MS,
} from "@/lib/auth/session-policy"

const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/auth", "/api/session/end"]

function redirectWithCookies(request: NextRequest, response: NextResponse, pathname: string, reason?: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = reason ? `?reason=${reason}` : ""
  const redirect = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, publishableKey } = getSupabasePublicConfig()
  const auth = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data } = await auth.auth.getUser()
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!data.user && !isPublicRoute) {
    return redirectWithCookies(request, response, "/login")
  }

  if (data.user && !isPublicRoute) {
    const now = Date.now()
    const signedInAt = data.user.last_sign_in_at ? Date.parse(data.user.last_sign_in_at) : Number.NaN
    const activityAt = await readActivityTimestamp(request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value)
    const absoluteExpired = !Number.isFinite(signedInAt) || now - signedInAt >= SESSION_ABSOLUTE_LIMIT_MS
    const idleExpired = activityAt !== null && now - activityAt >= SESSION_IDLE_LIMIT_MS

    if (absoluteExpired || idleExpired) {
      await auth.auth.signOut()
      response.cookies.set(SESSION_ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 })
      return redirectWithCookies(request, response, "/login", absoluteExpired ? "maximum" : "inactive")
    }
    if (activityAt === null) {
      response.cookies.set(SESSION_ACTIVITY_COOKIE, await createActivityCookieValue(now), activityCookieOptions)
    }
  }

  if (data.user && request.nextUrl.pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
