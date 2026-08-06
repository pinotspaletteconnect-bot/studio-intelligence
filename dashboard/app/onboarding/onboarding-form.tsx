"use client"

import { useActionState } from "react"

import { completeOnboarding } from "@/app/onboarding/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function OnboardingForm({
  initialName,
  canManageConsent,
  passwordAlreadyCreated,
}: {
  initialName: string
  canManageConsent: boolean
  passwordAlreadyCreated: boolean
}) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined)

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" defaultValue={initialName} autoComplete="name" required />
      </div>

      {!passwordAlreadyCreated ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">Create your password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
            <p className="text-xs text-slate-500">Use at least 12 characters and a password manager.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirm password</Label>
            <Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required />
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Your password is secured. Complete your profile to enter the workspace.</p>
      )}

      <label className="flex items-start gap-3 rounded-xl border p-4 text-sm leading-6">
        <Checkbox name="acceptTerms" required />
        <span>I accept the platform terms and acknowledge that access is limited to authorized business use.</span>
      </label>

      {canManageConsent ? (
        <label className="flex items-start gap-3 rounded-xl border p-4 text-sm leading-6">
          <Checkbox name="benchmarkConsent" />
          <span>
            Participate in privacy-protected reciprocal benchmarks. This is optional, defaults off, and can be withdrawn later.
          </span>
        </label>
      ) : null}

      {state?.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Securing your workspace…" : "Complete setup"}
      </Button>
    </form>
  )
}
