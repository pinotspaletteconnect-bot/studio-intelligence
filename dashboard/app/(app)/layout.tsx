import type { ReactNode } from "react";
import Link from "next/link";
import { AppProvider } from "@/contexts/app-context";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppProvider>
      <div className="flex min-h-screen bg-slate-50">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white">
          <div className="border-b p-6">
            <h1 className="text-xl font-bold">
              Studio Intelligence
            </h1>

            <p className="text-sm text-slate-500">
              Business Intelligence Platform
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
              href="/marketing"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Marketing
            </Link>

            <Link
              href="/operations"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Operations
            </Link>

            <Link
              href="/financial"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Financial
            </Link>

            <Link
              href="/customers"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Customers
            </Link>

            <Link
              href="/executive"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Executive
            </Link>

            <Link
              href="/settings"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              Settings
            </Link>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <header className="border-b bg-white px-8 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Studio Intelligence
              </h2>

              <div className="text-sm text-slate-500">
                Jeff Duff
              </div>
            </div>
          </header>

          <div className="p-8">{children}</div>
        </main>
      </div>
    </AppProvider>
  );
}