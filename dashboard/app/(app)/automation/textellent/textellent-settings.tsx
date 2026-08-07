"use client"

import { useActionState, useState } from "react"
import { createTextellentAccount, saveClassAlertSettings, sendTextellentTestMessage, updateTextellentSender } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const defaultMessage = "Hi! Your class at {studio} on {class_date} at {class_time} currently has low enrollment and may be cancelled. We will contact you if the class is cancelled."

function Status({ state }: { state: { complete?: boolean; error?: string } | undefined }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>
  if (state?.complete) return <p className="text-sm text-emerald-600">Saved.</p>
  return null
}

export function TextellentTestForm({ accounts }: { accounts: Array<{ id: number; account_name: string; sender_number: string }> }) {
  const [state, action, pending] = useActionState(sendTextellentTestMessage, undefined)
  return <form action={action} className="grid gap-4 md:grid-cols-2">
    <label className="space-y-1 text-sm md:col-span-2"><span>Textellent connection</span><select name="textellentAccountId" defaultValue="" required className="h-9 w-full rounded-md border bg-background px-3"><option value="" disabled>Select a connection</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.account_name} · {account.sender_number}</option>)}</select></label>
    <label className="space-y-1 text-sm"><span>Test recipient number</span><Input name="recipientNumber" type="tel" placeholder="+15025551212" autoComplete="tel" required /><span className="block text-xs text-muted-foreground">Used for this send only. It is not stored.</span></label>
    <label className="space-y-1 text-sm"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
    <label className="space-y-1 text-sm md:col-span-2"><span>Test message</span><textarea name="message" defaultValue="This is a test of the SASHA low-enrollment class alert system. No action is needed." maxLength={1000} required className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" /></label>
    <label className="flex items-start gap-2 text-sm md:col-span-2"><input name="confirmSend" type="checkbox" required className="mt-1" /><span>I understand that clicking Send one test will immediately send a real text to the test recipient.</span></label>
    <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending || !accounts.length}>{pending ? "Sending…" : "Send one test"}</Button>{state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}{state?.complete ? <p role="status" className="text-sm text-emerald-600">Textellent accepted the test message.</p> : null}</div>
  </form>
}

export function TextellentAccountForm() {
  const [state, action, pending] = useActionState(createTextellentAccount, undefined)
  return <form action={action} className="grid gap-4 md:grid-cols-2">
    <label className="space-y-1 text-sm"><span>Account label</span><Input name="accountName" placeholder="St. Matthews Textellent" required /></label>
    <label className="space-y-1 text-sm"><span>Sending number</span><Input name="senderNumber" placeholder="+15025551212" required /></label>
    <label className="space-y-1 text-sm"><span>API authentication code</span><Input name="authCode" type="password" autoComplete="off" required /></label>
    <label className="space-y-1 text-sm"><span>Your SASHA password</span><Input name="currentPassword" type="password" autoComplete="current-password" required /></label>
    <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add secure connection"}</Button><Status state={state} /></div>
  </form>
}

export function TextellentSenderForm({ account }: { account: { id: number; account_name: string; sender_number: string } }) {
  const [state, action, pending] = useActionState(updateTextellentSender, undefined)
  return <form action={action} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
    <input type="hidden" name="accountId" value={account.id} />
    <label className="flex-1 space-y-1 text-sm"><span>{account.account_name} sending number</span><Input name="senderNumber" defaultValue={account.sender_number} required /></label>
    <div className="flex items-center gap-3"><Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Update number"}</Button><Status state={state} /></div>
  </form>
}

export function StudioAlertForm({ studio, accounts, assignment, setting }: { studio: { id: number; studio_name: string; timezone: string }; accounts: Array<{ id: number; account_name: string; sender_number: string }>; assignment?: { textellent_account_id: number }; setting?: { enabled: boolean; minimum_reservations: number; lead_hours: number; earliest_send_time: string; message_template: string; updated_at: string } }) {
  const [state, action, pending] = useActionState(saveClassAlertSettings, undefined)
  const savedAccountId = assignment?.textellent_account_id.toString() ?? ""
  const [selectedAccountId, setSelectedAccountId] = useState(savedAccountId)

  return <form action={action} className="space-y-4 rounded-lg border p-4">
    <input type="hidden" name="studioId" value={studio.id} />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">{studio.studio_name}</h3><p className="text-xs text-muted-foreground">{studio.timezone}</p></div><label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={setting?.enabled ?? false} /> Enabled</label></div>
    <label className="block space-y-1 text-sm"><span>Textellent connection and sending number</span><select name="textellentAccountId" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} required className="h-9 w-full rounded-md border bg-background px-3"><option value="" disabled>Select a connection</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.account_name} · {account.sender_number}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-1 text-sm"><span>Minimum reservations</span><Input name="minimumReservations" type="number" min={2} max={21} defaultValue={setting?.minimum_reservations ?? 3} /><span className="block text-xs text-muted-foreground">Text attendees when enrollment is below this number.</span></label><label className="space-y-1 text-sm"><span>Hours before class</span><Input name="leadHours" type="number" min={1} max={48} defaultValue={setting?.lead_hours ?? 6} /></label><label className="space-y-1 text-sm"><span>Earliest send</span><Input name="earliestSendTime" type="time" defaultValue={(setting?.earliest_send_time ?? "08:00").slice(0, 5)} /></label></div>
    <label className="block space-y-1 text-sm"><span>Message</span><textarea name="messageTemplate" defaultValue={setting?.message_template ?? defaultMessage} maxLength={1000} className="min-h-28 w-full rounded-md border bg-background p-3 text-sm" /></label>
    <p className="text-xs text-muted-foreground">Available fields: {"{studio}"}, {"{class_name}"}, {"{class_date}"}, {"{class_time}"}, {"{reservations}"}. DIY Pop in and Paint, private parties, mobile parties, and marketing events are excluded.</p>
    <div className="flex items-center gap-3"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save studio settings"}</Button><Status state={state} /></div>
  </form>
}
