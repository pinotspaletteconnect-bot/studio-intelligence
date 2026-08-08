"use client"

import { useEffect } from "react"

const AUTH_LINK_KEYS = ["access_token", "refresh_token", "token_hash", "code"]

export function InviteLinkBridge() {
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const hasAuthLink = AUTH_LINK_KEYS.some((key) => fragment.has(key) || query.has(key))
    const isAuthFlow = [fragment.get("type"), query.get("type")].some((type) =>
      type === "invite" || type === "recovery" || type === "signup"
    )

    if (!hasAuthLink && !isAuthFlow) return

    window.location.replace(`/reset-password${window.location.search}${window.location.hash}`)
  }, [])

  return null
}
