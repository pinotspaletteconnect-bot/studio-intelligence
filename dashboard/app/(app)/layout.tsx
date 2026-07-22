import type { ReactNode } from "react";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
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

        <nav className="p-4 space-y-2">
          <a href="/dashboard" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
            Dashboard
          </a>

          <a href="/marketing" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
            Marketing
          </a>

          <a href="/operations" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
            Operations
          </a>

          <a href="/financial" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
            Financial
          </a>

          <a href="/customers" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
            Customers
          </a>

          <a href="/executive" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
            Executive
          </a>

          <a href="/settings" className="block rounded-lg px-3 py-2 hover:bg-slate-100">
            Settings
          </a>
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
  );
}