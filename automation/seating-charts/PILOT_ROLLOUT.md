# St. Matthews seating-chart pilot — October 18, 2026

## Authorization and scope

Owner said "lets go" for a one-class pilot, then explicitly approved a separate
n8n Google connection for `pinotsstmatthews@gmail.com`. The owner also requested
help locating the Google app secret. Existing production credentials, their
Google grants, source workflows and schedules must remain unchanged.

Google application setup completed in the existing business-owned Google project
`phonic-oxide-463414-n1`, under `duffseaselempire@gmail.com`. Its existing `n8n`
web client has the correct Railway OAuth callback but its secrets are masked.
A separate web OAuth client, `St Matthews Seating Charts — n8n`, was created
with only the existing n8n callback. Public client ID:
`79715701098-g0a4a7srpm3ms99mk7avrknp31siq747.apps.googleusercontent.com`.
Its newly generated secret was transferred directly into the encrypted n8n
credential, without printing it, downloading it, or saving a local artifact.
Neither existing shared-client secret was rotated, disabled or replaced.

The owner additionally approved ongoing access to ALL Drive files and Sheets in
the STM Google account after automatic approval review rejected the initial
broader consent. Requested scopes are only `drive` and `spreadsheets`; no Photos
or app-data scope. Google consent was submitted after that explicit approval;
callback completed successfully on the fresh sign-in attempt. The earlier
attempt expired with an invalid-state callback; it was not treated as success.

Keep the connection-check workflow unpublished and read-only. No chart creation
or sync schedule is enabled by configuring OAuth. Rollback for a failed setup:
leave the new credential/client unused; preserve old connections. Any eventual
deletion is a separate explicitly verified cleanup action.

## Verified preview

- Studio-owned destination folder: `1-WqB2lVbK6e1j6Y0mCojZjPoCvmaJ4L7`,
  **St Matthews Seating Charts**. Confirmed owner is the St. Matthews email.
- Native whole-workbook copy created in that folder using the signed-in studio
  browser; master untouched. New ID:
  `1h0X3zNWCxkG3p7x71LPeFBE-FbC5dLLVj0swto8KwiQ`.
- Title: `20261018 Autumn Mountain Evening (Main) — PILOT PREVIEW`.
- Pinot class **931955**, October 18, 5–7 PM, Regular/Public, Main Studio,
  loaded as Matthews. The source seating table has nine rows/four unnamed seats.
- Main tab V1:AA9 and AC1:AC9 populated in the studio browser, excluding Order
  Id and Checked In. Blank guest rows retained. Header cells A3/D3/J3/R5 identify
  date/time/painting/class ID; C6/C7 identify the preview update.
- Connector readback confirmed nine purchaser rows, four blank guest names,
  blank T seat numbers, blank AB attendance, and intact U label formulas.
- This was a one-time manual pilot through the correct account, not a completed
  n8n sync or verified refresh. No private-party form was populated in this test.

## Connection investigation

Created unpublished/read-only n8n workflow `jRuTmUjlinamazss` in Seating Charts.
Builder: `connection-check.cjs`; source JSON: `00-stm-connection-check.json`.
It reads account identity before checking studio master/folder ownership and
Sheets API access. Manual-only trigger; no write calls or schedule nodes.

Existing Drive credential `iAsCc68ZuvNjvwWK` returns
`pinotspaletteconnect@gmail.com`; its studio guard failed before file checks.
Existing Sheets credential `9EhmdmlA2Zn10Nzs` returns
`duffseaselempire@gmail.com`. The HTTP identity call succeeded; its queued code
guard was stopped after that account mismatch was already visible. Neither
credential was modified/reconnected. Both reference the same existing Google
app; do not use either account for studio-owned automation writes.

The separate new n8n credential form is named
`St Matthews Seating Charts — Google Drive`. OAuth completed and the fresh
manual check passed all nine nodes in 4.75 seconds: correct studio account,
master copy permission/ownership, destination edit permission/ownership, and
Sheets spreadsheet identity/timezone. Final result: `connection_verified`,
six template tabs, zero writes, schedule disabled. The verified new credential
reference is now bound only to STM in draft studio configuration.
Scheduled collection, approved private warehouse storage, live collector
deployment and overlap execution still remain. Durable row reconciliation and
isolated repeated-refresh validation are now prepared/verified as below; the
complete source-to-warehouse-to-Sheets path is not yet verified.

New credential ID: `Fmbjd7IWMJeb4vZQ`, type `googleDriveOAuth2Api`.
The generated connection check now uses this verified new credential. Do not
reuse the old Sheets/Drive credentials for studio-owned chart writes.
Local verification: 60 checks (54 planner/ETL/workflow tests, six collector-route
tests). No live source collector was run through the new route.

