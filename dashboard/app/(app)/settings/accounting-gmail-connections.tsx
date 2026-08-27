"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Account = {
  id: number
  connection_name: string
  account_email: string
  connection_status: string
  has_credentials: boolean
  last_received_at: string | null
  last_validated_at: string | null
}

export function AccountingGmailConnections({ accounts }: { accounts: Account[] }) {
  const [connectionName, setConnectionName] = useState("")
  const connectHref = connectionName.trim().length >= 2
    ? `/api/integrations/accounting-gmail/connect?connectionName=${encodeURIComponent(connectionName.trim())}`
    : null

  return <div className="space-y-5">
    <div className="space-y-2">
      {accounts.map(account => <div className="rounded-lg border p-3" key={account.id}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div><strong>{account.connection_name}</strong><p className="text-xs text-muted-foreground">{account.account_email}</p></div>
          <div className="flex items-center gap-3">
            <span className={account.connection_status === "connected" && account.has_credentials ? "text-emerald-700" : "text-amber-700"}>{account.has_credentials ? account.connection_status.replaceAll("_", " ") : "Credentials unavailable"}</span>
            <a className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium hover:bg-muted" href={`/api/integrations/accounting-gmail/connect?connectionName=${encodeURIComponent(account.connection_name)}`}>Reconnect</a>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Read-only receipt access · {account.last_received_at ? `Last receipt ${new Date(account.last_received_at).toLocaleString()}` : "No receipts collected yet"}</p>
      </div>)}
      {accounts.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No receipt Gmail accounts are connected. Four independent mailbox connections are expected for the initial rollout.</p> : null}
    </div>
    <div className="grid gap-4 rounded-lg border p-4">
      <div><h3 className="font-medium">Connect a receipt Gmail account</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Connect one mailbox at a time. Google will show which Gmail login is being authorized. SASHA requests read-only access and encrypts the refresh credential in Vault.</p></div>
      <label className="space-y-1 text-sm"><span>Mailbox label</span><Input placeholder="Gilbert receipts" value={connectionName} onChange={event => setConnectionName(event.target.value)} required /></label>
      <div>{connectHref ? <a className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90" href={connectHref}>Continue with Google</a> : <Button type="button" disabled>Continue with Google</Button>}</div>
    </div>
  </div>
}

