"use client"

import { useActionState } from "react"
import { createHomebaseConnection } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type Account = { id: number; account_name: string; studio_name: string | null; location_name: string | null; has_credentials: boolean; last_validated_at: string | null }

export function HomebaseConnections({ studios, accounts }: { studios: Studio[]; accounts: Account[] }) {
  const [state, action, pending] = useActionState(createHomebaseConnection, undefined)
  return <div className="space-y-5">
    {accounts.map(account => <div key={account.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{account.account_name}</strong><span className={account.has_credentials ? "text-emerald-700" : "text-amber-700"}>{account.has_credentials ? "Encrypted in Vault" : "Credential unavailable"}</span></div><p className="mt-1 text-muted-foreground">{account.studio_name ?? "Unmapped studio"}{account.location_name ? ` · Homebase ${account.location_name}` : " · Awaiting location verification"}{account.last_validated_at ? ` · Validated ${new Date(account.last_validated_at).toLocaleString()}` : ""}</p></div>)}
    <form action={action} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <div className="md:col-span-2"><h3 className="font-medium">Connect a Homebase location</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Each location has its own read-only API key. SASHA encrypts it immediately and never displays it again.</p></div>
      <label className="space-y-1 text-sm"><span>Connection label</span><Input name="accountName" placeholder="Short North Homebase" required autoComplete="off" /></label>
      <label className="space-y-1 text-sm"><span>SASHA studio</span><select name="studioId" required defaultValue="" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"><option value="" disabled>Select a studio</option>{studios.map(studio => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select></label>
      <label className="space-y-1 text-sm md:col-span-2"><span>Homebase read-only API key</span><Input name="apiKey" type="password" autoComplete="new-password" required /></label>
      <label className="space-y-1 text-sm md:col-span-2"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Encrypting…" : "Save encrypted Homebase connection"}</Button>{state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}{state?.complete ? <p role="status" className="text-sm text-emerald-700">Homebase connection saved.</p> : null}</div>
    </form>
  </div>
}