## Reservation refresh preparation and live preservation test

Owner explicitly requested wiring and testing STM reservation updates while
preserving seating and attendance. All work remains scoped to STM Main/class
931955 and isolated test copies; no schedule or other studio is activated.

- Source order grids expose a stable numeric reservation ID in
  `input[name="reservationCheckbox"]`. Read all four pilot orders: nine unique
  IDs, including four unnamed guests, with exact order/name/email group counts.
  Transient Kendo data-uid and order ID alone are never identities.
- Seating Comments can include generated `No special seating requested` even
  when order comments/Seating Requests are blank. Comments are preserved from
  seating but excluded from the identity join. Ambiguous duplicate names with
  different imported fields stop; indistinguishable duplicate rows keep all seats.
- Source class location label `Matthews`, Main room ID `21`, Regular type `100`
  independently verified. Collector fails if class moves rooms/studios/types.
- New collector files: `playwright/scripts/pts/classRoster.cjs`,
  `rosterSession.cjs`, `playwright/routes/classRoster.cjs`. Additive mount example:
  `collector-mount.cjs.example`. Existing production source routes/server unchanged.
- `refresh.cjs` preserves reservation row identity, uses only V:AA/AC RAW writes,
  compares fresh values against last-written data to protect staff edits, retains
  removed rows for review, supports immutable-plan recovery, and verifies all
  T/U/AB user-entered values after writing. It never inserts/sorts/deletes rows.
- Existing real pilot can be adopted only with explicit config, a complete
  exact import/source match and blank seating/attendance. It cannot silently
  guess identities onto staff-populated charts.

Saved unpublished manual workflow `bvIGNHKQ7C0ClkRd`:
`01 - Seating Charts - STM isolated refresh test`.
Live run succeeded in 15.772s, using ONLY synthetic guests in a new native copy:
`18zK3ZhaN_KFx8lMtGqfBlbwPbnpTOLfuwJwp9-G1YqA`.
It seeded test seat/attendance values in that copy, then updated/reordered two
guests and added a third. Result `preservation_test_passed`: seating, attendance
and formulas unchanged, repeat write count zero, original pilot untouched.
Screenshots: `output/seating-charts/stm-refresh-preservation-test.png` and
`stm-refresh-test-sheet.png`. The test does not verify source authentication,
warehouse RPCs, scheduling or production refreshes.

Saved unpublished manual workflow `98ycKfyxtUuHn6ww`:
`02 - Seating Charts - STM reservation refresh - DEPLOYMENT PENDING`.
Builder `reservation-workflow.cjs`; JSON `02-stm-reservation-refresh.json`.
Its target ID is deliberately unset; it stops before external calls until the
approved target is registered. It stages source/plan in private warehouse state
before Google writes, then verifies readback before marking success. Unfinished
runs block later runs for recovery/review; no blind retry after an unknown write.

## Deployment approved — October 18, 2026

Owner explicitly approved STM deployment, database changes and manual pilot
testing, with scheduled updates OFF. This approval persists; do not ask again
for the same scoped rollout. Railway sign-in is restored. Supabase administration uses existing encrypted
n8n Postgres credential `cQudCPHn5oTqSxiY` (verified project host/user), without
copying its password or changing its existing settings.

Live database preflight passed via unpublished manual workflow `EQAXEtyVz6PdtSsD`:
PostgreSQL 17.6, studio 1/organization 1/source location 19, active PTS account 1
in the same organization; neither new seating table exists. Existing account
uses a Vault reference. Production source snapshot has `resolvePtsAccount` and
`runPtsReportQueued`; the new resolver now reuses those existing mechanisms.
No legacy-credential fallback or broker configuration changes are needed.
Eight local collector/account-isolation tests pass (62 total local checks).

Applied and independently verified: two tables with RLS, four RPCs, no anon or
authenticated browser access, service role enabled. Registered target
`b338bb62-58b2-4824-b38f-88e677d42fa2` for studio/account1, class931955,
the existing pilot copy, sheet0, rowLimit1000, explicit strict adoption.
02 is now `STM reservation refresh - MANUAL PILOT`, target-bound and unpublished.
Collector deployed through PR88 (`33c66760f16560075097da67eab0755e3ca7aebf`)
from actual production baseline714df0a on `codex/auth-onboarding`, not stale main.
Two non-secret Railway variables bind only STM; broker/queue reused unchanged.
First manual run failed at source collection (502) before any warehouse claim
or Google write. PR89 adds allow-listed failure-stage names, never raw errors
or guest/session data; merged `eec02e15fb3e03b7bf901a7a31569d139b1aeeae`.
Diagnostic deployment identified `order-reservations`: the reservation grids
are already loaded but an order detail section starts collapsed. PR90 changes
the wait from visible to attached (no source edits), adds diagnostic privacy
coverage, and is merged as `5bf1e08ff5cfeed1618069d651d1fa55aa121e8a`.
63 local checks pass. Fixed deployment is active.
Scheduled updates remain OFF. Audit after both failed attempts confirms revision0,
empty ledger, no refresh runs, and no active lease; no Sheet writes were reached.

