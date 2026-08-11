import { InviteUserForm } from "@/app/(app)/settings/invite-user-form"
import { AddStudioForm } from "@/app/(app)/settings/add-studio-form"
import { AuthorizedUsers } from "@/app/(app)/settings/authorized-users"
import { IntegrationSetup } from "@/app/(app)/settings/integration-setup"
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
        <p className="mt-1 text-sm text-muted-foreground">Set up your workspace, connect data sources securely, and manage authorized users.</p>
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
            <CardHeader><CardTitle>Create a user</CardTitle></CardHeader>
            <CardContent><InviteUserForm studios={settings.studios} /></CardContent>
          </Card>
          <IntegrationSetup
            ptsAccounts={settings.ptsAccounts}
            textellentAccounts={settings.textellentAccounts}
            mntnAccounts={settings.mntnAccounts}
            eulerityAccounts={settings.eulerityAccounts}
            ga4Accounts={settings.ga4Accounts}
            metaAccounts={settings.metaAccounts}
            studios={settings.studios}
            mappedIntegrationTypes={settings.mappedIntegrationTypes}
            ptsStudioSettings={settings.ptsStudioSettings.map((setting) => ({
              ...setting,
              studioName: settings.studios.find((studio) => studio.id === setting.studioId)?.studio_name ?? `Studio ${setting.studioId}`,
            }))}
          />
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

    </div>
  )
}
