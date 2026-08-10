"use client"

import { useActionState } from "react"

import { setClasspopEnabled } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"

type StudioSetting = {
  integrationId: number
  studioId: number
  studioName: string
  classpopEnabled: boolean
}

function StudioClasspopSetting({ setting }: { setting: StudioSetting }) {
  const [state, action, pending] = useActionState(setClasspopEnabled, undefined)
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <input type="hidden" name="integrationId" value={setting.integrationId} />
      <div>
        <p className="font-medium">{setting.studioName}</p>
        <p className="text-xs text-muted-foreground">Collect and add recognized ClassPop credits to this studio&apos;s class revenue.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input name="classpopEnabled" type="checkbox" defaultChecked={setting.classpopEnabled} />
          Uses ClassPop
        </label>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        {state?.error ? <span role="alert" className="text-xs text-destructive">{state.error}</span> : null}
        {state?.complete ? <span role="status" className="text-xs text-emerald-700">Saved</span> : null}
      </div>
    </form>
  )
}

export function ClasspopSettings({ settings }: { settings: StudioSetting[] }) {
  return <div className="space-y-3">{settings.map((setting) => <StudioClasspopSetting key={setting.integrationId} setting={setting} />)}</div>
}
