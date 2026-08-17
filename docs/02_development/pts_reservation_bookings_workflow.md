# PTS Reservation Bookings Workflow

## Purpose

Replace the Upcoming Classes dashboard's misleading snapshot-difference
headline cards with exact prior-day booking activity from the non-downloadable
PTS Reservations grid.

## Metric contract

For each studio-local Reservations row whose displayed `Order Date` equals the
target completed date:

- booked seats = `Ord`
- active booked seats = `Res`
- refunded seats = `Ref`
- held seats = `Hld`
- booked sales = `Sales`

Booked sales is a gross booking-line measure. The Reservations grid does not
expose refunded dollars, so it must not be labeled net revenue.

The class-level snapshot differences remain available and are labeled net seat
pickup and net revenue pickup. They are not used for the two prior-day booking
KPI cards.

## Collection

- Route: authenticated `POST /pts/reservations-report`.
- Request: previous completed `America/New_York` date.
- Class search window: target date through 516 days later by default. A wide
  class-date window is required because PTS filters the grid by class date, not
  order date.
- Studios are selected individually because PTS has no all-location option.
- The jqGrid page size is increased to 500 and the collector rejects truncated
  or non-descending results before filtering the target order date.
- Purchaser names are deliberately excluded. Only confirmation/order
  identifiers, class context, seat status counts, and sales are returned.
- Each newly collected order is opened once to extract the normalized
  five-digit `BillingZip` and sum the item-table `Discount` column. It also
  associates the parenthesized promotion code on the purchased item with the
  description on the zero-dollar `Apply Discount` helper row. That helper row
  is not counted as a second discount. Gift certificates and refunds are not classified as discounts. The collector
  returns a separate one-row-per-order collection so multi-class orders do not
  duplicate ZIP revenue or discount totals.

## Warehouse replacement

`pts_reservation_bookings` stores one studio/order-date/order-class line. The
natural key is `(studio_id, order_date, source_row_key)`.

`replace_pts_reservation_booking_slice` atomically deletes and reinserts one
validated studio/date slice. An empty array is valid and records a verified
zero-booking day by clearing any prior rows for that slice.

`pts_reservation_booking_daily` provides the studio/date aggregate consumed by
the Upcoming Classes service.

Migration `20260817160000_pts_order_geography_discounts.sql` adds the separate
`pts_order_attributes` order grain, the `upsert_pts_order_attributes` loading
RPC, and `pts_order_geography_daily`. Deployment and production workflow
cutover remain pending.

## Scheduling and reliability

- Run daily at 6:00 AM America/New_York, after the future-class snapshot.
- Validate all four configured studios before warehouse replacement.
- Use the existing encrypted collector and Supabase credentials.
- Retain n8n execution history for row-count and failure auditing.

## Production validation

- Migration `20260802120000_pts_reservation_bookings.sql` was applied August 2,
  2026.
- Workflow `13 - PTS Reservation Bookings Import` is published on the daily
  6:00 AM America/New_York schedule.
- The controlled August 1 load reconciled all four PTS grids at 111 ordered
  seats, 107 active seats, 2 refunded seats, 2 held seats, and $4,166.20 gross
  booked sales.
