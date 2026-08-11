"use client"

import { useActionState } from "react"
import { createEulerityConnection, mapEulerityLocation } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type Location = { account_id: number; source_key: string; display_name: string; studio_id: number | null; studio_name: string | null }
type Account = { id: number; account_name: string; has_credentials: boolean; last_discovered_at: string | null; locations: Location[] }

function LocationMapping({ location, studios }: { location: Location; studios: Studio[] }) {
  const [state, action, pending] = useActionState(mapEulerityLocation, undefined)
  return <form action={action} className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="accountId" value={location.account_id} /><input type="hidden" name="sourceKey" value={location.source_key} />
    <div className="text-sm"><strong>{location.display_name}</strong><p className="text-xs text-muted-foreground">{location.studio_name ?? "Needs a SASHA studio mapping"}</p></div>
    <select className="h-9 rounded-md border bg-background px-3 text-sm" name="studioId" required defaultValue={location.studio_id ?? ""}><option value="" disabled>Select studio</option>{studios.map(studio => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select>
    <Button size="sm" disabled={pending}>{pending ? "Saving…" : "Map"}</Button>
    {state?.error ? <p className="text-xs text-destructive sm:col-span-3">{state.error}</p> : null}
  </form>
}

export function EulerityConnections({ studios, accounts }: { studios: Studio[]; accounts: Account[] }) {
  const [state, action, pending] = useActionState(createEulerityConnection, undefined)
  return <div className="space-y-5">
    {accounts.map(account => <div className="space-y-2 rounded-lg border p-3" key={account.id}><div className="flex justify-between gap-2 text-sm"><strong>{account.account_name}</strong><span className="text-emerald-700">{account.has_credentials ? "Encrypted in Vault" : "Credentials unavailable"}</span></div>{account.locations.length ? account.locations.map(location => <LocationMapping key={location.source_key} location={location} studios={studios} />) : <p className="text-xs text-amber-700">Awaiting the first automated location discovery.</p>}</div>)}
    <form action={action} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <div className="md:col-span-2"><h3 className="font-medium">Connect an Eulerity account</h3><p className="mt-1 text-xs text-muted-foreground">Credentials are encrypted in Vault. Locations are discovered automatically; no dropdown names are hardcoded.</p></div>
      <label className="space-y-1 text-sm"><span>Connection label</span><Input name="accountName" placeholder="Louisville Eulerity" required /></label>
      <label className="space-y-1 text-sm"><span>Single-location studio (optional)</span><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" name="singleStudioId" defaultValue=""><option value="">Multi-location account</option>{studios.map(studio => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select></label>
      <label className="space-y-1 text-sm"><span>Eulerity email</span><Input name="email" type="email" autoComplete="username" required /></label>
      <label className="space-y-1 text-sm"><span>Eulerity password</span><Input name="password" type="password" autoComplete="new-password" required /></label>
      <label className="space-y-1 text-sm md:col-span-2"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <div className="flex items-center gap-3 md:col-span-2"><Button disabled={pending}>{pending ? "Encrypting…" : "Save Eulerity connection"}</Button>{state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}{state?.complete ? <p className="text-sm text-emerald-700">Connection saved.</p> : null}</div>
    </form>
  </div>
}
