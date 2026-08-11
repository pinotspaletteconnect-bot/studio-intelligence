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
to the private URL in `PTS_BACKFILL_WEBHOOK_URL` with the bearer credential in
`PTS_BACKFILL_WEBHOOK_SECRET`.

Fields:

- `kind`: `product_sales` or `class_sales`
- `studioCode`: trusted PTS external location ID resolved by SASHA
- `file`: one `.xlsx` or `.xls` workbook

The internal webhook must respond synchronously with:

```json
{ "success": true, "rowCount": 186 }
```

Any failure response is converted to a generic user-facing error. Raw workflow
errors and source payloads must remain in protected operational logs.

## Required n8n change

Create one published, header-authenticated webhook dispatcher that branches on
`kind` and reuses the existing validation, normalization, grouping, and
idempotent warehouse upsert nodes from workflows 10 and 11. The public webhook
must never accept an organization or Supabase identifier from the browser.

The current n8n editor links and temporary test forms remain the rollback path
until the SASHA gateway completes controlled uploads for both report types.
