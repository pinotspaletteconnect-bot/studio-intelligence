import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/app/login/login-form"

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your organization’s private business intelligence workspace."
    >
      <LoginForm />
    </AuthShell>
  )
}
