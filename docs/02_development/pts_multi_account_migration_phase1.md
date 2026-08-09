# PTS Multi-Account Migration — Phase 1 Baseline

**Captured:** August 8, 2026

**Scope:** Production workflows 05, 06, 07, 12, and 13

**Change policy:** Observation only. No production workflow, schedule, credential, collector, or warehouse behavior was changed.

## Freeze point

The five workflows below are the rollback boundary for the multi-account migration. They must remain published and unchanged until a shadow replacement for the corresponding feed passes parity testing. n8n Version History is the authoritative executable rollback source. A downloaded copy of workflow 06 also exists in the operator download archive from August 2, 2026; that older file must not replace the current n8n version without a diff.

Existing unrelated worktree changes in `playwright/package.json`, `outputs/`, and `playwright/tools/` were present before this baseline and were not modified.

## Production inventory

| Workflow | Current schedule (America/New_York) | Collector | Warehouse destination | Idempotency / replacement boundary |
| --- | --- | --- | --- | --- |
| 05 — PTS Daily Sales Import | Published daily workflow; exact live trigger must be re-confirmed immediately before cutover | PTS Sales report | `pts_sales_daily_summary` | One row per `studio_id, report_date` |
| 06 — PTS Product Sales Import | 2:00 AM previous completed business date, with documented 8:00 AM and 10:30 AM reconciliation runs | `/pts/product-sales-report` | `pts_non_class_sales_items` | `studio_id, report_date, source_row_hash`; same-date reruns retain IDs |
| 07 — PTS Class Sales Import | 5:00 AM rolling prior 14 completed event days, with documented 8:00 AM and 10:30 AM reconciliation runs | `/pts/class-sales-report` | `pts_class_sales_daily` | `studio_id, source_event_key`; current row is overwritten with the latest observation |
| 12 — PTS Upcoming Class Snapshots | 5:30 AM daily | Future Class Sales collection | `pts_upcoming_class_snapshots` | One observation per `studio_id, snapshot_date, source_event_key`; daily account snapshot is replace-style |
| 13 — PTS Reservation Bookings Import | 6:00 AM daily for the prior completed order date | Reservations-grid collection | `pts_reservation_bookings` | One privacy-safe source row per studio/order date/source key |

Schedule descriptions are taken from the current integration/status documentation. Because production schedules have previously been edited independently in n8n, the live trigger displayed in n8n remains authoritative at cutover.

## Confirmed live workflow 07 contract

The production workflow is published and currently contains:

- collector request: `POST https://studio-intelligence-production.up.railway.app/pts/class-sales-report`;
- authentication: n8n Header Auth credential `Studio Intelligence Collector`;
- request body: `{"fromDate":"{{$json.fromDate}}","toDate":"{{$json.toDate}}"}`;
- request timeout: 600,000 ms;
- warehouse request: `POST .../rest/v1/pts_class_sales_daily?on_conflict=studio_id,source_event_key`.

This is the critical legacy baseline: the request does **not** provide an `accountId`. A shadow workflow must preserve every other transformation and upsert behavior while adding account routing.

## Previously confirmed workflow 06 contract

- collector request: `POST https://studio-intelligence-production.up.railway.app/pts/product-sales-report`;
- authentication: n8n Header Auth credential `Studio Intelligence Collector`;
- request body: `{"reportDate":"{{$json.reportDate}}"}`;
- warehouse destination: `pts_non_class_sales_items`;
- the request does **not** provide an `accountId`.

## Warehouse baseline contract

The following grains and downstream consumers are frozen for parity testing:

| Source table | Required grain | Primary reporting consumer |
| --- | --- | --- |
| `pts_sales_daily_summary` | studio/report date | `pts_daily_operations_reporting` |
| `pts_non_class_sales_items` | studio/report date/source row hash | daily operations product detail and governed product reporting |
| `pts_class_sales_daily` | studio/source event key | daily class detail and operations reporting |
| `pts_upcoming_class_snapshots` | studio/snapshot date/source event key | `pts_upcoming_class_snapshots_reporting` |
| `pts_reservation_bookings` | studio/order date/source row key | `pts_reservation_booking_daily` |

Dashboard services currently expect all five feeds. A migrated workflow is not at parity if it populates only summary data or only the future snapshot feed.

## Required parity capture before each cutover

For the current four studios—Gilbert, Jeffersonville, Short North, and St. Matthews—capture the following from both the legacy and shadow run for the same report dates:

1. source row count and distinct natural-key count;
2. seats, class revenue, product revenue, fees, and total sales;
3. product quantity and revenue by governed product group;
4. class count, capacity, seats, and revenue by governed class type;
5. upcoming class count, booked seats, capacity, and booked revenue;
6. reservation gross seats and sales, plus active/refunded/held seats;
7. duplicate-key count and unmapped-studio count.

The minimum representative dates are:

- one normal completed date with both class and product sales;
- one legitimate zero-product-sales date;
- one date containing private/mobile events and marketing placeholders;
- the latest completed date available at cutover.

## Phase 1 gates

- [x] Working workflows remain published and unchanged.
- [x] Collector endpoints, warehouse destinations, and natural keys are recorded.
- [x] Current workflow 07 request and upsert contract were re-confirmed live.
- [x] Current workflow 06 request contract was previously exported and re-confirmed during the onboarding audit.
- [x] Existing dashboard/reporting consumers are recorded.
- [x] Rollback source is identified as each workflow's n8n Version History.
- [ ] Downloaded JSON rollback files for the current versions of all five workflows are stored outside the repository.
- [ ] Point-in-time warehouse totals are captured immediately before the first shadow run.

The last two items are intentionally deferred until immediately before Phase 3 execution. Exported definitions and point-in-time totals become stale if captured while production workflows continue running. They are mandatory pre-run checks, not permission to edit production.

## Rollback rule

During later phases, restore the corresponding frozen n8n version and schedule immediately if a replacement causes missing studios, duplicate keys, cross-organization data, unexplained total differences, incomplete class/product details, or repeated collector timeouts. Never roll back warehouse history destructively; rerun the frozen idempotent workflow for the affected date window.
