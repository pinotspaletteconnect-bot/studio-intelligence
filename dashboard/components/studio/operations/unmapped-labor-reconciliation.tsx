"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type UnmappedLaborEntry = {
  studio_id: number
  studio_name: string
  labor_date: string
  role_name: string
  actualHours: number
  actualCost: number
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

export function UnmappedLaborReconciliation({ entries }: { entries: UnmappedLaborEntry[] }) {
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ key: string; error?: string } | null>(null)
  const [roleOptions, setRoleOptions] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/settings/homebase-roles")
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setRoleOptions((result.roles ?? []).map((role: { role_name: string }) => role.role_name).filter(Boolean))
      })
      .catch(() => setRoleOptions([]))
  }, [])

  async function save(event: React.FormEvent<HTMLFormElement>, entry: UnmappedLaborEntry) {
    event.preventDefault()
    const key = `${entry.studio_id}-${entry.labor_date}`
    const form = new FormData(event.currentTarget)
    setSavingKey(key)
    setMessage(null)
    try {
      const resolution = String(form.get("resolution"))
      const response = await fetch("/api/operations/labor-reconciliation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studioId: entry.studio_id,
          laborDate: entry.labor_date,
          resolution,
          roleName: resolution === "assign_role" ? String(form.get("roleName")) : null,
          actualHours: Number(form.get("actualHours")),
          actualCost: Number(form.get("actualCost")),
          note: String(form.get("note")),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setMessage({ key })
      window.location.reload()
    } catch (error) {
      setMessage({ key, error: error instanceof Error ? error.message : "Unable to save correction." })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="mt-3 max-h-[32rem] space-y-3 overflow-auto">
      {entries.map((entry) => {
        const key = `${entry.studio_id}-${entry.labor_date}`
        return (
          <form key={key} onSubmit={(event) => save(event, entry)} className="grid gap-3 rounded-lg border p-3 text-sm lg:grid-cols-[1fr_1fr_1.2fr_100px_120px_1.4fr_auto] lg:items-end">
            <div><span className="block text-xs text-muted-foreground">Date</span>{date.format(new Date(`${entry.labor_date}T00:00:00Z`))}</div>
            <div><span className="block text-xs text-muted-foreground">Studio</span>{entry.studio_name}</div>
            <div><span className="block text-xs text-muted-foreground">Source</span>{entry.role_name || "Unnamed daily total"}</div>
            <label><span className="block text-xs text-muted-foreground">Hours</span><Input name="actualHours" type="number" min="0" step="0.01" defaultValue={entry.actualHours} required /></label>
            <label><span className="block text-xs text-muted-foreground">Cost</span><Input name="actualCost" type="number" min="0" step="0.01" defaultValue={entry.actualCost} required /></label>
            <label><span className="block text-xs text-muted-foreground">Resolution</span><select name="resolution" defaultValue="assign_role" className="h-8 w-full rounded-md border bg-background px-2"><option value="assign_role">Assign to source role</option><option value="exclude">Exclude duplicate/error</option><option value="cogs">Correct as COGS only</option><option value="overhead">Correct as overhead only</option></select></label>
            <Button type="submit" size="sm" disabled={savingKey === key}>{savingKey === key ? "Saving…" : "Reconcile"}</Button>
            <label className="lg:col-span-3"><span className="block text-xs text-muted-foreground">Homebase role (required when assigning)</span><Input name="roleName" list="homebase-role-options" placeholder="Select or enter the source role" /><datalist id="homebase-role-options">{roleOptions.map(role=><option key={role} value={role}/>)}</datalist></label>
            <label className="lg:col-span-4"><span className="block text-xs text-muted-foreground">Required reconciliation note</span><Input name="note" placeholder={`Explain the correction to ${entry.actualHours.toFixed(1)} hours / ${money.format(entry.actualCost)}`} maxLength={500} required /></label>
            {message?.key === key && message.error ? <p role="alert" className="text-destructive lg:col-span-7">{message.error}</p> : null}
          </form>
        )
      })}
    </div>
  )
}
