import { describe, expect, it } from "vitest"
import { fetchAllRows, ReportingLimitError } from "@/lib/supabase/pagination"
import { warehouse } from "./warehouse"

describe("complete report pagination", () => {
  it.each([0, 1, 1000, 1001, 2507])("returns all %i rows including exact page boundaries", async (count) => {
    const db = warehouse({ facts: Array.from({ length: count }, (_, id) => ({ id })) })
    const result = await fetchAllRows(db.client.from("facts").select("id").order("id"))
    expect(result.error).toBeNull()
    expect(result.data?.map((row) => row.id)).toEqual(Array.from({ length: count }, (_, id) => id))
  })
  it("continues when the server enforces a smaller page than requested", async () => {
    const db = warehouse({ facts: Array.from({ length: 777 }, (_, id) => ({ id })) }, 200)
    expect((await fetchAllRows(db.client.from("facts").select("id").order("id"))).data).toHaveLength(777)
  })
  it("fails a report rather than returning partial data after a later page error", async () => {
    let calls = 0
    const result = await fetchAllRows({ range: async () => ++calls === 1
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: { message: "warehouse unavailable" } } })
    expect(result.data).toBeNull()
    expect(result.error?.message).toBe("warehouse unavailable")
  })
  it("allows the exact safety limit and rejects anything larger", async () => {
    for (const count of [10, 11]) {
      const db = warehouse({ facts: Array.from({ length: count }, (_, id) => ({ id })) })
      const result = fetchAllRows(db.client.from("facts").select("id").order("id"), { maxRows: 10 })
      if (count === 10) expect((await result).data).toHaveLength(10)
      else await expect(result).rejects.toBeInstanceOf(ReportingLimitError)
    }
  })
})
