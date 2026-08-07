"use client"

import { useActionState } from "react"
import { createTextellentAccount, updateTextellentSender } from "@/app/(app)/automation/textellent/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function Status({ state }: { state: { complete?: boolean; error?: string } | undefined }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>
  if (state?.complete) return <p className="text-sm text-emerald-600">Saved.</p>
  return null
}

export function TextellentConnections({ accounts }: { accounts: Array<{ id: number; account_name: string; description: string | null; sender_number: string }> }) {
  const [state, action, pending] = useActionState(createTextellentAccount, undefined)
  return <div className="space-y-4">
    {accounts.map(account => <ConnectionEditor key={account.id} account={account} />)}
    <div className="rounded-lg border border-dashed p-4">
      <h3 className="font-medium">{accounts.length ? "Add another Textellent API connection" : "Add a Textellent API connection"}</h3>
      <form action={action} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span>Account label</span><Input name="accountName" placeholder="St. Matthews Textellent" required /></label>
        <label className="space-y-1 text-sm"><span>Sending number</span><Input name="senderNumber" placeholder="+15025551212" required /></label>
        <label className="space-y-1 text-sm md:col-span-2"><span>Used by</span><Input name="description" placeholder="Used by St. Matthews and Jeffersonville" maxLength={500} /></label>
        <label className="space-y-1 text-sm"><span>API authentication code</span><Input name="authCode" type="password" autoComplete="off" required /></label>
        <label className="space-y-1 text-sm"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add connection"}</Button><Status state={state} /></div>
      </form>
    </div>
  </div>
}

function ConnectionEditor({ account }: { account: { id: number; account_name: string; description: string | null; sender_number: string } }) {
  const [state, action, pending] = useActionState(updateTextellentSender, undefined)
  return <form action={action} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
    <input type="hidden" name="accountId" value={account.id} />
    <label className="space-y-1 text-sm"><span>{account.account_name} sending number</span><Input name="senderNumber" defaultValue={account.sender_number} required /></label>
    <label className="space-y-1 text-sm"><span>Used by</span><Input name="description" defaultValue={account.description ?? ""} maxLength={500} /></label>
    <div className="flex items-center gap-3"><Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button><Status state={state} /></div>
  </form>
}
