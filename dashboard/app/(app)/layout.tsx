import type { ReactNode } from "react";
import Link from "next/link";
import { AppProvider } from "@/contexts/app-context";
import { logout } from "@/app/(app)/actions";
import { requireDashboardContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { SessionTimeoutGuard } from "@/components/session-timeout-guard";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await requireDashboardContext();

  return (
    <AppProvider>
      <SessionTimeoutGuard />
      <div className="flex min-h-screen bg-slate-50">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white">
          <div className="border-b p-6">
            <h1 className="text-xl font-bold">
              SASHA
            </h1>

            <p className="text-sm text-slate-500">
              Studio Intelligence Platform
            </p>
          </div>

          <nav className="space-y-2 p-4">
            <Link
              href="/dashboard"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Dashboard
            </Link>

            <Link
              href="/executive"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Executive
            </Link>

            <Link
              href="/operations"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Operations
            </Link>

            <Link
              href="/operations/upcoming"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              Upcoming Classes
            </Link>

            <Link
              href="/operations/order-geography"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              Order Geography &amp; Discounts
            </Link>

            <Link
              href="/operations/week-over-week"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              Year-over-Year
            </Link>

            <Link
              href="/operations/ga4"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              GA4 North America
            </Link>

            <Link
              href="/marketing"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Marketing
            </Link>

            <Link
              href="/automation"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Automation
            </Link>

            <Link
              href="/automation/textellent"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              Textellent
            </Link>

            <Link
              href="/automation/seating-charts"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              Seating Charts
            </Link>

            <Link
              href="/settings"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Settings
            </Link>

            <Link
              href="/data-status"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              Data Upload Status
            </Link>

            <Link
              href="/settings/onboarding"
              className="ml-4 block rounded-lg border-l-2 border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              Setup Checklist
            </Link>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <header className="border-b bg-white px-8 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                SASHA
              </h2>

              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <div className="font-medium text-slate-900">
                    {access.fullName ?? access.email}
                  </div>
                  <div className="text-xs capitalize text-slate-500">{access.role}</div>
                </div>
                <form action={logout}>
                  <Button type="submit" variant="outline" size="sm">Sign out</Button>
                </form>
              </div>
            </div>
          </header>

          <div className="p-8">{children}</div>
        </main>
      </div>
    </AppProvider>
  );
}
