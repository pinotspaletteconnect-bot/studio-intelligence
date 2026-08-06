import Link from "next/link"
import { CheckCircle2, CircleAlert, LockKeyhole } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireDashboardContext } from "@/lib/auth/session"
import { getOnboardingReadiness } from "@/lib/services/onboarding-readiness"
import { PtsAccountForm } from "@/app/(app)/settings/onboarding/pts-account-form"

function Status({ complete, label }: { complete: boolean; label?: string }) {
  return complete ? (
    <Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-3.5" />{label ?? "Complete"}</Badge>
  ) : (
    <Badge variant="outline" className="gap-1 border-amber-300 text-amber-800"><CircleAlert className="size-3.5" />{label ?? "Needs attention"}</Badge>
  )
}

function formatDate(value: string | null) {
  if (!value) return "No data"
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export default async function WorkspaceOnboardingPage() {
  const access = await requireDashboardContext()
  const canAdminister = ["owner", "administrator"].includes(access.role)
  const vaultOnboardingEnabled = process.env.PTS_VAULT_ONBOARDING_ENABLED === "true"
  const readiness = await getOnboardingReadiness(access.organizationId, access.allowedStudioIds)
  const setupChecks = [
    readiness.brands.length > 0 && readiness.studios.length > 0,
    readiness.accounts.length > 0,
    readiness.summary.mappedStudios === readiness.summary.totalStudios && readiness.summary.totalStudios > 0,
    readiness.memberCount > 0,
    readiness.summary.dataReadyStudios === readiness.summary.totalStudios && readiness.summary.totalStudios > 0,
  ]
  const progress = Math.round((setupChecks.filter(Boolean).length / setupChecks.length) * 100)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{readiness.organization.name}</p>
          <h1 className="text-2xl font-semibold">Workspace setup</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Configure studios once, connect each location to the correct PTS account, and verify every recurring data stream.</p>
        </div>
        <div className="min-w-56">
          <div className="mb-2 flex justify-between text-sm"><span>Setup progress</span><span className="font-medium">{progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-900" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">1. Business structure</CardTitle><Status complete={setupChecks[0]} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.brands.length} brand{readiness.brands.length === 1 ? "" : "s"} · {readiness.studios.length} active studio{readiness.studios.length === 1 ? "" : "s"}</p>{canAdminister ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/settings#add-studio">Add or review studios</Link> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">2. PTS accounts</CardTitle><Status complete={setupChecks[1]} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.accounts.length ? `${readiness.accounts.length} secured account reference${readiness.accounts.length === 1 ? "" : "s"}` : "No secured PTS account is available."}</p><div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><span>New credentials remain disabled until the encrypted one-time handoff is available.</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">3. Studio mappings</CardTitle><Status complete={setupChecks[2]} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.summary.mappedStudios} of {readiness.summary.totalStudios} studios mapped to PTS locations.</p>{canAdminister ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/settings#add-studio">Configure mapping</Link> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">4. Authorized users</CardTitle><Status complete={setupChecks[3]} /></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground"><p>{readiness.memberCount} active or invited user{readiness.memberCount === 1 ? "" : "s"}.</p>{canAdminister ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/settings#authorized-users">Manage users</Link> : null}</CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">5. Data verification</CardTitle><Status complete={setupChecks[4]} /></CardHeader>
          <CardContent className="text-sm text-muted-foreground"><p>{readiness.summary.dataReadyStudios} of {readiness.summary.totalStudios} studios have data in all five required PTS feeds.</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Studio data readiness</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b text-muted-foreground"><tr><th className="pb-3 pr-4 font-medium">Studio</th><th className="pb-3 pr-4 font-medium">PTS mapping</th><th className="pb-3 pr-4 font-medium">Daily sales</th><th className="pb-3 pr-4 font-medium">Products</th><th className="pb-3 pr-4 font-medium">Completed classes</th><th className="pb-3 pr-4 font-medium">Upcoming classes</th><th className="pb-3 font-medium">Reservations</th></tr></thead>
            <tbody>
              {readiness.studios.map((studio) => (
                <tr key={studio.id} className="border-b last:border-0">
                  <td className="py-4 pr-4"><div className="font-medium">{studio.studio_name}</div><div className="text-xs text-muted-foreground">{studio.city}, {studio.state}</div></td>
                  <td className="py-4 pr-4">{studio.hasPtsMapping ? <Status complete label={`Location ${studio.ptsLocationId}`} /> : <Status complete={false} label="Not mapped" />}</td>
                  <td className="py-4 pr-4">{formatDate(studio.latest.dailySales)}</td><td className="py-4 pr-4">{formatDate(studio.latest.products)}</td><td className="py-4 pr-4">{formatDate(studio.latest.classes)}</td><td className="py-4 pr-4">{formatDate(studio.latest.upcoming)}</td><td className="py-4">{formatDate(studio.latest.reservations)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {canAdminister && vaultOnboardingEnabled ? (
        <Card>
          <CardHeader><CardTitle>Add a secured PTS account</CardTitle></CardHeader>
          <CardContent><PtsAccountForm /></CardContent>
        </Card>
      ) : canAdminister ? (
        <Card>
          <CardHeader><CardTitle>Secured PTS account onboarding</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Credential entry will become available after the approved Vault migration and broker configuration pass validation.</CardContent>
        </Card>
      ) : null}
    </div>
  )
}
