# Studio Intelligence Changelog

## August 10, 2026

- Began the MNTN scalable credential migration without changing production.
  Added a tenant-scoped account model, Supabase Vault create/replace/read
  functions, an atomic advertiser-to-studio connection RPC, a service-only
  collection-target view and broker route, plus an owner-authorized Settings
  form with MNTN API-key discovery instructions. The existing three-advertiser
  n8n workflow remains the rollback path during the controlled migration.

- Deployed MNTN migration `20260810190000`, configured a separate shared broker
  token on the dashboard and collector services, and added an authenticated
  collector proxy for allowlisted MNTN API 3 report queries. The proxy resolves
  Vault credentials by opaque account ID and returns source data plus non-secret
  tenant/studio/advertiser context; n8n never receives the API key. All nine
  collector tests pass. Application deployment and shadow reconciliation remain
  pending.

- Corrected Workspace Setup credential readiness for the existing production
  account. A successful audited PTS collection after the most recent credential
  change now counts as credential validation; previously the page depended on a
  Vault timestamp that the broker path never wrote, causing working mappings to
  appear incomplete.

- Fixed the per-studio mapping gate to use the same computed credential
  validation result as the account card. The four existing mappings were
  present and correct but still referenced the legacy empty timestamp.

- Finished the Workspace Setup readiness experience. It now distinguishes
  controlled-workspace readiness from the public email launch gate, requires
  validated Vault credentials and account-backed studio mappings, reports
  active versus invited users, and reuses current Data Upload Status freshness
  for per-studio five-feed first-run verification instead of accepting any
  historical row as complete.

- Replaced production-blocked setup emails with owner-controlled temporary
  passwords for invited users. SASHA displays each generated password once,
  expires it after 24 hours, forces permanent-password creation at first login,
  and retains invited/RLS isolation until onboarding completes. Roles and
  selected studio permissions are assigned before credentials are handed off.

- Replaced new-user reliance on Supabase's built-in invitation redirect with a
  single recovery-style password setup email sent only after membership and
  studio grants are assigned. Added reset-page support for both implicit tokens
  and PKCE authorization codes so invitees always choose their own password.

- Implemented the approval-gated ClassPop foundation using PTS's Third Party
  Class Credits Report. Added a per-studio `Uses ClassPop` toggle, queued
  account-aware collector, privacy-minimized credit table, exact class matching,
  adjusted class/daily reporting, and inactive workflow artifact 23. Customer
  names are discarded and ambiguous credits cannot change dashboard totals.
  Deployed the migration, collector route, and dashboard columns and totals.
  Enabled Gilbert as the sole pilot, mapped the production collector and
  Supabase credentials, and published workflow 23 for 8:30 AM daily. The first
  controlled run loaded 21 rows, matched 18, excluded 3 unmatched rows, and
  applied $542.08 across 6 completed classes.

- Reconciled the first scheduled multi-account PTS production runs.
  Reservations and Upcoming Classes succeeded; Daily Sales failed on the PTS
  Run-button navigation wait, and simultaneous Product/Class Sales collectors
  received Railway 502 responses before warehouse writes.
- Prepared an approval-gated collector reliability patch. PTS Run clicks no
  longer implicitly wait for navigation, and all browser-based PTS routes now
  serialize work per opaque PTS account while allowing different accounts to
  run independently. Added passing queue tests for same-account ordering,
  cross-account independence, and failure recovery.
- Added an authenticated, tenant-scoped Data Upload Status page showing the
  latest warehouse business date, expected date, receipt time, row count, and
  represented studios for Daily Sales, Product Sales, Class Sales, Upcoming
  Classes, and Reservations. Added links from the main dashboard and Settings
  navigation. The production build and targeted lint pass, and the page is now
  deployed in SASHA.
