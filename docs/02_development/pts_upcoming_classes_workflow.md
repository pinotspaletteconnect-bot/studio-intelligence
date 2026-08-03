# PTS Upcoming Classes Snapshot Workflow

## Purpose

Populate the Upcoming Classes dashboard from the existing authenticated
`POST /pts/class-sales-report` collector without creating a second collection
path.

## Daily request

- Run once daily after the completed-day Class Sales workflow.
- Use the current `America/New_York` date as `snapshot_date`.
- Request `fromDate = snapshot_date` and `toDate = snapshot_date + 89 days`.
- Send one collector request per active PTS studio code, then combine the
  validated studio results before the warehouse replacement call. This keeps
  each request below the Railway gateway timeout while preserving an
  all-studio snapshot date.
- The collector continues to split the request into seven-day PTS windows.

## Transformation

For every returned class row, resolve organization, brand, and studio through
the active `studio_integrations` PTS mapping and write:

- `snapshot_date`
- `source_event_key`
- `event_date`, painting, class time, room, and source class type
- seats, capacity, source percent full, and average lead time
- class, product, fee, and net sales
- source retrieval timestamp

The workflow must not treat Product Sales from this report as authoritative
product revenue. It is retained only as source context.

## Replacement and retry behavior

Each studio and snapshot date is one replaceable slice:

1. Collect and validate the complete studio result in memory.
2. Reject the studio slice if collection or validation is incomplete.
3. Delete existing rows only for that `studio_id` and `snapshot_date`.
4. Insert the newly validated rows.
5. Retain the n8n execution result and row count for operational audit.

Do not delete prior snapshot dates. They are required for pickup calculations.
A same-day rerun replaces that day's slice and does not create duplicate
history.

## Yesterday pickup

`pts_upcoming_class_snapshots_reporting` compares consecutive snapshots of the
same stable event key. Pickup is returned only when the preceding snapshot is
exactly one calendar day earlier:

- seats pickup = current seats sold minus prior seats sold
- revenue pickup = current class sales plus fees minus prior class sales plus fees

These are net pickup figures. They can be negative after cancellations or
adjustments. They are not exact gross orders placed yesterday. The Upcoming
Classes KPI cards use `pts_reservation_booking_daily`, populated by workflow
`13 - PTS Reservation Bookings Import`, for exact gross yesterday booked seats
and booked sales.

An event that disappears entirely from a snapshot cannot currently be measured
as cancelled in class-level net pickup. Exact gross orders are captured by the
Reservations-grid collector; disappeared-event handling would still require
explicit zero-row tombstones.

## Initial validation

- Migration deployed July 31, 2026.
- The controlled all-studio run loaded 700 unique future class rows through
  late October: 146 St. Matthews, 233 Short North, 215 Gilbert, and 106
  Jeffersonville.
- Workflow `12 - PTS Upcoming Class Snapshots` is published on the daily 5:30
  AM America/New_York schedule.
- Same-day replacement and consecutive-day pickup should be rechecked after
  two fresh scheduled snapshots.
- Workflow `13 - PTS Reservation Bookings Import` was published August 2, 2026
  at 6:00 AM America/New_York. Its controlled August 1 load matched the PTS
  Reservations grid at 111 gross booked seats and $4,166.20 gross booked sales.
