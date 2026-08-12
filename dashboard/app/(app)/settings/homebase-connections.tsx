"use client"

import { useActionState } from "react"
import { createHomebaseConnection, updateHomebaseBrowserLogin } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type Account = { id: number; account_name: string; studio_name: string | null; location_name: string | null; has_credentials: boolean; last_validated_at: string | null }

export function HomebaseConnections({ studios, accounts }: { studios: Studio[]; accounts: Account[] }) {
  const [state, action, pending] = useActionState(createHomebaseConnection, undefined)
  const [loginState, loginAction, loginPending] = useActionState(updateHomebaseBrowserLogin, undefined)

  return <div className="space-y-5">
    {accounts.map(account => <div key={account.id} className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><strong>{account.account_name}</strong><span className={account.has_credentials ? "text-emerald-700" : "text-amber-700"}>{account.has_credentials ? "Encrypted in Vault" : "Credential unavailable"}</span></div>
      <p className="mt-1 text-muted-foreground">{account.studio_name ?? "Unmapped studio"}{account.location_name ? ` · Homebase ${account.location_name}` : " · Awaiting location verification"}{account.last_validated_at ? ` · Validated ${new Date(account.last_validated_at).toLocaleString()}` : ""}</p>
    </div>)}

    {accounts.length > 0 ? <form action={loginAction} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <input type="hidden" name="accountId" value={accounts[0].id} />
      <div className="md:col-span-2"><h3 className="font-medium">Update Homebase web login</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Use this when the Homebase email or password changes. The encrypted API key and all studio UUID mappings are preserved.</p></div>
      <label className="space-y-1 text-sm"><span>Homebase login email</span><Input name="email" type="email" autoComplete="username" required /></label>
      <label className="space-y-1 text-sm"><span>Homebase login password</span><Input name="password" type="password" autoComplete="new-password" required /></label>
      <label className="space-y-1 text-sm md:col-span-2"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={loginPending}>{loginPending ? "Encrypting…" : "Update encrypted web login"}</Button>{loginState?.error ? <p role="alert" className="text-sm text-destructive">{loginState.error}</p> : null}{loginState?.complete ? <p role="status" className="text-sm text-emerald-700">Homebase web login updated. API key and studio mappings were preserved.</p> : null}</div>
    </form> : null}

    <form action={action} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <div className="md:col-span-2"><h3 className="font-medium">{accounts.length > 0 ? "Replace Homebase account setup" : "Connect a Homebase account"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Enter the owner login once, then map each SASHA studio to its Homebase location UUID. Use this full form only for initial setup or when replacing the API key or mappings.</p></div>
      <label className="space-y-1 text-sm md:col-span-2"><span>Connection label</span><Input name="accountName" placeholder="Duff Studios Homebase" required autoComplete="off" /></label>
      <label className="space-y-1 text-sm md:col-span-2"><span>Homebase account API key</span><Input name="apiKey" type="password" autoComplete="new-password" required /></label>
      <label className="space-y-1 text-sm"><span>Homebase login email</span><Input name="email" type="email" autoComplete="off" required /></label>
      <label className="space-y-1 text-sm"><span>Homebase login password</span><Input name="password" type="password" autoComplete="new-password" required /></label>
      {studios.map(studio => <label key={studio.id} className="space-y-1 text-sm"><span>{studio.studio_name} location UUID</span><Input name={`locationUuid_${studio.id}`} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" /></label>)}
      <label className="space-y-1 text-sm md:col-span-2"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Encrypting…" : "Save encrypted Homebase connection"}</Button>{state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}{state?.complete ? <p role="status" className="text-sm text-emerald-700">Homebase connection saved and queued for verification.</p> : null}</div>
    </form>
  </div>
}
