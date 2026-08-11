"use client"

import { useActionState, useState } from "react"

import { mapMetaAsset } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type Asset = { account_id: number; asset_type: string; asset_id: string; display_name: string; studio_id: number | null; studio_name: string | null }
type Account = { id: number; account_name: string; meta_user_name: string | null; connection_status: string; token_expires_at: string | null; has_credentials: boolean; assets: Asset[] }

const labels: Record<string, string> = { business: "Portfolio", ad_account: "Ad account", page: "Facebook Page", instagram_account: "Instagram account" }

function AssetMapping({ asset, studios }: { asset: Asset; studios: Studio[] }) {
  const [state, action, pending] = useActionState(mapMetaAsset, undefined)
  if (asset.asset_type === "business") return <div className="rounded-md bg-muted/40 p-3 text-sm"><strong>{asset.display_name}</strong><p className="text-xs text-muted-foreground">Business portfolio {asset.asset_id}</p></div>
  return <form action={action} className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="accountId" value={asset.account_id} /><input type="hidden" name="assetType" value={asset.asset_type} /><input type="hidden" name="assetId" value={asset.asset_id} />
    <div className="text-sm"><strong>{asset.display_name}</strong><p className="text-xs text-muted-foreground">{labels[asset.asset_type] ?? asset.asset_type} {asset.asset_id}<br />{asset.studio_name ?? "Needs a SASHA studio mapping"}</p></div>
    <select className="h-9 rounded-md border bg-background px-3 text-sm" name="studioId" required defaultValue={asset.studio_id ?? ""}><option value="" disabled>Select studio</option>{studios.map(studio => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select>
    <Button size="sm" disabled={pending}>{pending ? "Saving..." : "Map"}</Button>{state?.error ? <p className="text-xs text-destructive sm:col-span-3">{state.error}</p> : null}
  </form>
}

export function MetaConnections({ studios, accounts }: { studios: Studio[]; accounts: Account[] }) {
  const [accountName, setAccountName] = useState("")
  const connectHref = accountName.trim().length >= 2 ? `/api/integrations/meta/connect?accountName=${encodeURIComponent(accountName.trim())}` : null
  return <div id="meta-connections" className="space-y-5">
    {accounts.map(account => <div className="space-y-2 rounded-lg border p-3" key={account.id}>
      <div className="flex flex-wrap justify-between gap-2 text-sm"><div><strong>{account.account_name}</strong><p className="text-xs text-muted-foreground">{account.meta_user_name ?? "Meta account"} · {account.assets.length} assets</p></div><span className={account.connection_status === "connected" ? "text-emerald-700" : "text-amber-700"}>{account.has_credentials ? account.connection_status.replaceAll("_", " ") : "Credentials unavailable"}</span></div>
      {account.assets.length ? account.assets.map(asset => <AssetMapping key={`${asset.asset_type}-${asset.asset_id}`} asset={asset} studios={studios} />) : <p className="text-xs text-amber-700">No Meta business assets were visible to this account.</p>}
    </div>)}
    <div className="grid gap-4 rounded-lg border p-4">
      <div><h3 className="font-medium">Add a Meta connection</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Continue to Meta with the owner account that has access to the expected business portfolio. SASHA exchanges the temporary authorization for a long-lived credential, encrypts it in Vault, and discovers available assets automatically.</p></div>
      <label className="space-y-1 text-sm"><span>Connection label</span><Input placeholder="Duff studios Meta" value={accountName} onChange={event => setAccountName(event.target.value)} required /></label>
      <div>{connectHref ? <a className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90" href={connectHref}>Continue with Meta</a> : <Button type="button" disabled>Continue with Meta</Button>}</div>
    </div>
  </div>
}
