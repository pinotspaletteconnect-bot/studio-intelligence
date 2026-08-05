"use client"

import Link from "next/link"
import { useActionState } from "react"

import { requestPasswordReset } from "@/app/forgot-password/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)

  if (state?.complete) {
    return (
      <div className="space-y-5 text-sm leading-6 text-slate-600">
        <p>If an account exists for that email, a secure reset link has been sent.</p>
        <Link href="/login" className="font-medium text-slate-950 underline-offset-4 hover:underline">
          Return to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state?.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <Link href="/login" className="block text-center text-sm text-slate-600 underline-offset-4 hover:underline">
        Return to sign in
      </Link>
    </form>
  )
}
