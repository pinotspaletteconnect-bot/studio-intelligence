import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

import { PtsAccountForm } from "@/app/(app)/settings/onboarding/pts-account-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireDashboardContext } from "@/lib/auth/session"
import { getOnboardingReadiness } from "@/lib/services/onboarding-readiness"

function Status({ complete, label }: { complete: boolean; label?: string }) {
  return complete ? (
    <Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 />{label ?? "Complete"}</Badge>
  ) : (
    <Badge variant="outline" className="gap-1 border-amber-300 text-amber-800"><CircleAlert />{label ?? "Needs attention"}</Badge>
  )
}

function formatDate(value: string | null) {
  if (!value) return "Not received"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

function formatDateTime(value: string | null) {
  if (!value) return "Not validated"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value))
}

export default async function WorkspaceOnboardingPage() {
  const access = await requireDashboardContext()
  const canAdminister = ["owner", "administrator"].includes(access.role)
  const vaultOnboardingEnabled = process.env.PTS_VAULT_ONBOARDING_ENABLED === "true"
  const readiness = await getOnboardingReadiness(access.organizationId, access.allowedStudioIds)
  const setupChecks = Object.values(readiness.checks)
  const progress = Math.round((setupChecks.filter(Boolean).length / setupChecks.length) * 100)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{readiness.organization.name}</p>
          <h1 className="text-2xl font-semibold">Workspace setup readiness</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Complete each requirement, validate the encrypted PTS login, and confirm the first current upload for every studio before handing the workspace to users.</p>
        </div>
        <div className="min-w-64">
          <div className="mb-2 flex justify-between text-sm"><span>Controlled workspace readiness</span><span className="font-medium">{progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-900" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className={`flex items-start gap-3 rounded-xl border p-4 ${readiness.controlledReady ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
        {readiness.controlledReady ? <ShieldCheck className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
        <div>
          <p className="font-medium">{readiness.controlledReady ? "This workspace is ready for controlled use." : "This workspace still has setup requirements."}</p>
          <p className="mt-1 text-sm">Readiness uses current feed dates and validated credential state—not merely the existence of historical records.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="gap-3"><CardTitle className="text-base">1. Business structure</CardTitle><Status complete={readiness.checks.businessStructure} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.brands.length} brand{readiness.brands.length === 1 ? "" : "s"} · {readiness.studios.length} active studio{readiness.studios.length === 1 ? "" : "s"}</p>{canAdminister ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/settings#add-studio">Add or review studios</Link> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3"><CardTitle className="text-base">2. PTS credentials</CardTitle><Status complete={readiness.checks.credentials} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.accounts.filter(account => account.validated).length} of {readiness.accounts.length} active accounts validated.</p><div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><span>Credentials remain encrypted in Vault and cannot be viewed.</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3"><CardTitle className="text-base">3. Studio mappings</CardTitle><Status complete={readiness.checks.mappings} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.summary.validatedStudios} of {readiness.summary.totalStudios} studios mapped to a validated PTS account.</p>{canAdminister ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/settings#add-studio">Configure mapping</Link> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3"><CardTitle className="text-base">4. Authorized users</CardTitle><Status complete={readiness.checks.users} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.members.active} active · {readiness.members.invited} awaiting setup</p>{canAdminister ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/settings#authorized-users">Manage users</Link> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3"><CardTitle className="text-base">5. First collection</CardTitle><Status complete={readiness.checks.firstCollection} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.summary.dataReadyStudios} of {readiness.summary.totalStudios} studios current across all five feeds.</p><Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/data-status">Open upload status</Link></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Encrypted PTS account validation</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {readiness.accounts.length ? readiness.accounts.map(account => (
            <div key={account.id} className="rounded-lg border p-4 text-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{account.account_name}</p><p className="mt-1 text-xs text-muted-foreground">{account.mappedStudioCount} mapped studio{account.mappedStudioCount === 1 ? "" : "s"}</p></div><Status complete={account.validated} label={account.validated ? "Validated" : "Not validated"} /></div>
              <p className="mt-3 text-xs text-muted-foreground">{account.validationSource === "successful_collection" ? "Last successful credential-backed collection" : "Last credential validation"}: {formatDateTime(account.validatedAt)}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">No encrypted PTS account has been created.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Studio first-run readiness</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {readiness.studios.map(studio => (
            <div key={studio.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div><p className="font-medium">{studio.studio_name}</p><p className="text-xs text-muted-foreground">{studio.city}, {studio.state} · {studio.ptsAccountName ?? "No PTS account"}{studio.ptsLocationId ? ` · Location ${studio.ptsLocationId}` : ""}</p></div>
                <div className="flex flex-wrap gap-2"><Status complete={studio.hasPtsMapping && studio.credentialsValidated} label={studio.hasPtsMapping ? (studio.credentialsValidated ? "Connection ready" : "Credential not validated") : "Mapping missing"} /><Status complete={studio.firstRunComplete} label={studio.firstRunComplete ? "First run complete" : "Waiting for current data"} /></div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {studio.feeds.map(feed => (
                  <div key={feed.key} className={`rounded-lg border p-3 text-sm ${feed.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-center gap-2">{feed.ready ? <CheckCircle2 className="size-4 text-emerald-700" /> : <Clock3 className="size-4 text-amber-700" />}<span className="font-medium">{feed.name}</span></div>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(feed.latestBusinessDate)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={readiness.publicEmailReady ? "border-emerald-200" : "border-amber-200"}>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Public onboarding launch gate</CardTitle><Status complete={readiness.publicEmailReady} label={readiness.publicEmailReady ? "Email validated" : "Custom SMTP required"} /></CardHeader>
        <CardContent className="text-sm text-muted-foreground"><p>Controlled temporary-password onboarding can operate now. Public onboarding must remain closed until transactional SMTP is configured and password-recovery delivery is tested end to end.</p></CardContent>
      </Card>

      {canAdminister && vaultOnboardingEnabled ? (
        <Card><CardHeader><CardTitle>Add a secured PTS account</CardTitle></CardHeader><CardContent><PtsAccountForm /></CardContent></Card>
      ) : canAdminister ? (
        <Card><CardHeader><CardTitle>Secured PTS account onboarding</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Credential entry is unavailable until the Vault and broker configuration pass validation.</CardContent></Card>
      ) : null}
    </div>
  )
}
