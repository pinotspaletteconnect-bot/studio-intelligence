import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

type QuickBooksOauthState = {
  organizationId: number
  userId: string
  connectionName: string
  expiresAt: number
}

function quickBooksOauthConfiguration() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
  const stateSecret = process.env.QUICKBOOKS_OAUTH_STATE_SECRET
  const environment = process.env.QUICKBOOKS_ENVIRONMENT ?? "sandbox"

  if (!clientId || !clientSecret || !stateSecret) {
    throw new Error("QuickBooks OAuth is not configured")
  }
  if (!(["sandbox", "production"] as string[]).includes(environment)) {
    throw new Error("QuickBooks environment must be sandbox or production")
  }

  return {
    clientId,
    clientSecret,
    stateSecret,
    apiBaseUrl:
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com",
  }
}

export function createQuickBooksOauthState(
  input: Omit<QuickBooksOauthState, "expiresAt">,
) {
  const { stateSecret } = quickBooksOauthConfiguration()
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url")
  const signature = createHmac("sha256", stateSecret)
    .update(payload)
    .digest("base64url")
  return `${payload}.${signature}`
}

export function readQuickBooksOauthState(value: string): QuickBooksOauthState {
  const { stateSecret } = quickBooksOauthConfiguration()
  const [payload, suppliedSignature] = value.split(".")
  if (!payload || !suppliedSignature) {
    throw new Error("Invalid QuickBooks OAuth state")
  }

  const expectedSignature = createHmac("sha256", stateSecret)
    .update(payload)
    .digest("base64url")
  const left = Buffer.from(expectedSignature)
  const right = Buffer.from(suppliedSignature)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid QuickBooks OAuth state")
  }

  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as QuickBooksOauthState
  if (
    !Number.isSafeInteger(parsed.organizationId) ||
    !parsed.userId ||
    !parsed.connectionName ||
    parsed.expiresAt < Date.now()
  ) {
    throw new Error("Expired QuickBooks OAuth state")
  }
  return parsed
}

export function quickBooksOauthClient() {
  return quickBooksOauthConfiguration()
}

