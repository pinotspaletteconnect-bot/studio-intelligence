# Retain real unpaid parties; confirmed marketing placeholders only - October 27, 2026

Owner confirmed Gilbert10/25, Short North10/17 and St. Matthews10/3 are marketing
listings, but Jeffersonville10/10 Spooky Trio is a real unpaid party. Correction
to PR116: selected-painting parties remain even with no recorded guests/revenue.
Only empty No Painting Selected / Coming Soon placeholders require actual guest,
class-sale or fee evidence; capacity alone is insufficient. No title-to-customer
mapping or payment assumptions. The shared filter applies to details and summaries.
Live read-only regression checks explicitly exclude33080/41305/45163 and retain
37324. October four-studio count26, revenue10074.24, average387.47. The earlier25
count was overbroad and is superseded by this owner-confirmed interpretation.
37 reporting/access tests, live detail/summary reconciliation, lint/build pass.
No lead, warehouse, source-party, scheduling or authentication changes.

# Exclude capacity-only private-party marketing listings - October 27, 2026

Found four October source-classified private-party listings with capacity but
zero guests, class sales and fees. Prior filter counted capacity as evidence for
No Painting Selected and accepted any other title, admitting Coming Soon and
Spooky Trio as well. Shared historical private-party filter now requires recorded
guests, class sales or fees, independent of title; capacity alone is insufficient.
Attended free and fee-only parties remain. Mobile Events logic stays unchanged.
The rule applies to party details, dedicated party history and operations class
summaries. Current detail coverage continues to block historical fallback from
restoring excluded records. Aggregate-only older sales lack event-level evidence
and remain subject to the existing coverage disclosure.
October four-studio verification:25 parties instead of29; revenue10074.24 stays
unchanged; average402.97. Excluded IDs33080,41305,45163,37324. Lead pipeline and
conversion rules, schemas, source data and daily workflows are unchanged.
37 reporting/access tests, lint, production build and read-only live reporting
verification pass. Deployment pending.

# Minimum-guest refresh verified - October 27, 2026

Reconciled production refresh completed2026-10-27T12:55:51UTC for all5 studios:
1115/1156/860/257/811 rows (4199 total), all source/loaded/identity counts match.
Independent verification of the five St. Matthews October conversions confirms
minimum counts10,10,10,8,15 and estimated values300,300,300,312,585: total1797.
All five now have usable values and no parsing warnings. Daily scheduling remains
unchanged; the collector fix is deployed in PR114. Combined comparison card PR115
is ready to merge now that the source refresh has completed.

# Minimum-guest private-party values - October 27, 2026

Owner requested range/open-ended attendance support using minimum guests.
Collector normalizes exact counts, ascending ranges (including en/em dash) and
N+ to their minimum integer. Reversed/ambiguous/invalid counts remain null with
parse warnings. Prices and deposits keep their existing numeric validation.
Existing expected_headcount field now holds minimum expected guests for ranges;
no schema or ETL changes. Reporting still multiplies that count by quoted price.
Dashboard explains the conservative calculation and shows valued/converted
booking coverage per studio, explicitly marking incomplete totals.
The five verified St. Matthews October conversions have counts 10-15,10,10-15,
8+,15-20 at prices30,30,30,39,39: minimum estimated total1797, previously300.
Verified: 19 collector/job/ETL/auth tests;36 dashboard reporting/access tests;
lint and production build. Deployment and data-refresh verification pending.

# Private-party explanations and prior-year comparisons - October 27, 2026

Prepared: inquiry-month attribution example and same-calendar-date comparisons
one and two years earlier, limited to history since 2024. Service-calculated
changes cover leads, parties, actual revenue and conversion percentage points.
Completed-day sales cutoffs match across years; leap days clamp to February 28.
Older cohorts have longer to convert; these are eventual conversions known today,
not past as-of rates. Missing sales remain unavailable; zero baselines have no
percentage change. Current pipeline and organization authorization are unchanged.
Verified: 36 reporting/access tests, lint, production webpack build and live
read-only prior-year cohort counts. No schema, collector or schedule changes.

