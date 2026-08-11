import { BarChart3, CheckCircle2, ChevronDown, KeyRound, LockKeyhole, MessageSquareText, MonitorCog, RadioTower } from "lucide-react"

import { PtsConnections } from "@/app/(app)/settings/pts-connections"
import { TextellentConnections } from "@/app/(app)/settings/textellent-connections"
import { ClasspopSettings } from "@/app/(app)/settings/classpop-settings"
import { MntnConnections } from "@/app/(app)/settings/mntn-connections"
import { EulerityConnections } from "@/app/(app)/settings/eulerity-connections"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type PtsAccount = { id: number; account_name: string; has_credentials: boolean; last_validated_at: string | null }
type TextellentAccount = { id: number; account_name: string; description: string | null; sender_number: string }
type MntnAccount = { id: number; account_name: string; advertiser_id: string | null; studio_name: string | null; has_credentials: boolean; last_validated_at: string | null }
type EulerityAccount = { id: number; account_name: string; has_credentials: boolean; last_discovered_at: string | null; locations: Array<{ account_id: number; source_key: string; display_name: string; studio_id: number | null; studio_name: string | null }> }

function Guide({ title, description, connected, available, icon, children }: { title: string; description: string; connected: boolean; available?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return <details className="group rounded-xl border bg-card open:ring-1 open:ring-foreground/10">
    <summary className="flex cursor-pointer list-none items-center gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">{icon}</span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-heading text-base font-medium">{title}</span>{connected ? <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 />Connected</Badge> : available ? <Badge variant="outline" className="border-amber-300 text-amber-800">Ready to set up</Badge> : <Badge variant="secondary">Assisted setup</Badge>}</span><span className="mt-1 block text-sm text-muted-foreground">{description}</span></span>
      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="border-t p-4 sm:p-5">{children}</div>
  </details>
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="ml-5 list-decimal space-y-2 text-sm leading-6 text-muted-foreground marker:font-medium marker:text-foreground">{children}</ol>
}

function SecureHandoff({ gather }: { gather: string }) {
  return <div className="mt-5 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><p><strong>Secure connection form is next.</strong> Gather {gather}. Do not send passwords, access tokens, or API keys through email or notes.</p></div>
}

export function IntegrationSetup({ ptsAccounts, textellentAccounts, mntnAccounts, eulerityAccounts, studios, mappedIntegrationTypes, ptsStudioSettings }: { ptsAccounts: PtsAccount[]; textellentAccounts: TextellentAccount[]; mntnAccounts: MntnAccount[]; eulerityAccounts: EulerityAccount[]; studios: Array<{ id: number; studio_name: string }>; mappedIntegrationTypes: string[]; ptsStudioSettings: Array<{ integrationId: number; studioId: number; studioName: string; classpopEnabled: boolean }> }) {
  const types = new Set(mappedIntegrationTypes.map(value => value.toLowerCase()))
  return <Card id="integrations">
    <CardHeader><CardTitle>Integration setup</CardTitle><CardDescription>Open each system for what to gather, where to find it, and how to connect it safely.</CardDescription></CardHeader>
    <CardContent className="space-y-3">
      <div className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3"><div><strong>1. Gather</strong><p className="mt-1 text-muted-foreground">Follow the steps for each vendor.</p></div><div><strong>2. Connect</strong><p className="mt-1 text-muted-foreground">Use only SASHA&apos;s secured form.</p></div><div><strong>3. Verify</strong><p className="mt-1 text-muted-foreground">Confirm studios and the first successful import.</p></div></div>
      <Guide title="PTS" description="Classes, reservations, sales, products, attendance, and capacity." connected={ptsAccounts.some(account => account.has_credentials)} available icon={<MonitorCog className="size-5" />}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><div><h3 className="mb-3 font-medium">Before you connect</h3><Steps><li>Open the PTS administration site in a private browser window.</li><li>Sign in with the account SASHA should use for recurring reports.</li><li>Open the location selector and confirm every expected studio is visible.</li><li>Use a dedicated reporting account when possible.</li><li>Enter that login below, then use your SASHA password to authorize the protected change.</li></Steps><p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-muted-foreground">PTS has no API key. SASHA encrypts this login in Supabase Vault and never displays it again.</p></div><PtsConnections accounts={ptsAccounts} /></div>
        <div className="mt-6 border-t pt-5"><h3 className="mb-1 font-medium">Third-party class sales</h3><p className="mb-4 text-sm text-muted-foreground">Enable only studios that sell through ClassPop. SASHA will collect the PTS Third Party Class Credits Report and add recognized credits to the matching class date and time.</p><ClasspopSettings settings={ptsStudioSettings} /></div>
      </Guide>
      <Guide title="Textellent" description="Text automation and studio sending numbers." connected={textellentAccounts.length > 0} available icon={<MessageSquareText className="size-5" />}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><div><h3 className="mb-3 font-medium">Find your connection details</h3><Steps><li>Sign in to the studio&apos;s Textellent account.</li><li>Open account or API settings and locate the API authentication code.</li><li>Copy the full sending number including country code.</li><li>Note which studios share this account; add separate connections for separate accounts.</li><li>Enter the authentication code only in the secured form.</li></Steps></div><TextellentConnections accounts={textellentAccounts} /></div>
      </Guide>
      <Guide title="Google Analytics 4" description="Website traffic, conversions, and attribution." connected={types.has("ga4")} icon={<BarChart3 className="size-5" />}><Steps><li>Sign in to Google Analytics and select the correct property.</li><li>Open <strong>Admin → Property details</strong> and copy the numeric Property ID.</li><li>Open <strong>Property access management</strong> and confirm you can add the SASHA reporting identity.</li><li>Note which studio or website the property represents.</li></Steps><SecureHandoff gather="the Property ID and studio mapping" /></Guide>
      <Guide title="Meta Business" description="Facebook and Instagram ads and Page insights." connected={types.has("meta") || types.has("meta_ads") || types.has("meta_page")} icon={<RadioTower className="size-5" />}><Steps><li>Sign in to Meta Business Suite with full control of the business portfolio.</li><li>In Settings, confirm the correct Pages, Instagram accounts, and ad accounts are assigned.</li><li>Record the Business Portfolio ID and each Ad Account ID.</li><li>Map every Page, Instagram account, and ad account to its studio.</li><li>Use Meta&apos;s authorization screen when enabled; never enter a Facebook password in SASHA.</li></Steps><SecureHandoff gather="the portfolio ID, account IDs, and studio mapping" /></Guide>
      <Guide title="Eulerity" description="Managed advertising spend, campaigns, and budgets." connected={eulerityAccounts.some(account => account.has_credentials)} available icon={<KeyRound className="size-5" />}><div className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><div><h3 className="mb-3 font-medium">Connect and discover</h3><Steps><li>Use the Eulerity login that can view the expected studio locations.</li><li>For a single-location login, choose its SASHA studio. SASHA maps its only option automatically.</li><li>For a multi-location login, leave that field blank.</li><li>After discovery runs, map each displayed Eulerity location to a SASHA studio.</li><li>Credentials are encrypted and never displayed again.</li></Steps></div><EulerityConnections studios={studios} accounts={eulerityAccounts} /></div></Guide>
      <Guide title="MNTN Connected TV" description="CTV spend, visits, conversions, and modeled ROAS." connected={mntnAccounts.some(account => account.has_credentials)} available icon={<RadioTower className="size-5" />}><div className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><div><h3 className="mb-3 font-medium">Find your MNTN details</h3><Steps><li>Sign in to MNTN and select the studio&apos;s advertiser.</li><li>Copy the Advertiser ID shown beside the account name in the upper-right corner.</li><li>Open <strong>My Account → API</strong> and copy the Reporting API key.</li><li>Map each advertiser to exactly one studio.</li><li>Enter the key only in this form. SASHA encrypts it and never displays it again.</li></Steps></div><MntnConnections studios={studios} accounts={mntnAccounts} /></div></Guide>
    </CardContent>
  </Card>
}
