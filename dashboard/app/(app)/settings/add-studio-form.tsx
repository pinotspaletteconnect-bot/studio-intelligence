"use client"

import { useActionState } from "react"

import { addStudioWithExistingPtsAccount } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Option = { id: number; label: string }

export function AddStudioForm({
  brands,
  ptsAccounts,
}: {
  brands: Option[]
  ptsAccounts: Option[]
}) {
  const [state, action, pending] = useActionState(addStudioWithExistingPtsAccount, undefined)
  const unavailable = brands.length === 0 || ptsAccounts.length === 0

  return (
    <form action={action} className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <p className="text-sm leading-6 text-muted-foreground">
          This V1 setup reuses an existing encrypted PTS account. Only the non-secret PTS location ID is saved with the studio.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="studioName">Studio name</Label>
        <Input id="studioName" name="studioName" placeholder="Example: Westerville" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="studioCode">Studio code</Label>
        <Input id="studioCode" name="studioCode" placeholder="WES" maxLength={20} required />
        <p className="text-xs text-muted-foreground">2–20 letters, numbers, hyphens, or underscores.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input id="state" name="state" placeholder="OH" maxLength={2} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Time zone</Label>
        <select id="timezone" name="timezone" className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm" defaultValue="America/New_York">
          <option value="America/New_York">Eastern</option>
          <option value="America/Chicago">Central</option>
          <option value="America/Denver">Mountain</option>
          <option value="America/Phoenix">Arizona</option>
          <option value="America/Los_Angeles">Pacific</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="brandId">Brand</Label>
        <select id="brandId" name="brandId" className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm" required>
          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ptsAccountId">PTS account</Label>
        <select id="ptsAccountId" name="ptsAccountId" className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm" required>
          {ptsAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ptsLocationId">PTS location ID</Label>
        <Input id="ptsLocationId" name="ptsLocationId" inputMode="numeric" placeholder="Numeric location ID" required />
        <p className="text-xs text-muted-foreground">Found in the PTS location selector or location-specific URL.</p>
      </div>
      {state?.error ? <p role="alert" className="text-sm text-red-700 md:col-span-2">{state.error}</p> : null}
      {state?.complete ? <p role="status" className="text-sm text-emerald-700 md:col-span-2">Studio and PTS mapping added.</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending || unavailable}>
          {pending ? "Adding studio…" : "Add test studio"}
        </Button>
      </div>
    </form>
  )
}
