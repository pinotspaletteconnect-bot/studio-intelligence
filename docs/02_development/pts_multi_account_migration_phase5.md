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

Reusable n8n workflows `17 - PTS Collection Audit RPC` and
`18 - PTS Collection Error Audit` were imported on August 9. Workflow 17
validates start/completion input and calls the protected audit RPCs. Workflow
18 maps n8n failures to the approved fixed error categories before closing an
audit by opaque execution reference. Both are published so n8n can call them,
but neither has a schedule or access to PTS credentials. Workflow 19 is an
unpublished wrapper around the unchanged, write-disabled 05B shadow; workflow
20 is its unpublished manual validation runner. The 05B production workflow,
legacy schedule, and warehouse routing remain unchanged.

The August 9 audited 05B validation completed successfully in 51.9 seconds.
The dispatcher returned the configured account job, the Vault-backed collector
returned four studio outputs, and the deactivated 05B writer prevented business
table changes. `integration_runs` retained one privacy-safe record for account
1 and organization 1, report date August 8, status `succeeded`, four processed
studio outputs, one attempt, execution reference `103452`, and no error
category. Workflow 19 is configured to use workflow 18 for sanitized failures.

The controlled post-start failure test created audit execution `103469`, then
raised an intentional validation error without calling PTS or a business-table
writer. n8n Error Trigger workflows do not auto-run for editor/manual
executions, so unpublished workflow 22 exercised the identical sanitizer and
protected completion RPC used by workflow 18. The record closed as `failed`
with zero rows and the fixed category `validation`; no raw error text or secret
was stored. Automatic Error Trigger invocation remains a supervised
production-mode cutover check.

## 05B supervised cutover

The user explicitly approved the 05B cutover on August 9. Before the write,
the August 8 warehouse baseline was four summary rows, $6,797.34 gross sales,
$5,840.35 net sales, 161 seats, 19 class-detail rows, and 183 non-class rows.
The 05B writer was enabled while its schedule remained disabled, and audited
execution `103479` completed successfully with four studio outputs. Every
baseline count and total remained identical after the upsert, proving the
supervised repeat did not create duplicates. The
`pts_daily_operations_reporting` consumer also returned four studios and the
same sales and seat totals.

Legacy workflow 05's daily 8:00 AM schedule is now deactivated and the workflow
is preserved for rollback. 05B's writer and daily 8:00 AM, minute-zero schedule
are published and active. There was no schedule overlap. The final cutover gate
is observing the first scheduled 05B execution after 8:00 AM on August 10;
the remaining scheduled executions will be observed together on August 10.

## Same-day remaining-feed cutover

On August 9, the user approved completing the remaining production cutovers
before end of day so the complete replacement path could be exercised by the
August 10 schedules. This explicitly replaced the earlier one-day observation
gap between feeds. Each feed retained the individual safety sequence: writer
enabled with the replacement schedule off, account-aware supervised run,
successful warehouse write, legacy schedule disabled, and replacement
schedule enabled at the exact live time. Legacy definitions remain published
and unscheduled for rollback.

| Feed | Supervised result | Production schedule | Legacy state |
| --- | --- | --- | --- |
| 06B Product Sales | Succeeded in 36.546s; 183 item rows returned by the warehouse upsert | Daily at 8:00 AM and 10:30 AM | Workflow 06 schedule disabled |
| 07B Class Sales | Succeeded in 2m 19.392s for the rolling class-sales range | Daily at 8:00 AM and 10:30 AM | Workflow 07 schedule disabled |
| 13B Reservations | Succeeded in 23.55s; four studio replacement outputs | Daily at 6:00 AM | Workflow 13 schedule disabled |
| 12B Upcoming Classes | Succeeded in 2m 35.291s using bounded sequential collection | Daily at 7:30 AM | Workflow 12 schedule disabled |

The live Upcoming Classes trigger was 7:30 AM, correcting the stale 5:30 AM
time in the Phase 1 documentation. The first complete scheduled-run review on
August 10 remains the final production observation gate.

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
  trigger-only workflows without schedules or PTS credential access.
- [x] Pass one write-disabled 05B audited collection and verify its persisted
  success record.
- [x] Execute a controlled post-start 05B failure and verify the workflow 18
  sanitizer/RPC path closes the running record with only category `validation`.
- [ ] Instrument each shadow's start, success, and sanitized failure paths with
  the audit RPC contract.
- [x] Document exact live schedules immediately before each cutover.
- [x] Cut over each workflow individually with approval and rollback
  preservation. **05B, 06B, 07B, 13B, and 12B switched August 9; the first
  complete scheduled-run observation is pending August 10.**
- [ ] Confirm the new-account onboarding test collects only its assigned studios
  and exposes no cross-organization data.
