# PTS Multi-Account Migration — Phase 3 Shadow Workflows

**Completed:** August 9, 2026

**Production behavior:** Unchanged

## Safety boundary

All Phase 3 workflows are unpublished clones. The published workflows 05, 06,
07, 12, and 13 remain the production sources. A shadow workflow must not be
published or scheduled until the later cutover phase.

## Shadow inventory

| Shadow | Live status | Conversion status |
| --- | --- | --- |
| `12B - PTS Upcoming Classes Multi-Account` (`UdRtR0bj4HqqheXr`) | Unpublished | Accepts account jobs, passes `accountId`, inherited schedule disabled, production warehouse writer disabled |
| `13B - PTS Reservations Multi-Account` (`J1duIhF3jXGcAfYl`) | Unpublished | Accepts account jobs, passes `accountId`, inherited schedule disabled, production warehouse writer disabled |
| `06B - PTS Product Sales Multi-Account` (`yAWfErXHToZq8PLf`) | Unpublished | Accepts account jobs, passes `accountId`, inherited schedule disabled, production warehouse writer disabled |
| `07B - PTS Class Sales Multi-Account` (`JByM3h5lNvqLC6oy`) | Unpublished | Accepts account jobs, passes `accountId`, inherited schedule disabled, production warehouse writer disabled |
| `05B - PTS Daily Sales Multi-Account` (`qavPSqIYA8fxlVyO`) | Unpublished | Accepts account jobs, passes `accountId`, inherited schedule disabled, production warehouse writer disabled |

## Shared shadow contract

Each shadow preserves its production transformation but changes its
orchestration boundary:

- `When Executed by Another Workflow` accepts all fields from one validated
  dispatcher job;
- its date-preparation node validates the account and studio-target contract,
  retains the account metadata, and builds the same date window as production;
- its collector body includes `accountId`, the applicable date fields, and the
  account's configured studio codes;
- the inherited schedule trigger is deactivated;
- its final Supabase upsert or replacement request is deactivated, so a test
  cannot change production warehouse rows.

The shadows have not been executed against PTS. Their first collector tests require the
Phase 1 point-in-time baseline and explicit selection of the current account
job from workflow 15.

## Orchestration boundary

Workflow 15 emits one validated job per active PTS account in deterministic
account order. Every Phase 3 shadow accepts exactly one of those jobs through
`When Executed by Another Workflow`. This establishes the sequential unit of
work and retains `accountId`, `organizationId`, and the configured studio
targets at the collection boundary.

The parent execution chain, account-level execution audit rows, and retry
policy are deliberately deferred to Phase 4. Adding that live caller during
Phase 3 would make it possible to invoke PTS before the required warehouse
baseline is captured. Phase 3 therefore ends with callable, isolated shadows,
not a runnable multi-account schedule.

## Remaining Phase 3 gates

- [x] Create all five unpublished shadow clones.
- [x] Convert 12B to the account-job contract without production writes.
- [x] Convert 13B to the account-job contract without production writes.
- [x] Convert 06B to the account-job contract without production writes.
- [x] Convert 07B to the account-job contract without production writes.
- [x] Convert 05B to the account-job contract without production writes.
- [x] Establish the one-account/one-shadow-execution orchestration boundary.
- [x] Keep all shadows unpublished and disconnected from a live parent schedule.
- [ ] Capture current workflow JSON exports and point-in-time warehouse totals
  immediately before the first PTS shadow execution.

The remaining unchecked item is the entry gate for Phase 4, not unfinished
Phase 3 work.
