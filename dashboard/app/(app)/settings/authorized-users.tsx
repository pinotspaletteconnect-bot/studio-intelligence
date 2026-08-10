"use client"

import { useActionState, useState } from "react"

import {
  suspendOrganizationUser,
  resendOrganizationSetup,
  updateOrganizationUserAccess,
} from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type Member = {
  user_id: string
  name: string
  email: string
  role: string
  status: string
  studioIds: number[]
}

function AuthorizedUserRow({
  member,
  studios,
  actorId,
  actorRole,
}: {
  member: Member
  studios: Array<{ id: number; studio_name: string }>
  actorId: string
  actorRole: string
}) {
  const [editing, setEditing] = useState(false)
  const [role, setRole] = useState(member.role)
  const [updateState, updateAction, updating] = useActionState(updateOrganizationUserAccess, undefined)
  const [removeState, removeAction, removing] = useActionState(suspendOrganizationUser, undefined)
  const [setupState, setupAction, sendingSetup] = useActionState(resendOrganizationSetup, undefined)
  const isSelf = member.user_id === actorId
  const canEdit = !isSelf && member.role !== "owner" && (
    actorRole === "owner" || (actorRole === "administrator" && ["manager", "viewer"].includes(member.role))
  )

  return (
    <div className="rounded-lg border p-4 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium">{member.name}</div>
          <div className="text-muted-foreground">{member.email}</div>
          <div className="mt-1 capitalize text-muted-foreground">{member.role} · {member.status}</div>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {member.status === "invited" ? (
              <form action={setupAction}>
                <input type="hidden" name="userId" value={member.user_id} />
                <Button type="submit" variant="outline" size="sm" disabled={sendingSetup}>{sendingSetup ? "Issuing…" : "Issue temporary password"}</Button>
              </form>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
              {editing ? "Cancel" : "Edit permissions"}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{isSelf ? "Your account" : "Protected owner"}</span>
        )}
      </div>
      {setupState?.error ? <p role="alert" className="mt-3 text-red-700">{setupState.error}</p> : null}
      {setupState?.complete && setupState.temporaryPassword ? (
        <div role="status" className="mt-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="font-medium">Copy this new temporary password now.</p>
          <code className="block select-all break-all rounded bg-white p-3 font-mono text-base">{setupState.temporaryPassword}</code>
          <p>It is shown only once, expires after 24 hours, and replaces the previous temporary password.</p>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-5 space-y-5 border-t pt-5">
          <form action={updateAction} className="space-y-5">
            <input type="hidden" name="userId" value={member.user_id} />
            <div className="space-y-2">
              <Label htmlFor={`role-${member.user_id}`}>Role</Label>
              <select
                id={`role-${member.user_id}`}
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm sm:max-w-sm"
              >
                {actorRole === "owner" ? <option value="administrator">Administrator — all studios</option> : null}
                <option value="manager">Manager — assigned studios</option>
                <option value="viewer">Viewer — assigned studios</option>
              </select>
            </div>
            {role !== "administrator" ? (
              <fieldset className="space-y-3">
                <legend className="font-medium">Studio access</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {studios.map((studio) => (
                    <label key={studio.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        name="studioIds"
                        value={studio.id.toString()}
                        defaultChecked={member.studioIds.includes(studio.id)}
                      />
                      {studio.studio_name}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            {updateState?.error ? <p role="alert" className="text-red-700">{updateState.error}</p> : null}
            {updateState?.complete ? <p role="status" className="text-emerald-700">Permissions saved.</p> : null}
            <Button disabled={updating} type="submit">{updating ? "Saving…" : "Save permissions"}</Button>
          </form>

          <form action={removeAction} className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <input type="hidden" name="userId" value={member.user_id} />
            <div>
              <div className="font-medium text-red-800">Remove dashboard access</div>
              <div className="text-muted-foreground">This suspends the organization membership and preserves its audit history.</div>
              {removeState?.error ? <p role="alert" className="mt-2 text-red-700">{removeState.error}</p> : null}
            </div>
            <Button
              disabled={removing}
              type="submit"
              variant="destructive"
              onClick={(event) => {
                if (!window.confirm(`Remove dashboard access for ${member.email}?`)) event.preventDefault()
              }}
            >
              {removing ? "Removing…" : "Remove user"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export function AuthorizedUsers({
  members,
  studios,
  actorId,
  actorRole,
}: {
  members: Member[]
  studios: Array<{ id: number; studio_name: string }>
  actorId: string
  actorRole: string
}) {
  return (
    <div className="space-y-3">
      {members.map((member) => (
        <AuthorizedUserRow
          key={member.user_id}
          member={member}
          studios={studios}
          actorId={actorId}
          actorRole={actorRole}
        />
      ))}
    </div>
  )
}
