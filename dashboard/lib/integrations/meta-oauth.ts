import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

type MetaOauthState = { organizationId: number; userId: string; accountName: string; expiresAt: number }

function metaOauthConfiguration() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const stateSecret = process.env.META_OAUTH_STATE_SECRET
  if (!appId || !appSecret || !stateSecret) throw new Error("Meta OAuth is not configured")
  return { appId, appSecret, stateSecret, graphVersion: process.env.META_GRAPH_VERSION ?? "v25.0" }
}

export function createMetaOauthState(input: Omit<MetaOauthState, "expiresAt">) {
  const { stateSecret } = metaOauthConfiguration()
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 })).toString("base64url")
  const signature = createHmac("sha256", stateSecret).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readMetaOauthState(value: string): MetaOauthState {
  const { stateSecret } = metaOauthConfiguration()
  const [payload, suppliedSignature] = value.split(".")
  if (!payload || !suppliedSignature) throw new Error("Invalid Meta OAuth state")
  const expectedSignature = createHmac("sha256", stateSecret).update(payload).digest("base64url")
  const left = Buffer.from(expectedSignature); const right = Buffer.from(suppliedSignature)
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("Invalid Meta OAuth state")
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MetaOauthState
  if (!Number.isSafeInteger(parsed.organizationId) || !parsed.userId || !parsed.accountName || parsed.expiresAt < Date.now()) throw new Error("Expired Meta OAuth state")
  return parsed
}

export function metaOauthClient() { return metaOauthConfiguration() }
