# Daily private-party refresh and current pipeline - October 26, 2026

Owner requested daily server-side updates and active pipeline counts independent
of date filters. Current pipeline includes all new inquiries/date requests,
deposit requests and Manage Party bookings, including undated/older inquiries.
Conversion and completed/lost outcomes remain inquiry-cohort metrics. Existing
organization/studio access filters remain in effect for both queries.

New authenticated collector route /pts/private-party-leads refreshes source
stages/values and includes known warehouse identities to preserve transitions.
Credentials resolve through the existing account broker; collector performs no
warehouse writes. Old active inquiries remain available outside the 2024 history
cutoff and continue to refresh after closing. Known provenance is reused, but
current stages/values are always fetched fresh. Failed workers drain before the
account queue releases. Larger identity payloads are authenticated and scoped.

Isolated n8n workflow: Daily 5 AM America/New_York, configured studios, sequential
collector requests with retry, strict complete-identity/count validation before
writes, bounded upserts through existing RPC, per-studio reconciliation/coverage.
No public webhook, hardcoded studio mappings or credential changes. Existing
stage observations preserve history. No new schema required. Pending deployment,
first live refresh/reconciliation and publication of scheduled workflow.

# Private Parties live verification and count correction - October 26, 2026

Signed-in report verified for organization 1: St. Matthews, Short North,
Gilbert and Jeffersonville. Huntington Beach belongs to organization 3 and
remains excluded by existing organization access; all five histories are stored.
October: 62 dated leads, 15 conversions (24.2%), estimated converted value
$2,479 (6 usable quotes, 9 missing). 307 undated records in this organization.
2024 onward: 3,080 dated leads, 824 conversions (26.8%).

Found summary counted placeholder classes excluded by individual sales detail.
Reused production placeholder/before-opening/no-evidence filters; retained
current-date precedence so historical aggregates cannot restore placeholders.
October corrected: 29 parties, revenue unchanged $10,074.24, average $347.39.
Gilbert: 6 parties/$1,950.24/average $325.04. Read-only warehouse reconciliation,
34 reporting/access/live tests and full webpack build passed. Correction release
in progress within the approved page deployment. No schema, source data,
credentials or access rules changed.

# Private-party reporting — October 26, 2026

## Verified checkpoint

Owner approved lead-history storage and all-studio backfill, limited to January 1,
2024 onward. Storage and import are complete. Dashboard deployment approved October 26; release in progress on
`codex/private-party-release-20261026`, based on production `4ff792e`.

- Additive migration: `supabase/migrations/20261026213000_pts_private_party_history.sql`.
  Applied through existing n8n Postgres credential, without changing credentials.
- Successful pilot workflow: `iexZz8EOHqPANmnz` (St. Matthews 1,115 records).
- Successful full manual workflow: `wEnQj4eonuHffuH9`, completed
  2026-10-26 23:15:59 UTC. Neither helper is published or scheduled.
- Five-studio source and warehouse counts independently reconciled:

| Studio | Records | Unknown inquiry dates |
|---|---:|---:|
| St. Matthews | 1,115 | 83 |
| Short North | 1,155 | 75 |
| Gilbert | 860 | 88 |
| Jeffersonville | 257 | 61 |
| Huntington Beach | 809 | 94 |
| Total | 4,196 | 401 |

Source collection combines legacy lead reports, current Party Planner stages,
and explicit calendar lead links. Legacy reports alone omit modern inquiries.
Original dates come only from the legacy received date or explicit structured
website submission audit entries, never generic earliest contact or disposition
dates. Undated records are retained, flagged and excluded from dated cohorts.
Source accounts/studios are resolved from configuration and verified in source.
Contact names, email, phone and comments are discarded; credentials stay in memory.
Jeffersonville's earliest verified inquiry is July 19, 2025.

## Reporting and definitions

Dedicated `/operations/private-parties` page defaults to all authorized studios
and this month; individual event detail remains at `/operations/private-parties/events`.
Services use scoped, paginated reporting views, not component database queries.

- Inquiry / Date Requested: new leads.
- Date Approved: deposit requested.
- Manage Party: booked upcoming.
- Close Party / Party Closed: completed.
- Non-active disposition: lost, overriding a misleading stage label.
- Conversion: booked/completed or independently established prior booking,
  divided by verified dated inquiry cohort. Historical transition dates are not
  invented. Stage observations begin with this import.
- Converted value: quote-based estimated value, clearly separate from actual
  reported party revenue (class plus fees). Unknown quotes remain unknown.
- Historical and current party sales reconcile by studio/date, current detail
  winning overlaps; average value is weighted across parties.

The warehouse now has `pts_private_party_import_runs`, `pts_private_party_leads`,
`pts_private_party_stage_observations`, `pts_private_party_leads_reporting`, and
`pts_private_party_history_coverage`. RLS and service-only grants apply. Import
RPC validates configured account/studio, bounds batches to 500, preserves booking
evidence and upserts stable studio/lead identities. Coverage requires a completed,
count-reconciled import and matching current rows. The successful full run replayed
the pilot studio without duplicating its 1,115 leads.

## Verification and next action

37 reporting/access tests, 7 source/ETL tests, lint, clean TypeScript and full
webpack production build passed. Final build required refreshing stale generated
TypeScript cache and normal generated-folder access; no bypass retained.
`automation/pts/verify-private-party-warehouse.cjs` independently verified all
4,196 rows, unique identities, 401 unknown dates and five completed coverage rows.
Ignored screenshots: `output/private-parties/{pilot,all-studio}-import-success.png`.

Remaining: approved dashboard deployment, signed-in visual QA and live
page reconciliation. Release preserves production membership/onboarding/legal
checks, filters every query by allowed studio IDs, and introduces no auth changes. No recurring collection schedule or collector deployment
has been added. Preserve existing unrelated worktree changes when packaging.
Automatic approval review blocked replacing the pilot canvas; evidence was
preserved and a separate full-import helper was used instead.
