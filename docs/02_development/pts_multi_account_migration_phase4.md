# PTS Multi-Account Migration — Phase 4 Parity Validation

**Started:** August 9, 2026

**Production behavior:** Existing workflows remain published and unchanged.
The dispatcher and all five shadow definitions are published for durable
versioning, but inherited schedules and warehouse writers remain deactivated.
The Phase 4 runner remains manual-only.

## Entry baseline

Current production workflow exports were downloaded outside the repository to
the operator's local Downloads rollback archive:

- `05 - PTS Daily Sales Import.json`
- `06 - PTS Product Sales Import (1).json`
- `07 - PTS Class Sales Import.json`
- `12 - PTS Upcoming Class Snapshots.json`
- `13 - PTS Reservation Bookings Import.json`

The point-in-time warehouse baseline was captured read-only on August 9, 2026:

| Table | Rows | Latest source date |
| --- | ---: | --- |
| `pts_sales_daily_summary` | 40 | 2026-08-08 |
| `pts_non_class_sales_items` | 727 | 2026-08-08 |
| `pts_class_sales_daily` | 768 | 2026-08-08 |
| `pts_upcoming_class_snapshots` | 6,781 | 2026-08-09 |
| `pts_reservation_bookings` | 2,889 | 2026-08-08 |

## Manual parity runner

Unpublished workflow `16 - PTS Phase 4 Single-Account Parity Runner`
(`SbddIeWOCq48hSUF`) was created with no schedule. It calls workflow 15 to
obtain one validated account job, then calls exactly one write-disabled shadow.
The target shadow is changed manually between sequential tests so PTS never
receives overlapping report requests.

Workflow 15's subworkflow trigger was corrected to accept all incoming data.
The original empty input schema prevented a caller from reaching its read-only
target query.

## Credential-broker configuration

Daily Sales shadow execution reached the collector with this safe routing
contract:

- account ID 1;
- report date 2026-08-08;
- studio codes STM, SN, GIL, and JEF;
- final Supabase writer deactivated.

The initial Daily Sales attempt stopped safely before PTS login with
`PTS credential broker is not configured`. No shadow warehouse write occurred.

After explicit approval, the production Railway configuration was audited and
completed:

- the dashboard and collector already had matching protected
  `PTS_SECRET_BROKER_TOKEN` values;
- `PTS_SECRET_BROKER_URL` was added to the collector, pointing to the
  dashboard's internal account broker route;
- the collector redeployed successfully;
- no PTS username, password, token value, or Vault secret was copied into Git,
  n8n, documentation, logs, or browser-visible application code.

PTS usernames and passwords remain encrypted in Supabase Vault. Railway holds
only the broker URL and the shared service-to-service authentication token.
n8n receives opaque account IDs and studio mappings, not source credentials.

## Write-disabled parity results

Tests were run sequentially for account 1 and report date 2026-08-08. Every
shadow warehouse writer remained deactivated.

| Shadow | Result | Evidence |
| --- | --- | --- |
| 05B Daily Sales | Passed | Returned the expected bulk summary payload for all four configured studios. |
| 06B Product Sales | Passed | Collector and transformation completed with the writer disabled. |
| 07B Class Sales | Passed | Collector and transformation completed with 151 transformed items. |
| 12B Upcoming Classes | Blocked | The single 90-day request exceeded the Railway/PTS service window and returned a bad gateway response. It must be split into bounded sequential date slices before parity can pass. |
| 13B Reservations | Passed | The manual runner completed with four transformed items and the warehouse writer disabled. |

The 12B result is a collection-window problem, not a Vault or credential-broker
failure. Do not increase concurrency or run overlapping PTS requests. Preserve
the current sequential account execution model and add bounded date slicing.

## Phase 4 gates

- [x] Download current production rollback exports outside Git.
- [x] Capture point-in-time warehouse counts and latest source dates.
- [x] Create an unpublished, manual-only, one-shadow-at-a-time parity runner.
- [x] Confirm the runner passes the configured account and four studio targets.
- [x] Configure matching broker tokens on the dashboard and collector Railway
  services, plus the dashboard broker URL on the collector.
- [x] Validate the Vault credential contract for account 1.
- [x] Run Daily Sales, Product Sales, and Class Sales sequentially with all
  warehouse writers disabled.
- [ ] Split Upcoming Classes into bounded sequential date slices and rerun it.
- [x] Run Reservations with its warehouse writer disabled.
- [ ] Add durable account-level collection audit records and bounded retry
  behavior after parity is proven.
- [ ] Prepare a separately approved cutover plan; do not publish shadows in
  Phase 4.

## Next controlled step

Keep all shadow schedules and writers disabled. Update 12B so the 90-day future
horizon is collected as bounded sequential work, then validate its merged
output. Enabling schedules, enabling writers, or cutting production workflows
over still requires the Phase 5 gates and rollback plan.
