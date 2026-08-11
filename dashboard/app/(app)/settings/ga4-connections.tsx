"use client"

import { useActionState } from "react"
import { createGa4Connection, mapGa4Property } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type Property = { account_id: number; property_id: string; display_name: string; account_display_name: string | null; studio_id: number | null; studio_name: string | null }
type Account = { id: number; account_name: string; has_credentials: boolean; last_discovered_at: string | null; properties: Property[] }

function PropertyMapping({ property, studios }: { property: Property; studios: Studio[] }) {
  const [state, action, pending] = useActionState(mapGa4Property, undefined)
  return <form action={action} className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="accountId" value={property.account_id} /><input type="hidden" name="propertyId" value={property.property_id} />
    <div className="text-sm"><strong>{property.display_name}</strong><p className="text-xs text-muted-foreground">Property {property.property_id}{property.account_display_name ? ` · ${property.account_display_name}` : ""}<br />{property.studio_name ?? "Needs a SASHA studio mapping"}</p></div>
    <select className="h-9 rounded-md border bg-background px-3 text-sm" name="studioId" required defaultValue={property.studio_id ?? ""}><option value="" disabled>Select studio</option>{studios.map(studio => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select>
    <Button size="sm" disabled={pending}>{pending ? "Saving…" : "Map"}</Button>{state?.error ? <p className="text-xs text-destructive sm:col-span-3">{state.error}</p> : null}
  </form>
}

export function Ga4Connections({ studios, accounts }: { studios: Studio[]; accounts: Account[] }) {
  const [state, action, pending] = useActionState(createGa4Connection, undefined)
  return <div className="space-y-5">
    {accounts.map(account => <div className="space-y-2 rounded-lg border p-3" key={account.id}><div className="flex justify-between gap-2 text-sm"><strong>{account.account_name}</strong><span className="text-emerald-700">{account.has_credentials ? "Encrypted in Vault" : "Credentials unavailable"}</span></div>{account.properties.length ? account.properties.map(property => <PropertyMapping key={property.property_id} property={property} studios={studios} />) : <p className="text-xs text-amber-700">Awaiting the first automated GA4 property discovery.</p>}</div>)}
    <form action={action} className="grid gap-4 rounded-lg border p-4">
      <div><h3 className="font-medium">Connect a GA4 service account</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Create a Google Cloud service-account JSON key, grant its client email Viewer access to each GA4 property, then paste the complete JSON here. SASHA encrypts it in Vault.</p></div>
      <label className="space-y-1 text-sm"><span>Connection label</span><Input name="accountName" placeholder="Primary GA4 reporting" required /></label>
      <label className="space-y-1 text-sm"><span>Service-account JSON</span><textarea className="min-h-36 w-full rounded-md border bg-transparent p-3 font-mono text-xs" name="serviceAccountJson" autoComplete="off" required /></label>
      <label className="space-y-1 text-sm"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <div className="flex items-center gap-3"><Button disabled={pending}>{pending ? "Encrypting…" : "Save encrypted GA4 account"}</Button>{state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}{state?.complete ? <p className="text-sm text-emerald-700">GA4 account saved.</p> : null}</div>
    </form>
  </div>
}
