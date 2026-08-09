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

- [ ] Reconcile all first scheduled replacement executions on August 10.
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
