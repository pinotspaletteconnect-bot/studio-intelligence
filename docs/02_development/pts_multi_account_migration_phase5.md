# PTS Multi-Account Migration — Phase 5 Reliability and Cutover

**Started:** August 9, 2026

**Safety state:** Production workflows 05, 06, 07, 12, and 13 remain the live
collectors. Multi-account shadow definitions are published, but their schedules
and warehouse writers are deactivated.

## Objective

Make the multi-account path operationally reliable, prove output parity, and
prepare a reversible one-workflow-at-a-time cutover. Publishing a definition is
not a cutover; no shadow may write or run on a schedule until its individual
gate is satisfied.

## Reliability work

1. Divide Upcoming Classes' 90-day, multi-studio workload into bounded,
   sequential units so no PTS downloads overlap and no individual Railway
   request approaches the gateway limit. **Completed:** 12B now emits one work
   item per configured studio and its HTTP node processes one item per batch
   with a two-second interval.
2. Preserve the complete 90-day horizon and merge results before the existing
   replace-style snapshot write.
3. Add bounded retries only for failures proven safe to repeat. Never retry an
   ambiguous write or launch concurrent PTS report downloads for one account.
4. Persist account-level collection audit records without storing usernames,
   passwords, tokens, reservation contacts, or raw secrets.
5. Record account ID, workflow/report type, requested range, started/completed
   timestamps, status, row counts, attempt count, and sanitized error category.

## Per-workflow cutover gate

For each of 05B, 06B, 07B, 12B, and 13B:

- capture a fresh warehouse baseline and export the current production workflow;
- run the shadow with its writer disabled for the same input as production;
- reconcile studio coverage, dates, row counts, totals, and representative rows;
- verify duplicate/upsert/replace behavior using a safe repeat run;
- enable only that shadow's writer and execute one supervised run;
- verify downstream dashboard/report consumers against the warehouse;
- disable the corresponding legacy schedule only after validation;
- enable the replacement schedule at the confirmed live time;
- retain the legacy workflow unchanged and disabled for rollback;
- monitor the next scheduled execution before advancing to another workflow.

## Cutover order

Use the lowest-risk validated paths first and Upcoming Classes last:

1. 05B Daily Sales
2. 06B Product Sales
3. 07B Class Sales
4. 13B Reservations
5. 12B Upcoming Classes

Only one workflow may be in supervised cutover at a time. A failure returns the
system to the unchanged legacy schedule before further work.

## Upcoming Classes reconciliation

The August 9 legacy execution at 5:30 AM was compared with the bounded shadow
execution at 11:15 AM:

| Studio ID | Legacy rows | Shadow rows | Shadow-only keys | Legacy-only keys |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 128 | 128 | 0 | 0 |
| 2 | 218 | 218 | 0 | 0 |
| 3 | 225 | 224 | 0 | 1 |
| 4 | 99 | 99 | 0 | 0 |
| **Total** | **670** | **669** | **0** | **1** |

All 669 shadow event keys existed in the legacy output. The one legacy-only row
was St. Matthews' same-day `Country Drive` class, which was no longer returned
by PTS six hours later. Representative identity, date, painting, room, type,
and capacity fields matched. Seats and revenue increased on several shared
events, consistent with legitimate bookings between the two collection times.

## Audit foundation

Migration `20260809180000_pts_collection_run_auditing.sql` is deployed. It
extends `integration_runs` with organization, opaque PTS account, workflow,
report, requested-range, attempt, execution-reference, and sanitized error
category fields. Service-role-only `start_pts_collection_run` and
`finish_pts_collection_run` functions validate tenant/account ownership and
never accept credentials, contacts, raw payloads, or raw error text.

The functions were exercised inside a rolled-back transaction and left zero
test rows. Workflow instrumentation is still required before the audit gate is
fully complete.

Migration `20260809190000_pts_audit_execution_completion.sql` is also deployed.
It makes each PTS execution reference unique and adds the service-role-only
`complete_pts_collection_run_by_execution` RPC. The RPC lets a shared n8n
success or error path close exactly one running audit record without receiving
credentials, contacts, raw payloads, or raw error text. Its status, row-count,
and sanitized error-category validation was exercised inside a rolled-back
transaction and left zero test rows.

Reusable n8n drafts `17 - PTS Collection Audit RPC` and
`18 - PTS Collection Error Audit` were imported on August 9. Workflow 17
validates start/completion input and calls the protected audit RPCs. Workflow
18 maps n8n failures to the approved fixed error categories before closing an
audit by opaque execution reference. Both remain unpublished, have no schedule,
and are not attached to any production or shadow collector. Importing these
drafts does not complete the instrumentation gate.

## Phase 5 gates

- [x] Publish dispatcher and shadow definitions with schedules and writers off.
- [x] Pass write-disabled parity collection for 05B, 06B, 07B, and 13B.
- [x] Implement bounded sequential work for 12B without shortening its horizon.
- [x] Pass 12B with its writer disabled: four studio results in 2m 48s.
- [x] Reconcile 12B row counts, event keys, and representative records against
  the legacy workflow for the same snapshot date.
- [x] Deploy and validate the privacy-safe account-level audit schema and RPC
  contract.
- [x] Import reusable start/completion and sanitized-error audit workflows as
  unpublished, unattached drafts.
- [ ] Instrument each shadow's start, success, and sanitized failure paths with
  the audit RPC contract.
- [ ] Document exact live schedules immediately before each cutover.
- [ ] Cut over each workflow individually with fresh approval and rollback
  verification.
- [ ] Confirm the new-account onboarding test collects only its assigned studios
  and exposes no cross-organization data.
