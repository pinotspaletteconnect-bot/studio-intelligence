import { AuthShell } from "@/components/auth/auth-shell"

export default function AccessPendingPage() {
  return (
    <AuthShell title="Access pending" description="Your identity is verified, but an administrator has not assigned an organization and studio access yet.">
      <p className="text-sm leading-6 text-slate-600">Contact your organization owner or Studio Intelligence administrator. No business data is available until access is explicitly granted.</p>
    </AuthShell>
  )
}
