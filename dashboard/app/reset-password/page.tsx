import { ResetPasswordForm } from "@/app/reset-password/reset-password-form"
import { AuthShell } from "@/components/auth/auth-shell"

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Create your permanent password" description="Replace your temporary password with a unique password of at least 12 characters.">
      <ResetPasswordForm />
    </AuthShell>
  )
}
