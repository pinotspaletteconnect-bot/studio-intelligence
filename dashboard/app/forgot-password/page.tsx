import { ResetRequestForm } from "@/app/forgot-password/reset-request-form"
import { AuthShell } from "@/components/auth/auth-shell"

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" description="We’ll send a secure, time-limited link if the account exists.">
      <ResetRequestForm />
    </AuthShell>
  )
}
