import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

type AccountingGmailOauthState = {
  organizationId: number
  userId: string
  connectionName: string
  expiresAt: number
}

function accountingGmailOauthConfiguration() {
  const clientId = process.env.ACCOUNTING_GMAIL_CLIENT_ID
  const clientSecret = process.env.ACCOUNTING_GMAIL_CLIENT_SECRET
  const stateSecret = process.env.ACCOUNTING_GMAIL_OAUTH_STATE_SECRET
  if (!clientId || !clientSecret || !stateSecret) {
    throw new Error("Accounting Gmail OAuth is not configured")
  }
  return { clientId, clientSecret, stateSecret }
}

export function createAccountingGmailOauthState(
  input: Omit<AccountingGmailOauthState, "expiresAt">,
) {
  const { stateSecret } = accountingGmailOauthConfiguration()
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url")
  const signature = createHmac("sha256", stateSecret)
    .update(payload)
    .digest("base64url")
  return `${payload}.${signature}`
}

export function readAccountingGmailOauthState(
  value: string,
): AccountingGmailOauthState {
  const { stateSecret } = accountingGmailOauthConfiguration()
  const [payload, suppliedSignature] = value.split(".")
  if (!payload || !suppliedSignature) {
    throw new Error("Invalid accounting Gmail OAuth state")
  }
  const expectedSignature = createHmac("sha256", stateSecret)
    .update(payload)
    .digest("base64url")
  const left = Buffer.from(expectedSignature)
  const right = Buffer.from(suppliedSignature)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid accounting Gmail OAuth state")
  }

  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as AccountingGmailOauthState
  if (
    !Number.isSafeInteger(parsed.organizationId) ||
    !parsed.userId ||
    !parsed.connectionName ||
    parsed.expiresAt < Date.now()
  ) {
    throw new Error("Expired accounting Gmail OAuth state")
  }
  return parsed
}

export function accountingGmailOauthClient() {
  return accountingGmailOauthConfiguration()
}

