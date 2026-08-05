"use client"

import { useActionState } from "react"

import { inviteOrganizationUser } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InviteUserForm({
  studios,
}: {
  studios: Array<{ id: number; studio_name: string }>
}) {
  const [state, action, pending] = useActionState(inviteOrganizationUser, undefined)
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" autoComplete="off" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <select id="invite-role" name="role" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" defaultValue="viewer">
            <option value="administrator">Administrator — all studios</option>
            <option value="manager">Manager — assigned studios</option>
            <option value="viewer">Viewer — assigned studios</option>
          </select>
        </div>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Studio access</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {studios.map((studio) => (
            <label key={studio.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Checkbox name="studioIds" value={studio.id.toString()} />
              {studio.studio_name}
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
      {state?.complete ? <p role="status" className="text-sm text-emerald-700">Invitation sent securely.</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Sending…" : "Send invitation"}</Button>
    </form>
  )
}
