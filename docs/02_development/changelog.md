# Studio Intelligence Changelog

All notable changes to Studio Intelligence will be documented in this file.

This project follows a milestone-based changelog rather than tracking every individual commit.

---

# Unreleased

## Added

- Converted workflow `10 - PTS Product Sales Backfill` to the same private
  studio-and-Excel upload pattern as Class Sales. The authenticated parser
  removes customer names and retains the existing historical product table,
  natural keys, mappings, and dashboard reporting path. Added an Operations
  dashboard shortcut to the workflow.

- Converted workflow `11 - PTS Class Sales Backfill` from a long-running PTS
  browser request to a manual Excel upload form. The authenticated collector
  now parses operator-downloaded Class Sales workbooks with the production
  parser, and the workflow keeps the established tenant mapping, aggregation,
  natural keys, Supabase table, and dashboard reporting path. Added a stable
  Operations-dashboard link to the authenticated workflow editor.

- Added the authenticated PTS Reservations-grid collector and published daily
  workflow `13 - PTS Reservation Bookings Import` at 6:00 AM
  America/New_York. The privacy-safe warehouse fact excludes purchaser names
  and atomically replaces each studio/order-date slice.
- Replaced the Upcoming Classes dashboard's unreliable snapshot-difference
  yesterday KPI cards with exact gross booked seats and booked sales from the
  Reservations grid. The first production load reconciled all four studios for
  August 1 at 111 ordered seats, 107 active seats, 2 refunded seats, 2 held
  seats, and $4,166.20 gross booked sales.

- Added the PTS Upcoming Classes foundation: daily event-grain snapshot schema,
  governed current and pickup reporting views, a dedicated dashboard with
  studio sections, and a documented 90-day replacement workflow contract.
  Published daily n8n workflow `12 - PTS Upcoming Class Snapshots` at 5:30 AM
  America/New_York after validating 700 future classes across all four studios
  (including 215 Gilbert classes). Collector calls are split by studio to stay
  within the Railway gateway timeout.

- Added a Daily Operating Detail drill-down from the Operations dashboard for
  a selected studio and date, with class-event attendance, capacity, lead time,
  source and governed class type, room, painting, and sales detail. Dates are
  direct links, and the all-studios view separates each studio into its own
  daily detail section. The daily summary includes seats-weighted average lead
  time across reported classes, authoritative F&B revenue, and revenue per
  seat. The percent-full KPI is labeled Capacity.
- Added seats-weighted average class lead time to the main Operations KPI cards
  for the selected studio and completed-day range.
- Added Private parties and Mobile events KPI cards with event counts, average
  seats, and average class-plus-fee revenue per event.
- Added a main Operations candle-sales KPI with net sales and quantity sourced
  from the governed Candles product reporting group. The card opens a dedicated
  studio-separated detail page with candle items, dates, quantities, and sales.
- Standardized product KPI currency to two decimal places so the main-page
  candle total displays identically to its drill-down total.
- Changed the Candle KPI to query the governed Candles group directly instead
  of filtering a broad mixed-product response that could reach the warehouse
  row limit before every studio was represented.
- Changed Food, Art Supplies, and F&B detail to use server-filtered governed
  product queries as well, removing the same mixed-product row-limit risk from
  the remaining product KPIs and breakdown.
- Added a main Operations Art Supplies KPI with net sales and quantity sourced
  from the governed Art Supplies product reporting group. The card opens a
  collapsible, studio-separated item detail page matching Candle reporting.
- Added a separate Food sales KPI with net sales and quantity while retaining
  the broader Food & Beverage total. The Food card links directly to the
  expanded item-level Food detail used by the metric.

- Added the PTS range-load replacement model:
  `pts_class_type_sales_daily`, `pts_product_sales_daily`, and their governed
  reporting views. `pts_operations_daily` calculates sales from class revenue,
  fees, and authoritative Product Sales detail without double-counting the
  Class Sales Summary product column.

- Completed the production PTS Class Sales pipeline. The collector now reads
  the populated Kendo grid directly because PTS's Excel button exports stale
  zero-row data after automated report refreshes. The published daily workflow
  validated and upserted 158 class events across all four studios for July
  16–29, 2026 and refreshes the prior 14 completed event days at 5:00 AM.
