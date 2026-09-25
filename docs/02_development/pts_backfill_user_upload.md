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
- `studioCode`: trusted, tenant-scoped PTS studio selection resolved by SASHA
- `productSalesFile` or `classSalesFile`: one `.xlsx` or `.xls` workbook,
  matching the existing collector node's binary input field

The internal webhook responds synchronously after its final warehouse node. A
successful 2xx response is treated as success. SASHA displays a source-row
count only when the workflow explicitly returns a valid `rowCount` property;
warehouse rows and array length are not source-row counts.

Any failure response is converted to a generic user-facing error. Raw workflow
errors and source payloads must remain in protected operational logs.

### Studio selection for every tenant

SASHA sends `studioCode` as `organizationId:studioId:ptsLocationId` after
checking the administrator's organization and studio grants. This value is a
selection key, not a secret. Workflows 10 and 11 forward it unchanged in their
existing `x-pts-studio-code` collector header, so they need no edits. The
collector resolves that key using the authenticated PTS broker's backfill
metadata operation. The broker reads active `studio_integrations` and `studios`
rows and confirms the organization, studio, location, brand, and studio timezone.
It returns no PTS credentials for this operation. Class Sales parsing uses the
configured timezone; both parsers return the resolved studio and tenant IDs.
The existing workflow studio lookup and warehouse upsert continue to derive the
destination from the resolved studio ID.

Legacy unscoped location IDs are accepted only when they match exactly one
active PTS studio across all tenants. Unknown, inactive, cross-tenant, or
ambiguous selections fail before workbook parsing. A broker outage also fails
closed; the collector does not fall back to its original pilot studio list.

The dashboard and collector were released together through PR #72. Both Railway
deployments became active and the collector health check passed. Verify a
controlled Product Sales and Class Sales workbook for a newly mapped studio
before treating the import path as fully operational.

## Deployed n8n configuration

Convert workflows 10 and 11 in place to published, header-authenticated webhook
endpoints while retaining their existing validation, normalization, grouping,
and idempotent warehouse upsert nodes. The webhooks must never accept an
organization or Supabase identifier from the browser.

The unused workflow 29 copy is retained only until the SASHA gateway completes
controlled uploads for both report types, then it should be archived.
