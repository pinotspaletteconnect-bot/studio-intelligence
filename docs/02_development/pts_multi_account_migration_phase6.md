# PTS Multi-Account Migration — Phase 6 Operational Validation

**Started:** August 9, 2026

**Production state:** Multi-account workflows 05B, 06B, 07B, 13B, and 12B
own the live schedules. Corresponding legacy workflows remain published with
their schedules disabled for rollback.

## Objective

Prove the replacement collectors operate reliably on their normal schedules,
complete privacy-safe run auditing, and validate that onboarding an additional
organization exposes and collects only its assigned studios.

## August 10 scheduled-run gate

### Preflight correction completed August 9

Manual preflight exposed that the replacement workflows' local schedule and
manual entry paths reached their report-date nodes without first obtaining the
Phase 3 account job. Those paths failed closed with a missing `accountId`,
`organizationId`, or `studioTargets` error before any collector or warehouse
write ran.

The live definitions for 05B, 06B, 07B, 13B, and 12B now route every local
schedule/manual start through workflow 15, `PTS Multi-Account Shadow
Dispatcher`, before collection. Their `When Executed by Another Workflow`
paths remain direct because the caller already supplies the validated account
job. Product Sales also preserves its separate specific-date path by routing
that input through the dispatcher before its collector.

All five corrected definitions were published and passed supervised live runs
on August 9. The successful runs verified that the dispatcher supplied the
configured account and all four current studio targets. Writes use their
existing upsert/replacement behavior, so the validation reruns did not create a
second ingestion path.

### August 10 first scheduled-run result

The first production schedule exposed a second, independent reliability issue:

- 13B Reservations succeeded at 6:00 AM in 17.91 seconds and replaced four
  studio slices.
- 12B Upcoming Classes succeeded at 7:30 AM in 2m 26.919s. SASHA displayed the
  August 10 snapshot and the August 9 reservation totals.
- 05B Daily Sales failed at 8:00 AM after the PTS Run button click waited for a
  navigation that did not settle. No warehouse writer ran, and SASHA displayed
  an explicit zero row for August 9.
- 06B Product Sales and 07B Class Sales both reached the account-aware
  collector at 8:00 AM but received Railway 502 responses. Three same-account
  Chromium collectors had started concurrently at 8:00 AM, contrary to the
  Phase 5 bounded-work rule.

A collector patch is prepared but not yet deployed. It makes Run-button clicks
explicitly non-blocking while separately observing optional page navigation,
and introduces an account-scoped queue for every browser-based PTS route.
Requests for one PTS account now serialize; different PTS accounts may still
run independently. Queue unit tests cover serialization, independent accounts,
and recovery after a failed task. Production deployment and recovery runs
remain approval-gated.

Observe and reconcile every production execution in schedule order:

1. 13B Reservations at 6:00 AM.
2. 12B Upcoming Classes at 7:30 AM.
3. 05B Daily Sales at 8:00 AM.
4. 06B Product Sales at 8:00 AM.
5. 07B Class Sales at 8:00 AM.
6. 06B Product Sales and 07B Class Sales reconciliation runs at 10:30 AM.

For each execution, confirm success status, configured account and studio
coverage, expected business date or horizon, row counts, sanitized audit state,
warehouse freshness, and downstream dashboard/report totals. A failed or
materially incomplete feed is rolled back individually by disabling its
replacement schedule and re-enabling the preserved legacy schedule.

## Remaining gates

- [x] Reconcile all first scheduled replacement executions on August 10.
- [ ] Deploy and validate the account-scoped collector queue and Run-button
  navigation correction.
- [ ] Recover August 9 Daily Sales, Product Sales, and Class Sales after the
  collector deployment, then reconcile SASHA totals.
- [ ] Confirm automatic success and sanitized-failure auditing for each feed.
- [ ] Confirm Operations, Executive, and Upcoming Classes consumers remain
  consistent with their reporting views after the scheduled loads.
- [ ] Onboard one test studio under its intended organization and PTS account.
- [ ] Prove the dispatcher returns only that account's assigned studios.
- [ ] Prove warehouse writes carry the correct organization and studio keys.
- [ ] Prove dashboard authorization exposes no cross-organization data.
- [ ] Exercise and document one rollback without deleting either workflow.
- [ ] Close the migration only after the observation window and tenant-isolation
  evidence are retained in current project documentation.
