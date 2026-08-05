export const SESSION_ACTIVITY_COOKIE = "si-session-activity"
export const SESSION_IDLE_LIMIT_MS = 30 * 60 * 1000
export const SESSION_WARNING_MS = 5 * 60 * 1000
export const SESSION_ABSOLUTE_LIMIT_MS = 12 * 60 * 60 * 1000

function getSigningSecret() {
  const secret = process.env.SUPABASE_SERVER_SECRET
  if (!secret) throw new Error("Session policy signing secret is unavailable.")
  return secret
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function signature(timestamp: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSigningSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp)))
}

export async function createActivityCookieValue(timestamp = Date.now()) {
  const value = timestamp.toString()
  return `${value}.${await signature(value)}`
}

export async function readActivityTimestamp(cookieValue: string | undefined) {
  if (!cookieValue) return null
  const [timestamp, suppliedSignature, ...extra] = cookieValue.split(".")
  if (!timestamp || !suppliedSignature || extra.length || !/^\d+$/.test(timestamp)) return null

  const expectedSignature = await signature(timestamp)
  if (expectedSignature.length !== suppliedSignature.length) return null
  let difference = 0
  for (let index = 0; index < expectedSignature.length; index += 1) {
    difference |= expectedSignature.charCodeAt(index) ^ suppliedSignature.charCodeAt(index)
  }
  return difference === 0 ? Number(timestamp) : null
}

export const activityCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: Math.ceil(SESSION_ABSOLUTE_LIMIT_MS / 1000),
}
