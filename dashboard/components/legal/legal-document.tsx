import Link from "next/link"

import { LEGAL_REVIEW_NOTICE } from "@/lib/legal/documents"

type LegalContent = { title: string; intro: string; sections: Array<{ title: string; paragraphs: string[] }> }

export function LegalDocument({ content, effectiveDate, version }: { content: LegalContent; effectiveDate: string; version: string }) {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
    <article className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm sm:p-10">
      <Link href="/login" className="text-sm font-semibold text-primary">SASHA</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">{content.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective {effectiveDate} · Version {version}</p>
      <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{LEGAL_REVIEW_NOTICE}</p>
      <p className="mt-6 leading-7 text-slate-700">{content.intro}</p>
      <div className="mt-8 space-y-8">{content.sections.map((section) => <section key={section.title}>
        <h2 className="text-lg font-semibold">{section.title}</h2>
        {section.paragraphs.map((paragraph) => <p className="mt-3 leading-7 text-slate-700" key={paragraph}>{paragraph}</p>)}
      </section>)}</div>
      <footer className="mt-10 flex gap-4 border-t pt-6 text-sm"><Link className="text-primary" href="/terms">Terms</Link><Link className="text-primary" href="/privacy">Privacy</Link></footer>
    </article>
  </main>
}