- Added governed class-type and product reporting mappings plus service-role
  class, product, and daily operations reporting views. Raw PTS values remain
  intact while Holiday reports as Regular, class aliases roll into the approved
  groups, and products roll into Food & Beverage or Other Products.
- Added a PTS Class Sales Summary collector with rolling date-range support,
  seven-day source-window chunking, stable event identity, studio-local time
  conversion, totals-row exclusion, and an event-grain migration for
  `pts_class_sales_daily`.
- Added the PTS Sales Report foundation: secure Railway credential boundary,
  four verified PTS location mappings, a multi-studio Playwright collector,
  separate class/non-class Excel parsers, data-minimized sales facts, and
  service-role-only Supabase storage.
- Deployed and validated the authenticated PTS collector through n8n for all
  four configured studios, including resilient report readiness checks and
  explicit handling for hidden zero-row detail exports.
- Added n8n validation, configuration-driven studio ownership lookup, and
  idempotent Supabase upserts for PTS Daily Sales. Validated four July 28, 2026
  summary rows and confirmed a same-date rerun reused the same row IDs; detail
  upserts remain awaiting a report date that returns detail rows.
- Added the PTS Product Sales collector and published daily n8n workflow. The
  July 28, 2026 four-studio validation loaded 47 customer-free product lines
  into `pts_non_class_sales_items`; a repeated run preserved all 47 row IDs.
  Category totals reconcile to the Daily Sales alcohol and other-product totals.
- Added the first PTS-backed Operations dashboard with completed-day sales,
  F&B dollars and sales share, revenue and F&B per seat, seats sold, class
  sales, average daily sales, daily trends, and expandable F&B subcategory and
  item-name reporting.
- Separated the Operations completed-day sales trend into a labeled series for
  each studio when viewing the combined portfolio.
- Documented scalable PTS onboarding through encrypted credential references,
  owner-controlled location mapping, shared credential-grouped collection, and
  resumable historical backfills.
- Added the privacy-safe reciprocal benchmark foundation: organization-level
  opt-in (default off), immutable consent audit entries, service-role-only
  access, and minimum cohort suppression at 10 studios across 3 organizations.
- Added the first collective metric, paid CPC median/mean, and a conditional
  Paid CPC comparison that is shown only to participating organizations when
  the protected cohort threshold is met.
- Marketing Performance overview modeled on the approved dashboard direction.
- Separate Meta Ads and Eulerity spend reporting.
- GA4, Meta Ads, Meta Organic, and Eulerity drill-down routes.
- Working 7-, 30-, and 90-day marketing filters.
- Meta organic reporting-coverage indicator that is independent of paid-ad spend.
- Paid CPC cards and platform CPC calculations sourced from paid-platform spend and clicks.
- Attribution-ready revenue and ROAS cards that remain unavailable until validated GA4 source/medium facts exist.
- GA4 source/medium performance table with sessions, new users, key events, revenue, and governed channel classification.
- Deployed the additive `ga4_source_medium_performance` reporting view and Eulerity paid-source classification.
- Published the corrected GA4 source/medium workflow with tenant ownership derived from studio configuration, normalized dates, and idempotent upserts.
- Prepared the scalable marketing source directory migration with global,
  organization, brand, and studio precedence; separate Facebook and Instagram
  organic reporting; automatic paid/social coverage; tourism curation; and
  grouped incidental referrals.
- Made the GA4 source/medium dashboard table sortable by source,
  classification, sessions, new users, key events, and revenue, defaulting to
  sessions from highest to lowest.
- Changed dashboard presets to completed-day ranges ending yesterday, added the
  applied start/end dates to the toolbar, and added a validated custom range
  with an explicit Apply action.
- Backfilled GA4 source/medium attribution for Short North, Gilbert, and
  Jeffersonville for June 28 through July 27, 2026. Each studio now has all 30
  dates with no duplicate studio/date/source/medium records.
- Removed 72 malformed January 7 attribution rows created by the superseded
  date parser after confirming the replacement historical data.
- Restored and published the normal seven-day, all-studio GA4 source/medium
  production workflow after the controlled backfill.
