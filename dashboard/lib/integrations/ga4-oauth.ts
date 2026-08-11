import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

type Ga4OauthState = {
  organizationId: number
  userId: string
  accountName: string
  expiresAt: number
}

function oauthConfiguration() {
  const clientId = process.env.GA4_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GA4_GOOGLE_CLIENT_SECRET
  const stateSecret = process.env.GA4_OAUTH_STATE_SECRET
  if (!clientId || !clientSecret || !stateSecret) {
    throw new Error("GA4 OAuth is not configured")
  }
  return { clientId, clientSecret, stateSecret }
}

export function createGa4OauthState(input: Omit<Ga4OauthState, "expiresAt">) {
  const { stateSecret } = oauthConfiguration()
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 })).toString("base64url")
  const signature = createHmac("sha256", stateSecret).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readGa4OauthState(value: string): Ga4OauthState {
  const { stateSecret } = oauthConfiguration()
  const [payload, suppliedSignature] = value.split(".")
  if (!payload || !suppliedSignature) throw new Error("Invalid GA4 OAuth state")
  const expectedSignature = createHmac("sha256", stateSecret).update(payload).digest("base64url")
  const left = Buffer.from(expectedSignature); const right = Buffer.from(suppliedSignature)
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("Invalid GA4 OAuth state")
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Ga4OauthState
  if (!Number.isSafeInteger(parsed.organizationId) || !parsed.userId || !parsed.accountName || parsed.expiresAt < Date.now()) {
    throw new Error("Expired GA4 OAuth state")
  }
  return parsed
}

export function ga4OauthClient() {
  return oauthConfiguration()
}

