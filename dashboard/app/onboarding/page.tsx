import { OnboardingForm } from "@/app/onboarding/onboarding-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { requireOnboardingContext } from "@/lib/auth/session"

export default async function OnboardingPage() {
  const context = await requireOnboardingContext()
  return (
    <AuthShell title="Secure your workspace" description="Confirm your profile and organization privacy preferences before viewing business data.">
      <OnboardingForm
        initialName={context.fullName ?? ""}
        canManageConsent={["owner", "administrator"].includes(context.role)}
      />
    </AuthShell>
  )
}