- Added attributed revenue to each paid platform performance row so the GA4
  revenue used in the displayed ROAS calculation is visible beside spend.
- Replaced the Conversion Path progress bars with a tapered, stage-by-stage
  funnel that shows totals and conversion from each prior stage.
- Added a Top Meta Campaigns table using campaign spend, impressions, reach,
  clicks, CTR, CPC, and CPM while deliberately excluding unsupported
  campaign-level sessions, reservations, revenue, and ROAS.
- Expanded the Meta delivery table for design review with the account,
  campaign, ad-set, and ad names plus their permanent Meta IDs.
- Simplified the Meta card to account and campaign identity, and added an
  all-campaign total row with CTR, CPC, and CPM recalculated from aggregate
  spend, click, and impression totals.
- Added an Eulerity channel performance card for Social, Search, Display,
  Video, and Other with allocated spend, spend share, impressions, clicks,
  recalculated CTR, recalculated CPC, and a selected-period total.
- Validated 131 unique Studio 1 attribution rows across July 21–28 against GA4 daily sessions, key events, and revenue, then restored the all-studio schedule.

- Added the MNTN Connected TV warehouse integration with non-secret
  advertiser-to-studio mappings for Gilbert, Louisville/St. Matthews, and Short
  North; tenant ownership is enforced from `studio_integrations`.
- Added a MNTN dashboard card separating modeled view-through attribution from
  last-touch attribution and showing spend, delivery, visits, conversions,
  order value, ROAS, CPM, and acquisition costs.
- Defined a rolling 35-day MNTN refresh so the daily UPSERT replaces attribution
  facts that can mature during MNTN's 30-day measurement window.
- Published the MNTN n8n workflow on a daily 5:15 AM schedule and loaded 35
  days for each of the three configured advertisers. A repeated run retained
  105 unique advertiser-date rows, confirming duplicate-safe updates.
- Included MNTN in marketing spend totals, daily platform spend, the platform
  mix chart, and platform performance. MNTN reporting is omitted when the
  selected studio and period have no MNTN data; CPC remains limited to
  click-based platforms while MNTN reports CPM and modeled ROAS.

## Fixed

- Stabilized recurring PTS studio selection by setting the Kendo location
  widget directly, with a forced UI fallback, so animated dropdown options
  cannot intercept or lose Class and Product collector location changes.
- Validated the completed-class overwrite path by rerunning workflow 07 for
  July 21-August 3: 160 rows loaded and Gilbert's Moondancing event reconciled
  to 6 seats and $271.72 net sales. Added a 10:30 AM Eastern reconciliation to
  workflows 06 and 07 while preserving their existing morning schedules.

- Prevented recurring PTS Product Sales imports from treating hidden stale PTS
  grids as legitimate empty reports; the collector activates the lazily loaded
  Product Sales Details tab, and populated visible grids require a successfully
  parsed Excel workbook with per-studio grid diagnostics.
- Deployed and validated the Product Sales detail-tab fix: workflow 06 parsed
  and upserted 24 rows for the August 3, 2026 report date after Railway finished
  replacing the collector instance.

- Fixed a Product Sales collector race where workflow 06 could export the
  report's pre-run grid after giving up on PTS navigation after 10 seconds. The
  collector now waits for completed navigation and Kendo data loading, retries
  Excel export through the grid API, and identifies the failing studio.

## Changed

- Restored complete historical Operations product reporting by merging
  `pts_product_sales_daily_reporting` with the current
  `pts_product_sales_reporting` feed, preferring current rows by studio/date.
  Product retrieval now uses explicit 1,000-row pagination so F&B and other
  product KPIs are not silently truncated as the selected period grows.
- Applied the same paginated historical/current merge to the shared Candle and
  Art Supplies drill-down service so drill-down totals reconcile to their KPI
  cards for the selected studio and period.
- Restored historical daily sales alongside the current production feed by
  merging `pts_operations_daily` and `pts_daily_operations_reporting` without
  double-counting overlapping studio/date rows.
- Reconnected Operations summary, class-type metrics, and product drill-downs
  to the reporting views refreshed by production workflows 05–07. The dormant
  range-load tables remain available for reconciliation but no longer freeze
  the live dashboard at July 28.
