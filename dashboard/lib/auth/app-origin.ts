import "server-only"

export function getTrustedAppOrigin(requestOrigin?: string | null) {
  const configuredOrigin = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL
  const candidate = configuredOrigin ?? (process.env.NODE_ENV === "development" ? requestOrigin : null)

  if (!candidate) throw new Error("APP_URL is required for authentication links.")

  const url = new URL(candidate)
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production.")
  }

  return url.origin
}