- Deployed the account-scoped collector queue and non-blocking PTS Run-button
  handling. Controlled sequential recovery confirmed August 9 Daily Sales was
  current, loaded 80 Product Sales rows, and loaded 11 completed-class reporting
  rows (149 warehouse upsert responses). SASHA then reported all five feeds
  current with all four studios represented.

## August 9, 2026

- Corrected a replacement-workflow trigger defect discovered during manual
  preflight. Local schedule/manual starts in 05B, 06B, 07B, 13B, and 12B now
  call the multi-account dispatcher before their report-date and collection
  nodes. The original error failed before any PTS collection or warehouse
  write. All five corrected workflows were published and passed supervised
  live validation runs.
- Completed the approved same-day PTS multi-account production cutover for
  06B Product Sales, 07B Class Sales, 13B Reservations, and 12B Upcoming
  Classes after successful account-aware supervised warehouse writes.
- Disabled the corresponding legacy schedules without deleting or rewriting
  the legacy workflows, preserving an immediate rollback path.
- Published replacement schedules at the exact live times: Product Sales and
  Class Sales at 8:00 AM and 10:30 AM, Reservations at 6:00 AM, and Upcoming
  Classes at 7:30 AM. The first complete scheduled-run review is due August 10.
- Started Phase 6 operational validation with an ordered August 10 run-review
  gate, per-feed rollback criteria, automatic audit checks, downstream
  reconciliation, and a new-studio tenant-isolation test.
- Started Phase 4 PTS multi-account parity validation: captured current
  production workflow exports and warehouse counts, created unpublished manual
  runner 16, verified the protected broker-token configuration, added the
  collector's broker URL, and redeployed it. With warehouse writers disabled,
  Daily Sales, Product Sales, and Class Sales passed sequential collection.
  Upcoming Classes still requires bounded date slicing because its single
  90-day request exceeded the Railway/PTS service window. Reservations passed
  with four transformed items. The dispatcher and five shadow definitions were
  published for durable versioning while every shadow schedule and warehouse
  writer remained deactivated. Production workflows remain unchanged.
- Started Phase 5 reliability work by revising Upcoming Classes to preserve its
  90-day horizon while collecting one studio at a time with a two-second batch
  interval. The write-disabled validation returned all four studio results in
  2m 48s, and the validated definition was published with its schedule and
  warehouse writer still deactivated.
- Reconciled Upcoming Classes against the same-day legacy snapshot: all 669
  shadow event keys matched, with one legacy-only same-day class no longer
  returned six hours later. Deployed service-role-only PTS collection audit
  fields and validated start/finish RPCs without retaining test data.
- Added a unique PTS execution-reference constraint and a service-role-only
  completion RPC for shared audit handlers. Imported unpublished n8n drafts 17
  and 18 for validated start/completion calls and sanitized failure handling;
  neither draft is scheduled or attached to a collector.
- Published trigger-only audit workflows 17 and 18 without schedules or PTS
  credential access. Added unpublished workflows 19 and 20 to wrap and manually
  validate the write-disabled 05B shadow. The first audited run completed for
  all four studios and persisted a succeeded, privacy-safe execution record;
  production workflow 05 and all business-table writers remain unchanged.
- Completed the controlled 05B audit-failure gate. A post-start intentional
  validation failure was closed through the production sanitizer/RPC contract
  as `failed` with zero rows and category `validation`, without retaining raw
  error text or credentials. Added unpublished manual validation workflows 21
  and 22; production schedules and writers remain unchanged.
- Completed the supervised portion of the approved 05B cutover. Execution
  `103479` wrote four studios idempotently, preserved every August 8 warehouse
  count and total, and matched the Operations reporting view. Legacy workflow
  05 is retained with its 8:00 AM schedule disabled; 05B now owns the active
  8:00 AM schedule and writer. First scheduled-run observation is pending.
- Completed Phase 3 of the PTS multi-account migration with unpublished,
  write-disabled shadows for upcoming classes, reservations, product sales,
  class sales, and daily sales.
