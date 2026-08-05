"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { SESSION_IDLE_LIMIT_MS, SESSION_WARNING_MS } from "@/lib/auth/session-policy"

const HEARTBEAT_INTERVAL_MS = 60 * 1000

export function SessionTimeoutGuard() {
  const router = useRouter()
  const [warningOpen, setWarningOpen] = useState(false)
  const lastActivity = useRef(0)
  const lastHeartbeat = useRef(0)
  const endingSession = useRef(false)

  const endSession = useCallback(async (reason: "inactive" | "maximum" = "inactive") => {
    if (endingSession.current) return
    endingSession.current = true
    try {
      await fetch("/api/session/end", { method: "POST", credentials: "same-origin" })
    } finally {
      router.replace(`/login?reason=${reason}`)
      router.refresh()
    }
  }, [router])

  const heartbeat = useCallback(async () => {
    const now = Date.now()
    if (now - lastHeartbeat.current < HEARTBEAT_INTERVAL_MS) return
    lastHeartbeat.current = now
    const response = await fetch("/api/session/activity", { method: "POST", credentials: "same-origin" })
    if (response.status === 401) await endSession("maximum")
  }, [endSession])

  const recordActivity = useCallback(() => {
    lastActivity.current = Date.now()
    setWarningOpen(false)
    void heartbeat()
  }, [heartbeat])

  useEffect(() => {
    lastActivity.current = Date.now()
    void heartbeat()
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"]
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }))
    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current
      if (idleFor >= SESSION_IDLE_LIMIT_MS) {
        void endSession("inactive")
      } else if (idleFor >= SESSION_IDLE_LIMIT_MS - SESSION_WARNING_MS) {
        setWarningOpen(true)
      }
    }, 15_000)

    return () => {
      events.forEach((event) => window.removeEventListener(event, recordActivity))
      window.clearInterval(interval)
    }
  }, [endSession, heartbeat, recordActivity])

  if (!warningOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="session-warning-title">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
        <h2 id="session-warning-title" className="text-xl font-semibold">Your session is about to expire</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          For your security, you will be signed out after 30 minutes without activity.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => void endSession("inactive")}>Sign out now</Button>
          <Button onClick={recordActivity}>Stay signed in</Button>
        </div>
      </div>
    </div>
  )
}