- Restored the legacy `reportDate` field in Product Sales collector responses
  so production workflow 06 remains compatible with the newer range-enabled
  `fromDate` and `toDate` contract.
- Corrected a PTS Class Sales collector race that treated Kendo
  `dataSource.read()` as a completed promise. The collector now waits for the
  grid's actual change/error event before reading refreshed class rows.
  Production deployment and two-day pickup validation remain pending.
- Excluded zero-dollar Product Sales rows labeled as preorders from Operations
  quantities and product detail while retaining any paid preorder sales.
- Extended the PTS Product Sales collector to accept `fromDate` and `toDate`
  while preserving the existing single-day `reportDate` request contract.
- Updated the Operations service and dashboard to consume the replacement
  reporting model and show class-type sales detail.

- Marketing KPIs now expose CPC immediately while withholding revenue attribution and ROAS until the existing GA4 source/medium workflow is populated and validated.
- Marketing API input is validated and API failures return stable user-facing errors.
- Marketing daily trends are assembled from each production source independently, preventing Eulerity-, Meta Ads-, or organic-only dates from being dropped by the GA4-driven legacy summary view.

---

# Version 3.0

**Release Date:** July 9, 2026

## Overview

Version 3.0 marks the transition of Studio Intelligence from an infrastructure project into a business intelligence platform.

The foundational architecture is complete, the first production data pipeline is operational, and future development is focused on expanding business intelligence domains rather than building core infrastructure.

---

## Added

### Documentation

* Complete documentation redesign
* README.md
* PROJECT_BLUEPRINT.md
* ARCHITECTURE.md
* DATA_MODEL.md
* DEVELOPER_GUIDE.md
* CURRENT_STATUS.md
* ROADMAP.md
* INTEGRATIONS.md
* AI_GUIDE.md

### Architecture

* Intelligence Domain architecture
* Marketing Intelligence domain
* Operations Intelligence domain
* Financial Intelligence domain
* Customer Intelligence domain
* Executive Intelligence domain

### Creative Intelligence

Introduced Creative Intelligence as a first-class subsystem within Marketing Intelligence.

Creative assets are now considered reusable business entities rather than platform-specific content.

---

## Completed

### Platform Foundation

* GitHub repository
* Docker deployment
* Railway deployment
* Express API
* Playwright framework
* n8n orchestration
* Supabase warehouse

### Production Integrations

#### Google Analytics 4

* Warehouse integration
* Daily metrics
* Multi-studio support

#### Eulerity

Completed end-to-end production pipeline.

Capabilities include:

* Authentication
* Session persistence
* Multi-studio processing
* Metrics collection
* Spend collection
* Budget allocation
* Warehouse ingestion
* Spend allocation calculations
* Production ETL

---

## Changed

### Documentation Philosophy

Documentation now separates:

* Vision
* Architecture
* Data Model
* Development Standards
* Integrations
* Current Status

rather than combining them into a few large documents.

### Roadmap

The roadmap is now organized around business capabilities rather than individual integrations.

### Integration Strategy

Integrations are treated as data collection mechanisms that support business intelligence domains.

---

## Current Priorities

* Marketing Reporting Views
* Meta Business Integration
* Creative Intelligence
* Google Business Profile
* Weather Integration

---

## Technical Debt

Remaining work includes:

* Historical import framework
* Integration auditing enhancements
* Expanded reporting views
* Additional warehouse dimensions

No major architectural refactoring is currently planned.

---

# Version 2.x

## Highlights

* Initial warehouse architecture
* Initial documentation
* Railway deployment
* Playwright browser automation
* n8n orchestration
* Eulerity browser automation
* Initial Supabase warehouse

---

# Version 1.x

## Highlights

Project inception.

Established the initial concept of a warehouse-first business intelligence platform for multi-location experiential businesses.

Initial technology decisions included:

* Supabase
* Playwright
* n8n
* Railway
* GitHub

These architectural decisions remain the foundation of Studio Intelligence today.

---

# Future Releases

Future versions will continue documenting significant milestones rather than individual commits.

Examples include:

* Major integrations
* Architectural changes
* Intelligence domains
* Reporting capabilities
* AI features
* Business automation capabilities

The changelog should remain concise and focused on meaningful platform evolution.
