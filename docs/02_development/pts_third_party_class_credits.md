# PTS Third Party Class Credits (ClassPop)

## Purpose

Some studios sell class reservations through ClassPop. PTS exposes those
credits in `Reports/ThirdPartyClassCreditsReport`, but they are not guaranteed
to appear in the standard class-sales totals. SASHA therefore treats the report
as an optional per-studio PTS feed.

## Source contract

The report exposes Order ID, external Booking ID, order date, class date/time,
customer name, original amount, applied amount, and post date. SASHA deliberately
discards the customer name. The stable source key is Order ID plus external
Booking ID. `Applied Amount` is recognized revenue; zero means cancelled or not
yet paid. Original amount is retained for reconciliation only.

## Configuration and collection

Owners and administrators enable **Uses ClassPop** on an individual studio's
PTS settings. The toggle adds `third_party_class_credits` to that studio's
configured report list. Workflow artifact `23 - PTS Third Party Class Credits`
calls the account-aware, queued collector only when at least one studio on the
account is enabled. Its rolling window covers 30 completed days and 90 future
days so future zero-value rows can become recognized credits after the class.

## Warehouse and matching

`pts_third_party_class_credits` preserves the privacy-minimized source grain.
The reporting view matches a credit only when tenant, studio, class start time,
and normalized painting identify exactly one completed class. Ambiguous and
unmatched credits never alter sales totals. Matched applied credits augment
`class_sales` and `net_sales` in `pts_class_sales_reporting`, and flow into
`pts_daily_operations_reporting` without changing seats or capacity.

The Daily Operating Detail grid keeps the audit trail visible for every matched
class: **PTS class sales** shows the original PTS amount, **ClassPop** shows the
matched applied credit, and **Combined class sales** adds the two. Studio and
page totals use the same three measures, while net sales includes the combined
class revenue plus the class's products and fees.

## Deployment state

Collector, schema migration, Settings toggle, dashboard reporting, and a
workflow 23 were deployed August 10, 2026. Gilbert is the only enabled studio,
and workflow 23 is published for 8:30 AM America/New_York. The first controlled
run loaded 21 rows, matched 18, excluded 3 unmatched rows, and applied $542.08
to 6 completed classes. The remaining studios stay off until separately
approved and validated.
