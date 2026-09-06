type PageResult<T, E> = { data: T[] | null; error: E | null }
type PagedQuery<T, E> = {
  range(from: number, to: number): PromiseLike<PageResult<T, E>>
}

export class ReportingLimitError extends Error {
  constructor() {
    super("This report is too large. Select fewer studios or a shorter date range.")
  }
}

/** Pass a query ordered by its full row key. Never return a partial report. */
export async function fetchAllRows<T, E>(
  query: PagedQuery<T, E>,
  { pageSize = 1000, maxRows = 100_000 } = {}
): Promise<PageResult<T, E>> {
  const rows: T[] = []
  for (;;) {
    const result = await query.range(
      rows.length,
      rows.length + Math.min(pageSize, maxRows - rows.length + 1) - 1
    )
    if (result.error) return { data: null, error: result.error }
    const page = result.data ?? []
    if (!page.length) return { data: rows, error: null }
    rows.push(...page)
    if (rows.length > maxRows) throw new ReportingLimitError()
    // A server may enforce a smaller page size than requested. Only an empty
    // page proves completion; advance by the number actually returned.
  }
}