- Added the one-account job contract to each shadow collector request while
  leaving production schedules and warehouse writers unchanged.
- Documented the Phase 4 baseline and parity-test gate before any PTS shadow is
  executed or published.
- Added unpublished n8n workflow `15 - PTS Multi-Account Shadow Dispatcher`
  (`m9v7NXpkX9SDulqa`). It reads the service-only
  `pts_collection_targets` view, validates tenant/account/studio mappings, and
  emits one secret-free job per PTS account. A manual read-only validation
  grouped four active studio targets into one account job. No production PTS
  workflow, schedule, collector request, or warehouse write was changed.

All notable changes to Studio Intelligence will be documented in this file.

This project follows a milestone-based changelog rather than tracking every individual commit.

---

# Unreleased

- Restored Product Sales collection after multi-account studio validation began
  requiring a time zone by adding the four legacy pilot studios' canonical time
  zones to the Product Sales collector defaults and covering them with a
  regression test.
- Added a unified Settings integration-onboarding area with status-aware,
  step-by-step guidance for PTS, Textellent, GA4, Meta Business, Eulerity, and
  MNTN. Existing encrypted PTS and Textellent forms are embedded in their
  guides; sources without an approved secret handoff are marked assisted setup.
- Built disabled n8n workflow `14 - Textellent Low Reservation Class Alerts` with configuration-driven PTS account discovery, per-time-zone dates, preview-before-claim execution, duplicate prevention, privacy-safe completion auditing, and no automatic retries around ambiguous live sends. Hardened the collector to return per-class contact/send failures and to skip live sends with no valid recipients.
- Added a protected one-time Textellent test form to Automation. Test recipient numbers and messages are sent directly to Textellent and are never persisted or logged by SASHA.
- Added PTS credential management directly to Organization Settings, including encrypted initialization for legacy mapped accounts and protected credential replacement.
- Renamed the Textellent enrollment threshold from inclusive “maximum reservations” to exclusive “minimum reservations.” The default is 3, so classes with 1 or 2 reservations qualify while zero-reservation classes remain excluded.

## Added

- Moved Textellent API credential management from Automation to Organization Settings, added reusable “Used by” descriptions, and kept the automation page focused on selecting saved connections and editing studio alert rules.
- Built the disabled-by-default Textellent low-reservation class-alert foundation: reusable encrypted API accounts, studio assignments (including shared St. Matthews/Jeffersonville routing), editable messages and send rules, PTS Seating Chart contact retrieval, purchaser deduplication, database claims, and phone-free delivery audits. The PTS Vault prerequisite, Textellent schema, and SASHA dashboard were deployed August 7, 2026; collector deployment, n8n scheduling, and live-send validation remain pending.

- Displayed the exact selected and comparison date ranges together in shared comparison-enabled dashboard toolbars.

