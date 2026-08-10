"use client"

import { useActionState } from "react"

import { createMntnConnection } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type Account = {
  id: number
  account_name: string
  advertiser_id: string | null
  studio_name: string | null
  has_credentials: boolean
  last_validated_at: string | null
}

export function MntnConnections({ studios, accounts }: { studios: Studio[]; accounts: Account[] }) {
  const [state, action, pending] = useActionState(createMntnConnection, undefined)

  return <div className="space-y-5">
    {accounts.length ? <div className="space-y-2">
      {accounts.map((account) => <div className="rounded-lg border p-3 text-sm" key={account.id}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{account.account_name}</strong>
          <span className={account.has_credentials ? "text-emerald-700" : "text-amber-700"}>
            {account.has_credentials ? "Encrypted in Vault" : "Legacy workflow credential"}
          </span>
        </div>
        <p className="mt-1 text-muted-foreground">
          {account.studio_name ?? "Unmapped studio"}{account.advertiser_id ? ` · Advertiser ${account.advertiser_id}` : ""}
          {account.last_validated_at ? ` · Validated ${new Date(account.last_validated_at).toLocaleString()}` : ""}
        </p>
      </div>)}
    </div> : null}

    <form action={action} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <h3 className="font-medium">Connect another MNTN advertiser</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">The API key is encrypted in Vault and cannot be viewed after saving. Each advertiser maps to one studio.</p>
      </div>
      <label className="space-y-1 text-sm"><span>Connection label</span><Input name="accountName" placeholder="Jeffersonville MNTN" required /></label>
      <label className="space-y-1 text-sm"><span>Studio</span><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" name="studioId" required defaultValue=""><option value="" disabled>Select a studio</option>{studios.map(studio => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select></label>
      <label className="space-y-1 text-sm"><span>Advertiser ID</span><Input name="advertiserId" inputMode="numeric" pattern="[0-9]+" required /></label>
      <label className="space-y-1 text-sm"><span>Reporting API key</span><Input name="apiKey" type="password" autoComplete="new-password" required /></label>
      <label className="space-y-1 text-sm md:col-span-2"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /><span className="block text-xs text-muted-foreground">Required to authorize a protected credential change.</span></label>
      <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Encrypting…" : "Save encrypted MNTN connection"}</Button>{state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}{state?.complete ? <p role="status" className="text-sm text-emerald-700">MNTN connection saved.</p> : null}</div>
    </form>
  </div>
}
