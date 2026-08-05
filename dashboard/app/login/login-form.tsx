"use client"

import Link from "next/link"
import { useActionState } from "react"

import { login } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm text-slate-600 underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs leading-5 text-slate-500">
        Accounts are invitation-only. Contact your organization administrator if you need access.
      </p>
    </form>
  )
}
