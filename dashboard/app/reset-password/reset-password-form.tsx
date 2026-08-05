"use client"

import { useActionState } from "react"

import { updatePassword } from "@/app/reset-password/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined)
  return (
    <form action={action} className="space-y-5">
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
          Required when your reset link or browser session has expired.
        </p>
      </div>
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
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}
