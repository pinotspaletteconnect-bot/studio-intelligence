"use client"

import { useActionState, useState } from "react"

import { assignQuickBooksConnection } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Studio = { id: number; studio_name: string }
type ChartAccount = {
  source_account_id: string
  account_number: string | null
  account_name: string
  fully_qualified_name: string | null
  account_type: string
  account_subtype: string | null
  is_active: boolean
  review_status: string
  canonical_account_key: string | null
  recommendation: string | null
  retrieved_at: string
}
type Connection = {
  id: number
  connection_name: string
  realm_id: string
  company_name: string | null
  connection_status: string
  write_enabled: boolean
  has_credentials: boolean
  last_synced_at: string | null
  assignments: Array<{ studio_id: number; studio_name: string | null }>
  accounts: ChartAccount[]
}

function CompanyMapping({ connection, studios }: { connection: Connection; studios: Studio[] }) {
  const [state, action, pending] = useActionState(assignQuickBooksConnection, undefined)
  const mappedStudioIds = new Set(connection.assignments.map(assignment => assignment.studio_id))
  return <form action={action} className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="connectionId" value={connection.id} />
    <div className="text-sm"><strong>Studio assignments</strong><p className="text-xs text-muted-foreground">{connection.assignments.length ? connection.assignments.map(assignment => assignment.studio_name ?? `Studio ${assignment.studio_id}`).join(", ") : "No studio assigned"}</p></div>
    <select className="h-9 rounded-md border bg-background px-3 text-sm" name="studioId" required defaultValue=""><option value="" disabled>Select another studio</option>{studios.filter(studio => !mappedStudioIds.has(studio.id)).map(studio => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select>
    <Button size="sm" disabled={pending || mappedStudioIds.size === studios.length}>{pending ? "Saving…" : "Assign"}</Button>
    {state?.error ? <p className="text-xs text-destructive sm:col-span-3">{state.error}</p> : null}
  </form>
}

function ChartReview({ accounts }: { accounts: ChartAccount[] }) {
  const pending = accounts.filter(account => account.review_status === "pending").length
  return <details className="rounded-md border">
    <summary className="cursor-pointer list-none p-3 text-sm font-medium [&::-webkit-details-marker]:hidden">Chart of accounts · {accounts.length} accounts · {pending} awaiting review</summary>
    <div className="max-h-96 overflow-auto border-t">
      {accounts.length ? <table className="w-full min-w-3xl text-left text-xs"><thead className="sticky top-0 bg-background"><tr><th className="p-2">Number</th><th className="p-2">Account</th><th className="p-2">Type</th><th className="p-2">Subtype</th><th className="p-2">Status</th></tr></thead><tbody>{accounts.map(account => <tr className="border-t" key={account.source_account_id}><td className="p-2 tabular-nums">{account.account_number ?? "—"}</td><td className="p-2"><span className={account.is_active ? "" : "text-muted-foreground line-through"}>{account.fully_qualified_name ?? account.account_name}</span>{account.canonical_account_key ? <p className="text-muted-foreground">Canonical: {account.canonical_account_key}</p> : null}</td><td className="p-2">{account.account_type}</td><td className="p-2">{account.account_subtype ?? "—"}</td><td className="p-2">{account.review_status.replaceAll("_", " ")}</td></tr>)}</tbody></table> : <p className="p-4 text-sm text-muted-foreground">The chart will appear after the first successful read-only account import.</p>}
    </div>
  </details>
}

export function QuickBooksConnections({ accounts, studios }: { accounts: Connection[]; studios: Studio[] }) {
  const [connectionName, setConnectionName] = useState("")
  const connectHref = connectionName.trim().length >= 2 ? `/api/integrations/quickbooks/connect?connectionName=${encodeURIComponent(connectionName.trim())}` : null
  return <div className="space-y-5">
    {accounts.map(connection => <div className="space-y-3 rounded-lg border p-3" key={connection.id}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><strong>{connection.company_name ?? connection.connection_name}</strong><p className="text-xs text-muted-foreground">{connection.connection_name} · Realm {connection.realm_id}</p></div><div className="flex items-center gap-3"><span className={connection.connection_status === "connected" && connection.has_credentials ? "text-emerald-700" : "text-amber-700"}>{connection.has_credentials ? connection.connection_status.replaceAll("_", " ") : "Credentials unavailable"}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">Read only</span><a className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium hover:bg-muted" href={`/api/integrations/quickbooks/connect?connectionName=${encodeURIComponent(connection.connection_name)}`}>Reconnect</a></div></div>
      <CompanyMapping connection={connection} studios={studios} />
      <ChartReview accounts={connection.accounts} />
    </div>)}
    {accounts.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No QuickBooks companies are connected. Four independent company connections are expected for the initial rollout.</p> : null}
    <div className="grid gap-4 rounded-lg border p-4"><div><h3 className="font-medium">Connect a QuickBooks company</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Authorize one company at a time using the shared Intuit login. The selected company remains a separate realm and is locked to read-only operation.</p></div><label className="space-y-1 text-sm"><span>Company connection label</span><Input placeholder="Gilbert QuickBooks" value={connectionName} onChange={event => setConnectionName(event.target.value)} required /></label><div>{connectHref ? <a className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90" href={connectHref}>Continue with Intuit</a> : <Button type="button" disabled>Continue with Intuit</Button>}</div></div>
  </div>
}