## Final verified manual result

- Completed real source/warehouse/Google runs: `stm-pilot-168282` (37.821s),
  `stm-pilot-168286` (36.177s). Both returned `updated`, activeCount9,
  changedCount0, reviewCount0, seatingUnchanged/attendanceUnchanged/formulasUnchanged=true.
- Warehouse revision2, nine ledger entries, identical reservation-to-row maps
  across both plans and final ledger, no lease held. Full source snapshots and
  immutable plans persisted privately before Google verification.
- Zero real cell writes were appropriate: the existing pilot already matched
  fresh source, including four purchaser-first-name guest labels. Actual
  update/addition writes and protected-cell preservation were verified separately
  in the synthetic native copy; no seating/attendance were set in the real chart.
- 02 remains unpublished/manual-only. No schedule nodes or recurring updates.
  03 now contains only `database-pilot-audit.sql` for read-only verification.
- Proof: `output/seating-charts/stm-manual-pilot-first-pass.png`,
  `stm-manual-pilot-repeat-pass.png`, `stm-collector-deployed.png`,
  `verification-20261018.json`. Run `verify-pilot-state.cjs` for a fresh metadata-only audit.
- Remaining larger scope: automated native workbook creation, overlap/tab
  execution and private-party forms; other studio connections/mappings; overnight
  time and recurring rollout. Do not describe those as deployed.

Owner's subsequent label request: unnamed seats display the purchaser's first
name plus `'s guest`. Updated only W2/W4/W5/W6 in the real pilot (one Linda,
three Addison). Exact T:AC readback confirmed only those four W cells changed;
T seats, AB attendance and U formulas were identical. Raw source names and
reservation IDs remain unchanged internally. Updated the writer, refresh ledger
comparison and generated workflow definitions; a later real guest name replaces
the label on its original row. That label request alone did not approve deployment/schema
changes; the subsequent explicit deployment approval above does. Targeted tests (28) passed, including fallback names and protected-row
transitions. Existing unchanged tests bring the verified suite total to 60.

Repository AGENTS.md requires approval before schema changes, Railway changes,
deployment or production jobs. The owner has now granted the scoped approval.

Concrete rollout:

1. Read live studio/account configuration and verify STM ownership, the existing
   PTS login binding, and schema compatibility. Do not copy secret values.
2. Review and run an isolated rollback trial of
   `migrations/001_private_refresh_state.sql`; verify service-role-only access,
   studio/account ownership, lease conflict, replay, protected-column rejection
   and completion guards. Live rollback trial passed all guards; both tables
   disappeared after rollback. Fixed the trial generator to preserve SQL dollar quotes.
3. Apply the additive migration: two private RLS tables (targets and source/run
   history), four service-only RPCs. Applied successfully October 18 at 19:46 ET;
   independent post-apply verification follows. No existing tables/data changed. Guest
   contacts are private operational source data, never public reporting views.
4. Deploy ONLY the new collector modules and small mount addition. Add two
   non-secret settings: PTS_SEATING_ACCOUNT_ID and PTS_SEATING_STUDIOS_JSON.
   Reuse existing verified PTS login and collector token; do not rotate secrets
   or alter existing source workflows. Railway root/Docker structure stays intact.
5. Register only existing real pilot copy/class 931955, Main sheet 0, studio
   email, source room/type and verified template IDs. Verify live grid size and
   fresh source; adopt existing rows only if all adoption checks pass.
6. Configure the unpublished 02 workflow with the target ID; run twice manually,
   verifying source/warehouse counts, stable rows, T/U/AB before/after, no duplicate
   rows and last-success updates only after readback. No source reservation edits.
7. Stop for review before creation/overlap automation or recurring schedules.

Rollback: disable only the new target, leave 02 unpublished, remove/disable the
new collector mount/config, preserve chart/staff work and private run history.
Do not drop state tables, delete charts, or change existing integrations as an
automatic rollback. Retention/catch-up/automatic recovery policy needs a separate
recurring-rollout review; this scope is one manual STM pilot.
