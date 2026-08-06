import { InviteUserForm } from "@/app/(app)/settings/invite-user-form"
import { AddStudioForm } from "@/app/(app)/settings/add-studio-form"
import { AuthorizedUsers } from "@/app/(app)/settings/authorized-users"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireDashboardContext } from "@/lib/auth/session"
import { getAccountSettings } from "@/lib/services/account-settings"

export default async function SettingsPage() {
  const access = await requireDashboardContext()
  const settings = await getAccountSettings(access.organizationId, access.allowedStudioIds)
  const canAdminister = ["owner", "administrator"].includes(access.role)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Organization settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage authorized users and review secure data connections.</p>
      </div>

      {canAdminister ? (
        <>
          <Card>
            <CardHeader><CardTitle>Workspace onboarding</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Review studio mappings, secured PTS account references, authorized users, and the latest data received for every required feed.</p>
              <Link className={buttonVariants()} href="/settings/onboarding">Open setup checklist</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader id="add-studio"><CardTitle>Add a studio</CardTitle></CardHeader>
            <CardContent>
              <AddStudioForm
                brands={settings.brands.map((brand) => ({ id: brand.id, label: brand.name }))}
                ptsAccounts={settings.ptsAccounts.map((account) => ({ id: account.id, label: account.account_name }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Invite a user</CardTitle></CardHeader>
            <CardContent><InviteUserForm studios={settings.studios} /></CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader id="authorized-users"><CardTitle>Authorized users</CardTitle></CardHeader>
        <CardContent>
          <AuthorizedUsers
            members={settings.members}
            studios={settings.studios}
            actorId={access.userId}
            actorRole={access.role}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location data connections</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="leading-6 text-muted-foreground">
            Login credentials and API tokens use a one-time encrypted server handoff. The database stores only a secret-manager reference, connection status, and non-sensitive account label. Users can never retrieve the original secret.
          </p>
          {settings.integrations.length ? settings.integrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between rounded-lg border p-3">
              <div><div className="font-medium">{integration.account_label}</div><div className="text-muted-foreground">{integration.integration_type} · {integration.secret_provider}</div></div>
              <span className="capitalize text-muted-foreground">{integration.connection_status}</span>
            </div>
          )) : <p className="rounded-lg border border-dashed p-4 text-muted-foreground">No secure connection references have been added yet.</p>}
          <p className="text-xs leading-5 text-muted-foreground">Credential entry remains disabled until the production secret-provider handoff is configured and tested.</p>
        </CardContent>
      </Card>
    </div>
  )
}
