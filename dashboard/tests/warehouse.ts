import { createClient } from "@supabase/supabase-js"

export type Row = Record<string, unknown>
export function warehouse(tables: Record<string, Row[]>, pageCap = 1000) {
  const requests: URL[] = []
  const failures = new Map<string, { code: string; message: string }>()
  const client = createClient("https://warehouse.invalid", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input))
      requests.push(url)
      const table = url.pathname.split("/").at(-1)!
      const failure = failures.get(table)
      if (failure) return Response.json(failure, { status: 400 })
      if (url.pathname.includes("/rpc/")) return Response.json([])
      let rows = [...(tables[table] ?? [])]
      for (const [field, filter] of url.searchParams) {
        if (["select", "order", "offset", "limit"].includes(field)) continue
        if (filter.startsWith("in.(")) {
          const values = filter.slice(4, -1).split(",").map((v) => v.replaceAll('"', ""))
          rows = rows.filter((row) => values.includes(String(row[field])))
        } else if (filter.startsWith("eq.")) rows = rows.filter((row) => String(row[field]) === filter.slice(3))
        else if (filter.startsWith("gte.")) rows = rows.filter((row) => String(row[field]) >= filter.slice(4))
        else if (filter.startsWith("lte.")) rows = rows.filter((row) => String(row[field]) <= filter.slice(4))
        else if (filter === "not.is.null") rows = rows.filter((row) => row[field] != null)
        else throw new Error(`Unsupported test filter: ${field} ${filter}`)
      }
      const order = (url.searchParams.get("order") ?? "").split(",").filter(Boolean)
      rows.sort((a, b) => {
        for (const term of order) {
          const [field, direction] = term.split(".")
          const av = a[field] ?? "", bv = b[field] ?? ""
          const delta = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
          if (delta) return direction === "desc" ? -delta : delta
        }
        return 0
      })
      const offset = Number(url.searchParams.get("offset") ?? 0)
      rows = rows.slice(offset, offset + Math.min(pageCap, Number(url.searchParams.get("limit") ?? pageCap)))
      const columns = url.searchParams.get("select")?.split(",")
      if (columns) rows = rows.map((row) => Object.fromEntries(columns.map((col) => {
        const [name, source = name] = col.split(":")
        return [name, row[source] ?? null]
      })))
      return Response.json(rows)
    } },
  })
  return { client, requests, failures }
}
