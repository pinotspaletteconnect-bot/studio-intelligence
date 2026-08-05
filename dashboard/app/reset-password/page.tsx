import { ResetPasswordForm } from "@/app/reset-password/reset-password-form"
import { AuthShell } from "@/components/auth/auth-shell"

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" description="Your new password must be unique and at least 12 characters long.">
      <ResetPasswordForm />
    </AuthShell>
  )
}
