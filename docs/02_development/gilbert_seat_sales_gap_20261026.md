# Gilbert seat-sales gap - October 26, 2026

Read-only warehouse inspection found Gilbert class records for October 21 and 24
containing 15 and 53 seats, but neither date exists in the daily reporting or
historical operations sources. Operations builds its KPI totals from those daily
sources, omitting 68 seats already available in class detail.

October 1-25, 2026 has 485 class-reported seats in the daily source versus 553 in
class detail. Same-weekday comparison (364-day shift) is October 2-26, 2025:
695 seats. Including the missing dates changes the decline from 30.2% to 20.4%.
Calendar-date October 1-25, 2025 instead has 692 seats.

YTD January 1-October 25, 2026 has 6,997 daily-source seats, or 7,065 including
the missing class dates. Same-weekday prior January 2-October 26, 2025 has 8,112.
Historical 2025 daily/class-type rows are present. These figures reconcile stored
records; no fresh PTS collection or source-completeness claim is made.

The older primary workspace reads summary attendance directly: October 482,
August 532 and September 441. The newer service already reads class-reported
seats on overlapping dates: October 485, August 747, September 538. The latter
two discrepancies do not require additional corrections in that newer service.

Initial coverage checks found October 21/24 daily summaries absent for all five
studios. Detailed reconciliation focuses on Gilbert per the owner's clarification.
The underlying import failure has not been diagnosed or rerun.

## Prepared correction

Branch `codex/seat-sales-yoy-reconciliation` fills absent studio/date rows from
existing reportable class events. Seats, capacity and class revenue aggregate
once per date; existing daily/historical rows retain precedence. Existing product
reconciliation and studio access filters remain in effect. Timezone lookup also
includes class-only studios for existing before-opening/placeholder filters.

This does not certify missing daily imports or non-class sales as complete.
No warehouse, schema, workflow, credential or production configuration changed.

## Verification and release

- All 15 reporting tests pass: year-over-year recovery, overlap, multiple events,
  tenant isolation, zero seats and timezone filtering.
- Actual warehouse snapshot replay passes: October 553 versus 695; YTD 7,065
  versus 8,112, including painting/timestamp filter fields. Private evidence is
  in the primary workspace's ignored `tmp/gilbert-yoy-audit-20261026.json`.
- Dashboard lint passes.
- Default build blocked by Turbopack's shared dependency junction restriction;
  webpack build blocked by missing local `d3-geo` and `zipcodes-us` packages.
  Full build and rendered dashboard verification remain outstanding.
- Not deployed. Explicit production deployment approval is required by AGENTS.md.
  Rollback: revert this service change; no data migration is needed.
