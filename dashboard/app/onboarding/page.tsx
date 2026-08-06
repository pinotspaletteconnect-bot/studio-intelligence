import { OnboardingForm } from "@/app/onboarding/onboarding-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { getAuthenticatedUser, requireOnboardingContext } from "@/lib/auth/session"

export default async function OnboardingPage() {
  const context = await requireOnboardingContext()
  const user = await getAuthenticatedUser()
  return (
    <AuthShell title="Secure your workspace" description="Confirm your profile and organization privacy preferences before viewing business data.">
      <OnboardingForm
        initialName={context.fullName ?? ""}
        canManageConsent={["owner", "administrator"].includes(context.role)}
        passwordAlreadyCreated={Boolean(user?.app_metadata?.onboarding_password_created_at)}
      />
    </AuthShell>
  )
}
