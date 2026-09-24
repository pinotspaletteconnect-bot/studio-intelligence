"use client"

import { useActionState } from "react"

import { mapExistingStudioToPtsAccount } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Option = { id: number; label: string }

export function PtsStudioMappingForm({ studios, accounts }: { studios: Option[]; accounts: Option[] }) {
  const [state, action, pending] = useActionState(mapExistingStudioToPtsAccount, undefined)

  if (studios.length === 0) return null

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <p className="text-sm text-muted-foreground md:col-span-2">
        Connect a studio that is already in your workspace. First save its PTS login above, then find its numeric location ID in the PTS location selector or location-specific URL.
      </p>
      <div className="space-y-2">
        <Label htmlFor="mappingStudioId">Studio</Label>
        <select id="mappingStudioId" name="studioId" required defaultValue="" className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm">
          <option value="" disabled>Select studio</option>
          {studios.map(studio => <option key={studio.id} value={studio.id}>{studio.label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mappingPtsAccountId">PTS account</Label>
        <select id="mappingPtsAccountId" name="ptsAccountId" required defaultValue="" className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm">
          <option value="" disabled>Select saved account</option>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.label}</option>)}
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="mappingPtsLocationId">PTS location ID</Label>
        <Input id="mappingPtsLocationId" name="ptsLocationId" inputMode="numeric" pattern="[0-9]{1,12}" required />
      </div>
      {accounts.length === 0 ? <p className="text-sm text-amber-800 md:col-span-2">Save a secured PTS account above before mapping the studio.</p> : null}
      {state?.error ? <p role="alert" className="text-sm text-destructive md:col-span-2">{state.error}</p> : null}
      {state?.complete ? <p role="status" className="text-sm text-emerald-700 md:col-span-2">PTS location mapped to the studio. Confirm the first import in Data Upload Status.</p> : null}
      <div className="md:col-span-2"><Button type="submit" disabled={pending || accounts.length === 0}>{pending ? "Saving…" : "Connect studio to PTS"}</Button></div>
    </form>
  )
}
