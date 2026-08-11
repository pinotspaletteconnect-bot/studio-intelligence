"use client"

import { useActionState, useState } from "react"
import { mapGa4Property } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type Property = { account_id: number; property_id: string; display_name: string; account_display_name: string | null; studio_id: number | null; studio_name: string | null }
type Account = { id: number; account_name: string; authentication_type: string; google_account_email: string | null; has_credentials: boolean; last_discovered_at: string | null; properties: Property[] }

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
  const oauthAccounts = accounts.filter(account => account.authentication_type === "oauth")
  const [accountName, setAccountName] = useState("")
  const connectHref = accountName.trim().length >= 2
    ? `/api/integrations/ga4/connect?accountName=${encodeURIComponent(accountName.trim())}`
    : null
  return <div className="space-y-5">
    {oauthAccounts.map(account => <div className="space-y-2 rounded-lg border p-3" key={account.id}><div className="flex flex-wrap justify-between gap-2 text-sm"><div><strong>{account.account_name}</strong><p className="text-xs text-muted-foreground">{account.google_account_email ?? "Google account"} · {account.properties.length} {account.properties.length === 1 ? "property" : "properties"}</p></div><span className="text-emerald-700">{account.has_credentials ? "OAuth encrypted in Vault" : "Credentials unavailable"}</span></div>{account.properties.length ? account.properties.map(property => <PropertyMapping key={property.property_id} property={property} studios={studios} />) : <p className="text-xs text-amber-700">No GA4 properties were visible to this Google account.</p>}</div>)}
    <div className="grid gap-4 rounded-lg border p-4">
      <div><h3 className="font-medium">Add a Google Analytics connection</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Sign in with the Google account that can view the owner&apos;s GA4 properties. One connection may cover one studio or many studios. SASHA encrypts the refresh credential in Vault and then lets you map each discovered property.</p></div>
      <label className="space-y-1 text-sm"><span>Connection label</span><Input name="accountName" placeholder="Duff studios GA4" value={accountName} onChange={event => setAccountName(event.target.value)} required /></label>
      <div>{connectHref ? <a className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90" href={connectHref}>Continue with Google</a> : <Button type="button" disabled>Continue with Google</Button>}</div>
    </div>
  </div>
}
