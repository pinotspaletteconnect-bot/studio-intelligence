"use client"

import Link from "next/link"
import { useActionState } from "react"

import { acceptCurrentLegalDocuments } from "@/app/legal/accept/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export function AcceptanceForm() {
  const [state, action, pending] = useActionState(acceptCurrentLegalDocuments, undefined)
  return <form action={action} className="space-y-4">
    <label className="flex items-start gap-3 rounded-xl border p-4 text-sm leading-6"><Checkbox name="acceptTerms" required /><span>I have read and accept the <Link className="font-medium text-primary underline" href="/terms" target="_blank">Terms of Service</Link>.</span></label>
    <label className="flex items-start gap-3 rounded-xl border p-4 text-sm leading-6"><Checkbox name="acceptPrivacy" required /><span>I have read and acknowledge the <Link className="font-medium text-primary underline" href="/privacy" target="_blank">Privacy Policy</Link>.</span></label>
    {state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <Button className="w-full" disabled={pending}>{pending ? "Recording acceptance…" : "Accept and continue"}</Button>
  </form>
}
