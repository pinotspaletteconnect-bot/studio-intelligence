# Huntington Beach ZIP geography repair

## Verified September 28, 2026

- Workflow `31 - PTS Order Geography and Discounts` (`bkHGxZsNyUfR5vvl`)
  is published on the daily 6:30 AM Eastern schedule with the corrected loader
  that processes both PTS account responses. Previously, Huntington Beach was
  in the second response, so collection succeeded but its orders did not reach
  `pts_order_attributes`.
- A backup of the live workflow was exported before editing. Only the
  `Build Order Upserts` code was changed in the n8n draft. The controlled draft
  execution succeeded and upserted 36 September 27 orders across five studios.
  Huntington Beach contributed nine orders, all with billing ZIPs, totaling
  $484.25. A warehouse query confirmed nine rows for studio 5 on that date.
- A scoped workflow copy (`RSmGr5XPAbLJvfBv`) backfilled
  September 23–26 for Huntington Beach alone. Its collector returned one studio,
  68 orders, and $5,238.65 booked sales; the upsert succeeded for 68 rows.
  Warehouse reconciliation by order date: September 23: 20 orders, 20 ZIPs,
  $1,377.00; September 24: 15 orders, 15 ZIPs, $1,095.00; September 25:
  17 orders, 13 ZIPs, $1,714.00; September 26: 16 orders, 16 ZIPs, $1,052.65.
  The four missing September 25 ZIPs were null in the collector source. The
  earlier September 27 run remains nine orders, nine ZIPs, and $484.25. The
  temporary copy was archived after reconciliation.
- The dashboard map ships static 2020 Census ZIP boundaries for eastern states
  and Arizona. The deployed dashboard change obtains missing ZIP boundaries from
  Census TIGERweb when an additional region appears in reporting data or a
  studio's saved targets.

## Rollout and verification

1. The corrected `Build Order Upserts` node was published. Confirm the next
   scheduled execution includes every returned account and completes its
   warehouse upsert.
2. The scoped backfill used `organizationId: 3`, account 2,
   `studioCodes: ["HBCA"]`, September 23–26, and
   `includeOrderAttributes: true`. The warehouse counts and sales above match
   the collector. The copy was archived and does not run on a schedule.
3. PR #76 merged into the Railway production branch. Railway reports the
   dashboard deployment active. The reporting view has 61 ZIP/date rows and
   48 distinct ZIPs for Huntington Beach during September 23–27, representing
   the 73 orders with source ZIPs. An existing studio still has reporting rows.
   Authenticated visual verification of the map remains open because the
   available browser session redirects to sign-in.

The daily run uses yesterday's UTC date in the current workflow. That behavior
is unchanged by this repair; any date-boundary correction should be a separate
reviewed change.
