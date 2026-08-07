"use client"

import { useActionState, useEffect, useState } from "react"

import { updatePassword } from "@/app/reset-password/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAuthBrowserClient } from "@/lib/supabase/browser"

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined)
  const [linkState, setLinkState] = useState<"checking" | "recovery" | "fallback" | "invalid">("checking")

  useEffect(() => {
    async function establishRecoverySession() {
      const fragment = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = fragment.get("access_token")
      const refreshToken = fragment.get("refresh_token")
      const linkError = fragment.get("error")

      if (!accessToken || !refreshToken) {
        await Promise.resolve()
        setLinkState(linkError ? "invalid" : "fallback")
        return
      }

      const auth = createAuthBrowserClient()
      const { error } = await auth.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
      setLinkState(error ? "invalid" : "recovery")
    }

    void establishRecoverySession()
  }, [])

  return (
    <form action={action} className="space-y-5">
      {linkState === "checking" ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Verifying your secure setup link…</p>
      ) : null}
      {linkState === "invalid" ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">This setup link is invalid or has expired. Ask your administrator to resend it.</p>
      ) : null}
      {linkState === "recovery" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Your secure setup link is verified. Create your first password below.</p>
      ) : null}
      {linkState === "fallback" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current or temporary password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
            />
            <p className="text-xs text-slate-500">
              Required only when a reset link or browser session has expired.
            </p>
          </div>
        </>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
        <p className="text-xs text-slate-500">Use at least 12 characters and a password manager.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmation">Confirm password</Label>
        <Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      {state?.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
      <Button className="w-full" disabled={pending || linkState === "checking" || linkState === "invalid"} type="submit">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}
