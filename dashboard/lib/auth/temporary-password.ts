export function mustChangeTemporaryPassword(appMetadata: Record<string, unknown> | undefined) {
  return appMetadata?.temporary_password_must_change === true
}

export function temporaryPasswordExpired(appMetadata: Record<string, unknown> | undefined) {
  if (!mustChangeTemporaryPassword(appMetadata)) return false
  const expiresAt = appMetadata?.temporary_password_expires_at
  if (typeof expiresAt !== "string") return true
  const expiresAtMs = Date.parse(expiresAt)
  return !Number.isFinite(expiresAtMs) || Date.now() >= expiresAtMs
}
