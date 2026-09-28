# Huntington Beach ZIP geography repair

## Verified September 28, 2026

- Workflow `31 - PTS Order Geography and Discounts` (`bkHGxZsNyUfR5vvl`)
  is published on the daily 6:30 AM Eastern schedule. Its published loader
  consumes only the first of two PTS account responses. Huntington Beach is in
  the second response, so collection succeeds but its orders do not reach
  `pts_order_attributes`.
- A backup of the live workflow was exported before editing. Only the
  `Build Order Upserts` code was changed in the n8n draft. The controlled draft
  execution succeeded and upserted 36 September 27 orders across five studios.
  Huntington Beach contributed nine orders, all with billing ZIPs, totaling
  $484.25. A warehouse query confirmed nine rows for studio 5 on that date.
- Earlier Huntington Beach order dates are absent from the order-attribute
  table. Its separate reservation-booking table currently contains 20 rows
  dated September 23, but that table is not a complete historical ZIP source.
- The dashboard map ships static 2020 Census ZIP boundaries for eastern states
  and Arizona. The local dashboard change obtains missing ZIP boundaries from
  Census TIGERweb when an additional region appears in reporting data or a
  studio's saved targets.

## Approved rollout

1. Review the repository changes and the n8n draft. Publish workflow 31 with
   only the corrected `Build Order Upserts` code. Confirm the next scheduled
   execution includes every returned account and completes its warehouse upsert.
2. Backfill Huntington Beach dates September 23–26 using the same collector
   with `organizationId: 3`, the existing account mapping, `studioCodes: ["HUT"]`,
   `orderFromDate: "2026-09-23"`, `orderToDate: "2026-09-26"`, and
   `includeOrderAttributes: true`. Use the corrected loader and the existing
   upsert key `(studio_id, order_id)`. Do not replace other studios' rows.
   Inspect collector `studioCount`, `orderCount`, dates, and the resulting
   warehouse counts/sales before marking the backfill complete.
3. Deploy the dashboard change through its normal release process. Verify the
   Huntington Beach map and ZIP table with a date range that includes the
   loaded order dates, then verify one existing studio still renders.

The daily run uses yesterday's UTC date in the current workflow. That behavior
is unchanged by this repair; any date-boundary correction should be a separate
reviewed change.
