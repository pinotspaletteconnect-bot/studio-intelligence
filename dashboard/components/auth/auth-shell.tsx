import type { ReactNode } from "react"
import Link from "next/link"

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            SASHA
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {children}
        <footer className="mt-8 flex justify-center gap-4 border-t pt-5 text-xs text-slate-500"><Link className="hover:text-slate-900" href="/terms">Terms</Link><Link className="hover:text-slate-900" href="/privacy">Privacy</Link></footer>
      </section>
    </main>
  )
}
