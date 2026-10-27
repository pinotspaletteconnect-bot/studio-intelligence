// Explicit opt-in: warehouse SELECTs only; no source or warehouse mutations.
import { expect, it } from "vitest"

it.skipIf(process.env.SI_VERIFY_LIVE !== "1")("reads reconciled private-party cohorts from the live warehouse", async () => {
  const { readFileSync } = await import("node:fs")
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVER_SECRET)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "")
  }
  const { supabase } = await import("@/lib/supabase/server")
  const { getPrivateParties } = await import("@/lib/services/private-parties")
  const targets = await supabase.from("pts_collection_targets").select("studio_id")
  expect(targets.error).toBeNull()
  const ids = [...new Set(targets.data!.map(row => Number(row.studio_id)))]
  const studios = await supabase.from("studios").select("id,studio_name,active,organization_id").in("id", ids)
  expect(studios.error).toBeNull()
  const evidence: unknown[] = [{ studios: studios.data }]
  for (const start of ["2026-10-01", "2024-01-01"]) {
    const report = await getPrivateParties("all", start, "2026-10-26", ids)
    expect(report.leads.status).toBe("complete")
    expect(report.leads.summary).not.toBeNull()
    expect(report.leads.unknownDateCount).toBe(401)
    if (start === "2024-01-01") expect(report.leads.summary!.received).toBe(3795)
    console.log(JSON.stringify({ start, studios: report.studios.length, leads: report.leads.summary, sales: report.sales }))
  }
  for (const scope of [[1, 2, 3, 4], [3]]) {
    for (const start of ["2026-10-01", "2024-01-01"]) {
      const report = await getPrivateParties("all", start, "2026-10-26", scope)
      evidence.push({ scope, start, leads: report.leads.summary, sales: report.sales })
    }
  }
  const { writeFileSync } = await import("node:fs")
  writeFileSync("../../../output/private-parties/live-ui-reconciliation.json", JSON.stringify(evidence, null, 2))
}, 60_000)
