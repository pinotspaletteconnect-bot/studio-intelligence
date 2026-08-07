"use client"

import { useActionState } from "react"

import { replacePtsCredentials } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function PtsConnections({ accounts }: { accounts: Array<{ id: number; account_name: string; has_credentials: boolean; last_validated_at: string | null }> }) {
  return <div className="space-y-4">
    {accounts.map(account => <PtsConnectionForm key={account.id} account={account} />)}
  </div>
}

function PtsConnectionForm({ account }: { account: { id: number; account_name: string; has_credentials: boolean; last_validated_at: string | null } }) {
  const [state, action, pending] = useActionState(replacePtsCredentials, undefined)
  return <form action={action} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
    <input type="hidden" name="accountId" value={account.id} />
    <div className="md:col-span-2">
      <h3 className="font-medium">{account.account_name}</h3>
      <p className="text-xs text-muted-foreground">{account.has_credentials ? "Encrypted credentials saved" : "Credentials required"}{account.last_validated_at ? ` · Last validated ${new Date(account.last_validated_at).toLocaleString()}` : ""}</p>
    </div>
    <label className="space-y-1 text-sm"><span>PTS username</span><Input name="ptsUsername" autoComplete="off" required /></label>
    <label className="space-y-1 text-sm"><span>PTS password</span><Input name="ptsPassword" type="password" autoComplete="new-password" required /></label>
    <label className="space-y-1 text-sm md:col-span-2"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /><span className="block text-xs text-muted-foreground">Required to protect changes to stored credentials.</span></label>
    <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Encrypting…" : account.has_credentials ? "Replace credentials" : "Save credentials"}</Button>{state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}{state?.complete ? <p role="status" className="text-sm text-emerald-600">Encrypted credentials saved.</p> : null}</div>
  </form>
}
