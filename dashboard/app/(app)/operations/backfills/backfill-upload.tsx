"use client"

import { useRef, useState } from "react"
import { CheckCircle2, LoaderCircle, Upload, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Studio = { id: number; studio_name: string }
type BackfillKind = "product_sales" | "class_sales"

function UploadCard({ kind, title, description, studios }: { kind: BackfillKind; title: string; description: string; studios: Studio[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setResult(null)
    try {
      const formData = new FormData(event.currentTarget)
      formData.set("kind", kind)
      const response = await fetch("/api/operations/pts-backfills", { method: "POST", body: formData })
      const body = await response.json() as { success?: boolean; rowCount?: number; error?: string }
      if (!response.ok || !body.success) throw new Error(body.error ?? "The import was unsuccessful.")
      setResult({ success: true, message: `Import successful. ${Number(body.rowCount ?? 0).toLocaleString()} source rows were processed.` })
      formRef.current?.reset()
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "The import was unsuccessful." })
    } finally {
      setPending(false)
    }
  }

  return <Card>
    <CardHeader><CardTitle>{title}</CardTitle><p className="text-sm leading-6 text-muted-foreground">{description}</p></CardHeader>
    <CardContent>
      <form ref={formRef} className="space-y-4" onSubmit={submit}>
        <label className="block space-y-1 text-sm"><span>Studio</span><select className="h-10 w-full rounded-md border bg-background px-3" name="studioId" required defaultValue=""><option value="" disabled>Select studio</option>{studios.map((studio) => <option key={studio.id} value={studio.id}>{studio.studio_name}</option>)}</select></label>
        <label className="block space-y-1 text-sm"><span>PTS Excel workbook</span><input className="block w-full rounded-md border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5" name="file" type="file" accept=".xlsx,.xls" required /></label>
        <Button disabled={pending} type="submit">{pending ? <><LoaderCircle className="animate-spin" />Uploading and validating…</> : <><Upload />Upload backfill</>}</Button>
        {result ? <div role="status" className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{result.success ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}<span>{result.message}</span></div> : null}
      </form>
    </CardContent>
  </Card>
}

export function BackfillUpload({ studios }: { studios: Studio[] }) {
  return <div className="grid gap-4 lg:grid-cols-2">
    <UploadCard kind="product_sales" title="Product Sales history" description="Upload the PTS Product Sales workbook for one studio and historical date range." studios={studios} />
    <UploadCard kind="class_sales" title="Class Sales history" description="Upload the PTS Class Sales Summary workbook for one studio and historical date range." studios={studios} />
  </div>
}