- Added the first Executive Performance dashboard, combining trusted Operations and Marketing service contracts into headline KPIs, comparison deltas, studio performance, revenue mix, and paid-platform summaries.
- Added an Executive this-week snapshot for completed sales, future booked revenue and seats, scheduled private/mobile events, and an eight-week completed-sales trend.
- Split the Executive weekly sales trend into color-coded stacked studio contributions with a studio legend.
- Added studio share percentages inside sufficiently large weekly sales chart segments while retaining exact dollar values in the tooltip.
- Added an on/off control for the studio percentage labels in the Executive weekly sales trend.
- Added an independent comparison range to the Executive this-week snapshot. Completed sales compare at the same elapsed day, while future revenue and scheduled parties use the matching historical booking snapshot and explicitly report when that snapshot is unavailable.
- Stopped the Food & Beverage drill-down from opening Food by default and excluded `Available for...` marketing placeholder classes from completed, upcoming, Executive, Private Party, and Mobile Event reporting.
- Excluded completed private/mobile rows only when they have no selected painting and both zero seats and zero class-plus-fee revenue; zero-dollar events with a selected painting remain visible as real events.
- Renamed the user-facing application to SASHA across the authenticated shell, authentication states, security prompts, and browser metadata; reordered primary navigation to Dashboard, Executive, Operations, Marketing, and Settings.
- Added Executive cards for yesterday's exact booked seats and gross booked sales, expanded the KPI grid to five columns, and added planned Automation pages for Textellent and Seating Charts.
- Aligned the headline marketing spend KPI with attributed ROAS by limiting both to Meta and Eulerity; MNTN spend and modeled attribution remain separate in the MNTN reporting section.
- Fixed resent invited-user setup links so the recovery session belongs to the recipient's browser and opens password creation instead of falling back to login.
- Simplified verified invited-user password setup to show only new-password and confirmation fields; current credentials remain available solely as an expired-session fallback.
- Added safe re-invitation for existing invited or suspended organization members, restoring selected permissions and sending a fresh setup link without duplicating the Auth identity.
- Routed brand-new Supabase invitations through the same allowlisted, recipient-side password setup page used by recovery links instead of the server-only callback.

- Replaced the nested template UI on `/dashboard` with a shell-consistent
  reporting-area landing page. Financial and Customers remain available as
  routes but are hidden from sidebar navigation until those reporting domains
  are ready.

- Corrected historical Operations class-type comparisons to consume the Class
  Sales backfill reporting view as well as the event-level production view.
  Production rows take precedence for overlapping studio/dates, preventing
  duplicates while restoring historical Regular, Little Brushes, and related
  governed class-type revenue.

- Added a dedicated Operations Year-over-Year Period Comparison page with a
  selected-period date control and matching studio-row tables for operating
  performance and detailed product sales. Every metric
  cell emphasizes the current year, shows the same period for the two prior
  years, and includes a current-versus-prior-year delta. Columns cover liquor,
  wine, beer, food, candles, art supplies, other Product Sales groups, governed
  class-type revenue, seats, capacity, per-seat performance, and lead time.

- Added MTD, last-month, and Monday–Sunday week presets plus KPI-card comparison
  deltas for Operations. Prior-year weekly comparisons shift by 364 days so
  weekdays remain aligned rather than matching calendar dates. A separate
  custom comparison range can also be selected explicitly.

- Added studio-level values beneath the portfolio Total Sales and Seats Sold
  KPI totals on the Operations Performance dashboard.

- Added studio-level modeled ROAS to the MNTN Connected TV dashboard, with each
  studio's attributed order value and spend shown beside the ratio.

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
  workflows 06 and 07 while preserving their existing 8:00 AM schedules.

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

- Corrected Operations and Daily Operating Detail totals to use class-reported
  seats, class sales, product sales, fees, and net sales. The dashboard had
  mixed Daily Sales summary totals with Class Sales drill-down rows, producing
  visible discrepancies such as St. Matthews on July 29.
- Reconciled the Operations F&B KPI to item-level Product Sales whenever detail
  exists for a studio/date. Daily summary F&B remains a fallback only for dates
  without detailed product rows.

## Changed

- Deployed the invite-only dashboard to a separate Railway service with an
  isolated `dashboard/` root, Supabase publishable/server credentials, and a
  canonical HTTPS `APP_URL`. Supabase Auth Site URL now matches the deployment;
  first-owner bootstrap and remaining Auth hardening are still pending.
- Added the invite-only authentication and onboarding foundation: Supabase SSR
  cookie sessions, login/recovery/logout, tenant memberships and studio grants,
  protected pages and APIs, role-gated invitations, default-off benchmark
  consent, security headers, and metadata-only integration secret references.
- Deployed migration `20260805110000_auth_tenant_foundation.sql` to production
  Supabase after reconciling the already-present reservations schema with its
  migration history. Existing reporting data was not changed; Auth application
  configuration remains pending controlled rollout.

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
