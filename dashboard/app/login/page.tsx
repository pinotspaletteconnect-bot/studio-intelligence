import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/app/login/login-form"
import { InviteLinkBridge } from "@/app/login/invite-link-bridge"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const timeoutMessage = reason === "inactive"
    ? "You were signed out after 30 minutes without activity."
    : reason === "maximum"
      ? "You were signed out because the 12-hour session limit was reached."
      : null

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your organization’s private business intelligence workspace."
    >
      <InviteLinkBridge />
      {timeoutMessage ? (
        <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {timeoutMessage}
        </p>
      ) : null}
      <LoginForm />
    </AuthShell>
  )
}