# Daily private-party refresh verified - October 26, 2026

First background refresh succeeded in 11m38s; completed 2026-10-27 01:25:04 UTC
(October 26, 9:25 PM Eastern). Independent read-only verification confirmed
all five configured studios, matching source/loaded/current-row counts, unique
studio/lead identities, and completed coverage. Counts: St. Matthews 1115,
Short North 1155, Gilbert 860, Jeffersonville 257, Huntington Beach 810; total
4197. Huntington Beach gained one new active inquiry. Unknown dates remain401.
Gilbert pipeline is12 new /0 deposit requested /6 booked, date-independent.

Published production workflow: OHS6DmE8B6o4rNZF, Daily background refresh,
5 AM America/New_York, v1 execution order,1-hour timeout, progress saved.
Superseded synchronous workflow3kug1PWOcquUvDWc is unpublished; failed audit
record preserved. PR112 production commit642a35accc51984a466b54999d2cf08094d60dca
contains the timeout fix.17 collector/job/ETL/auth checks pass; dashboard build,
lint and34 reporting/access tests passed for the pipeline release. No schema,
authentication, credential or organization-access changes. User explicitly
approved the immediate test and its retry. No approval remains outstanding.
Verifier: automation/pts/verify-private-party-daily.cjs --after=2026-10-27T01:13:00Z
Evidence: ignored output/private-parties/first-daily-refresh-success.png.

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

## Live deployment and schedule activation

PR111 merged as 0c4a6ec8433ad315b83c1ba88b57716b353e3c83; both Railway
services report success. Live current pipeline now shows Gilbert 12 open new
leads, 0 awaiting deposit and 6 booked upcoming parties, independent of dates.
Published n8n workflow 3kug1PWOcquUvDWc, Daily private-party refresh, 5 AM
America/New_York. UI confirms schedule will trigger automatically. Verified v1
execution order, progress saved, existing credentials and 1-hour timeout (host
maximum); generator aligned to supported timeout. No schema changes.

First immediate end-to-end refresh has NOT run. Automatic approval review
rejected immediate production source collection/warehouse update because it
requires authorization separate from the daily schedule request. Asked owner
via pending input whether to run first refresh now or enable schedule only.
Do not bypass this rejection. Existing imported records remain authoritative
until the scheduled run or separately approved immediate verification.

Owner approved immediate first refresh in reply to the pending question.
Started manual verification of the published daily workflow at 2026-10-27
00:54:46 UTC (October 26, 8:54 PM Eastern). Source collection running; no
completion claim yet. Existing warehouse baseline: 4,196 records across five
studios; Gilbert current pipeline 12 new / 0 deposit requested / 6 booked.

First approved synchronous source read failed with hosting gateway 502 after
about 11 minutes, before any warehouse nodes ran. Replacing long HTTP waits
with authenticated background jobs, idempotent starts and progress/result
checks. n8n still owns all validation and warehouse writes. Collector job state
is ephemeral; restart/missing/failed jobs fail closed before ingestion.
17 collector/job/ETL/auth checks pass. Retrying is already authorized.

Background fix deployed via PR112, production commit
642a35accc51984a466b54999d2cf08094d60dca. Replacement n8n workflow
OHS6DmE8B6o4rNZF is published for 5 AM America/New_York; old workflow
3kug1PWOcquUvDWc is unpublished (failed execution preserved). Both use
existing credentials. First retry started October 26, 9:13:34 PM Eastern.
All five jobs started in 5.7 seconds; per-studio progress polling succeeds.
Collection still running; warehouse update and count reconciliation pending.

Post-refresh reporting-service verification passed against the fresh warehouse.
Live verification now compares counts to warehouse queries rather than a fixed
baseline, so new daily inquiries do not cause false failures. Final browser
reload reached login?reason=inactive (normal30-minute idle sign-out); no auth
changes or bypass. Post-refresh figures verified through read-only service and
warehouse checks; owner must sign in again to view the page.
