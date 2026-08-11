# PTS Backfill User Upload

## User experience

Owners and administrators upload Product Sales or Class Sales workbooks at
`/operations/backfills`. The browser communicates only with SASHA. Users see a
processing state followed by a plain success or failure notification. n8n URLs,
workflow names, node output, execution identifiers, and Supabase details are
never returned to the browser.

## Internal contract

SASHA validates the authenticated user, administrator role, studio access, PTS
mapping, file extension, and 25 MB size limit. It then sends multipart form data
to the report-specific private URL in
`PTS_PRODUCT_SALES_BACKFILL_WEBHOOK_URL` or
`PTS_CLASS_SALES_BACKFILL_WEBHOOK_URL`, with the bearer credential in
`PTS_BACKFILL_WEBHOOK_SECRET`. The endpoints are the converted, existing n8n
workflows 10 and 11; no dispatcher workflow is required.

Fields:

- `kind`: `product_sales` or `class_sales`
- `studioCode`: trusted PTS external location ID resolved by SASHA
- `productSalesFile` or `classSalesFile`: one `.xlsx` or `.xls` workbook,
  matching the existing collector node's binary input field

The internal webhook responds synchronously after its final warehouse node. A
successful 2xx response is treated as success; SASHA derives `rowCount` from an
array response or a `rowCount` property when present.

Any failure response is converted to a generic user-facing error. Raw workflow
errors and source payloads must remain in protected operational logs.

## Required n8n change

Convert workflows 10 and 11 in place to published, header-authenticated webhook
endpoints while retaining their existing validation, normalization, grouping,
and idempotent warehouse upsert nodes. The webhooks must never accept an
organization or Supabase identifier from the browser.

The current n8n editor links and temporary test forms remain the rollback path
until the SASHA gateway completes controlled uploads for both report types.
