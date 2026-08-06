"use client"

import { useActionState } from "react"

import { createPtsAccount } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PtsAccountForm() {
  const [state, action, pending] = useActionState(createPtsAccount, undefined)

  return (
    <form action={action} className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <p className="text-sm leading-6 text-muted-foreground">
          Credentials are sent once over HTTPS into encrypted Vault storage. They cannot be viewed again; they can only be replaced.
        </p>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="accountName">Account label</Label>
        <Input id="accountName" name="accountName" placeholder="Example: Christy's PTS account" autoComplete="off" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ptsUsername">PTS username</Label>
        <Input id="ptsUsername" name="ptsUsername" autoComplete="off" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ptsPassword">PTS password</Label>
        <Input id="ptsPassword" name="ptsPassword" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="currentPassword">Confirm your Studio Intelligence password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        <p className="text-xs text-muted-foreground">Required before changing protected connection credentials.</p>
      </div>
      {state?.error ? <p role="alert" className="text-sm text-red-700 md:col-span-2">{state.error}</p> : null}
      {state?.complete ? <p role="status" className="text-sm text-emerald-700 md:col-span-2">Encrypted PTS account created. You can now map a studio to it.</p> : null}
      <div className="md:col-span-2"><Button disabled={pending} type="submit">{pending ? "Encrypting…" : "Save encrypted PTS account"}</Button></div>
    </form>
  )
}
