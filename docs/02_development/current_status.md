# Studio Intelligence Current Status

**Version:** 4.1  
**Last updated:** July 31, 2026

## Purpose

This is the fast-changing source of truth for what is implemented, deployed, actively being built, and planned next. Durable vision belongs in `project_blueprint.md`; architectural rules belong in `docs/01_architecture/architecture.md`.

## Overall Status

The foundational collection platform and the first dashboard architecture are implemented. Development has shifted from infrastructure-first work toward reporting views, interactive dashboards, comparative analytics, and AI-ready business intelligence.

```text
External source
  → Playwright or API collector
  → Express endpoint
  → n8n ETL/orchestration
  → Supabase warehouse
  → SQL reporting views
  → Next.js services and API routes
  → dashboards, automation, and AI
```

The collection, ETL, warehouse, and frontend layers are considered stable patterns. New work should extend those patterns rather than introduce parallel architectures.

## Platform Components

| Area | Technology | Current role | Status |
| --- | --- | --- | --- |
| Collection service | Node.js, Express, Playwright | API and browser-based source collection | Production foundation |
| Deployment | Railway, Docker | Hosts the `playwright/` collector | Production |
| Orchestration/ETL | n8n | Scheduling, validation, transformation, retries, auditing, warehouse loading | Production |
| Warehouse | Supabase PostgreSQL | Configuration, history, facts, reporting views | Production |
| Dashboard | Next.js 16, React 19, TypeScript | Business intelligence UI | Active development |
| Source control | GitHub | Code, documentation, review workflow | Production |

## Production Integrations

| Integration | Collection path | Warehouse state | Status |
| --- | --- | --- | --- |
| Google Analytics 4 | API/n8n | `ga4_daily_metrics` | Production |
| Eulerity | Playwright/Express/n8n | `eulerity_daily_metrics`, `eulerity_daily_spend`, `eulerity_daily_budget_allocation` | Production |
| Meta Business Ads | Meta Graph API/Express/n8n | `meta_ads_daily` | Production |
| Meta Page Insights | Meta Graph API/Express/n8n | `meta_page_insights_daily` | Production |

Meta Ads and Page Insights share the authentication and Graph API foundation in `playwright/services/meta/`. Studio and account assignment remains configuration-driven through `studio_integrations`; source account IDs must not be hardcoded.

## Planned or Incomplete Integrations

| Integration | Status |
| --- | --- |
| Weather reporting | Planned/warehouse work requires verification before being called production |
| Google Business Profile | Planned |
| Reservation/POS systems | Planned |
| QuickBooks or other financial systems | Planned |
| Google Ads and Microsoft Ads | Planned |
| Organic social content/creative ingestion beyond current Page Insights | Planned |
| MNTN Connected TV | Active for Gilbert, Louisville/St. Matthews, and Short North; published n8n workflow refreshes the prior 35 days daily at 5:15 AM |

The unpublished workflow `15 - PTS Multi-Account Shadow Dispatcher`
(`m9v7NXpkX9SDulqa`) is the validated Phase 2 foundation for configuration-driven
PTS collection. Its August 9, 2026 manual test read four active
`pts_collection_targets` rows and emitted one account job. It has no schedule,
does not call PTS, does not retrieve secrets, and does not write warehouse data.
Production workflows 05, 06, 07, 12, and 13 remain unchanged.

## Warehouse

### Configuration

- `organizations`
- `brands`
- `studios`
- `studio_integrations`
- `integration_runs`

### Current marketing facts

- `ga4_daily_metrics`
- `marketing_attribution_daily` (production source/medium facts; controlled 30-day validation completed for all four active GA4 studios July 28, 2026)
- `ga4_source_medium_performance` (production classified source/medium reporting view)
- `marketing_reporting_sources` (production directory for scalable global, organization, brand, and studio source presentation)
- `eulerity_daily_metrics`
- `eulerity_daily_spend`
- `eulerity_daily_budget_allocation`
- `meta_ads_daily`
- `meta_page_insights_daily`
- `mntn_daily_metrics` and `mntn_performance_daily` (MNTN modeled and last-touch Connected TV attribution; rolling 35-day refresh contract)

The live Supabase schema is authoritative. Update `docs/01_architecture/schema.md` whenever tables or views change.

### Current PTS facts

- `pts_sales_daily_summary` — one summary row per studio and report date
- `pts_non_class_sales_items` — one product line per studio, report date, and
  source row hash; customer names are excluded
- `pts_class_sales_daily` — one latest-observed class event per studio and
  stable source event key; the published daily workflow refreshes the prior 14
  completed event days at 5:00 AM America/New_York
- `pts_class_type_mappings` and `pts_product_reporting_mappings` — governed
  organization-level mappings for operations reporting groups
- `pts_class_type_sales_daily` and `pts_product_sales_daily` — replacement
  range-load facts grouped by embedded event/sale date; deployed schema is
  ready for controlled Short North validation
- `pts_class_sales_reporting`, `pts_product_sales_reporting`, and
  `pts_daily_operations_reporting` — service-role reporting views that preserve
  source grains while exposing class, product, and daily operations metrics
- `pts_class_type_sales_daily_reporting`,
  `pts_product_sales_daily_reporting`, and `pts_operations_daily` — replacement
  reporting layer that avoids double-counting Product Sales amounts
- `pts_reservation_bookings`, `pts_reservation_bookings_reporting`, and
  `pts_reservation_booking_daily` — privacy-safe reservation order facts and
  exact daily gross booked-seat/booked-sales reporting

## Dashboard State

Implemented foundation:

- Next.js App Router application in `dashboard/`
- Owner/administrator Settings includes a unified Integration Setup area for
  PTS, Textellent, GA4, Meta Business, Eulerity, and MNTN. Each guide explains
  what information is needed and where to find it. PTS and Textellent retain
  their Vault-backed forms; other sources remain labeled as assisted setup
  until tenant-safe self-service secret handoffs are implemented.
- Shared application context for active studio and common dashboard state
- Invite-only Supabase Auth foundation with SSR cookie sessions, login,
  password recovery, protected routes, onboarding, logout, owner/admin user
  invitations, recovery-aware setup-link resends for incomplete invited users,
  login-route forwarding for Supabase invite/recovery credentials so email
  links always continue to first-password setup,
  owner-protected per-user role and studio-access management,
  reversible membership suspension, a server-enforced 30-minute inactivity
  timeout with a five-minute warning, a 12-hour absolute session limit, and
  security headers. Owners and administrators also have a persistent Workspace
  Setup checklist that derives studio, PTS mapping, user, and five-feed data
  readiness from live configuration and warehouse records. Every dashboard API now authenticates the
  caller, rejects unauthorized studio IDs, and scopes portfolio queries to the
  user's assigned studios. Migration `20260805110000` is deployed and provides
  profiles, organization memberships, studio grants, and non-secret integration
  references. The protected dashboard is deployed as an isolated Railway
  service at `https://proud-manifestation-production-3f2d.up.railway.app` from
  branch `codex/auth-onboarding`; first-owner bootstrap remains pending.
- Studio list API: `/api/studios`
- Marketing summary API: `/api/marketing/summary`
- Supabase access isolated behind frontend services
- Reusable dashboard toolbar, studio selector, and metric cards
- Marketing Performance overview with paid CPC, attribution-ready revenue/ROAS cards, separate Meta Ads and Eulerity spend trends, paid-platform share, supported-funnel stages, and Meta organic coverage
- GA4 source/medium performance table with curated paid, direct, Google Organic,
  social, and tourism reporting; Facebook Organic and Instagram Organic remain
  separate, incidental referrals roll up, and raw attribution is preserved
- Working 7-, 30-, and 90-day marketing filters
- Permanent drill-down routes for GA4, Meta Ads, Meta Organic, and Eulerity
- MNTN Connected TV dashboard card with delivery, modeled attribution,
  studio-level modeled ROAS, last-touch attribution, CPM, cost per verified
  visit, and cost per conversion
- Operations Performance dashboard backed by PTS Daily Sales and Product Sales,
  with completed-day sales, F&B sales/share, revenue per seat, F&B per seat,
  seats sold, class sales, daily trends, studio-level total sales, seats sold,
  and F&B share on the portfolio KPI cards, and expandable F&B
  subcategory/item detail
- Operations date controls include completed-day rolling ranges, month to date,
  the last complete month, and calendar weeks aligned Monday through Sunday.
  KPI cards show absolute and percentage change against either the immediately
  preceding equal-length period, the same weekdays 364 days earlier, or an
  explicitly selected custom comparison range.
- A dedicated Operations Year-over-Year Period Comparison page defaults to the
  most recently completed Mondayâ€“Sunday week and supports month, rolling, and
  custom date ranges. Matching compact horizontal tables separate operating
  performance from detailed product sales and group both by studio; each
  cell emphasizes the current-year value, shows the same period for the prior
  two years, and displays the current-versus-prior-year delta. Weekly periods
  remain weekday-aligned, while other ranges retain matching calendar dates.
- Operations summary combines the preserved range-load history with the
  reporting views fed by workflows 05–07. Current production rows take
  precedence by studio/date on overlap. Product queries explicitly paginate
  Supabase results so F&B, candle, food, and art-supply history is not truncated
  at the API's 1,000-row response limit.
- Operations class-type metrics merge event-level production rows from
  `pts_class_sales_reporting` with aggregate Class Sales backfill rows from
  `pts_class_type_sales_daily_reporting`, preferring production by studio/date
  on overlap so historical Regular, Little Brushes, and other governed types
  remain complete without duplication.
- Current Operations totals and Daily Operating Detail use the class-reported
  seats and sales columns from `pts_daily_operations_reporting`, keeping KPI
  totals consistent with the class-level rows displayed in the drill-down.
- Recurring PTS completed-class and product collectors now select studios
  through the underlying Kendo location widget, avoiding animated dropdown
  interception. Workflow 07 was rerun successfully for July 21-August 3 and
  replaced 160 class rows; the Gilbert Moondancing row was verified at 6 seats,
  $238.68 class sales, $33.04 product sales, and $271.72 net sales. Workflow 07
  retains its 8:00 AM run and now reconciles again at 10:30 AM Eastern;
  workflow 06 retains its 8:00 AM run and also reconciles at 10:30 AM Eastern.
- F&B KPI totals use item-level Product Sales when that studio/date detail is
  available, falling back to the daily summary only when detail has not been
  loaded. This keeps the KPI and F&B breakdown on the same source.
- Daily Operating Detail drill-down for a selected studio and date, with an
  event-level class grid covering painting, time, governed and source class
  type, room, attendance, capacity, lead time, and sales. Portfolio selection
  presents every studio in a separate section for the chosen date.
- Private Party and Mobile Events KPI cards link to completed-day drill-downs
  with expandable studio sections and event-level seats, capacity, and revenue.
- PTS classes whose painting name begins with `Available for` are governed as
  marketing availability placeholders. They are excluded from upcoming-class,
  Executive, Daily Operating Detail, Private Party, and Mobile Event metrics
  and drill-downs. Completed private/mobile event rows are also omitted when
  they have no selected painting and both seats and class-plus-fee revenue are
  zero. A selected painting establishes a real event even when its current
  seats and revenue are zero; aggregate-only history is preserved when the
  painting selection is unavailable.
- Operations product reporting excludes zero-dollar items labeled as preorders
  from displayed quantities because PTS uses them as website placeholders;
  paid preorder sales remain included.
- Upcoming Classes dashboard, service, API, and warehouse schema are
  implemented, and migration `20260731160000` is deployed to Supabase. The page
  is designed for a daily 90-day future Class
  Sales snapshot and exposes current capacity/revenue plus consecutive-day net
  seats and revenue pickup. Published workflow `12 - PTS Upcoming Class
  Snapshots` runs daily at 5:30 AM America/New_York and replaces the current
  snapshot by studio. Its July 31, 2026 validation loaded 700 future classes:
  146 St. Matthews, 233 Short North, 215 Gilbert, and 106 Jeffersonville.
  Consecutive snapshots remain available as class-level net pickup. Exact gross
  yesterday booked seats and sales now come from the PTS Reservations grid via
  published workflow `13 - PTS Reservation Bookings Import`, scheduled daily at
  6:00 AM America/New_York. Its August 1 production validation loaded all four
  studios: 111 ordered seats, 107 active seats, 2 refunded seats, 2 held seats,
  and $4,166.20 gross booked sales.
- Executive headline KPIs include exact prior-day gross booked seats and sales
  from `pts_reservation_booking_daily`; the wide-screen KPI grid uses five
  columns. The Textellent Automation page now has a migration-ready,
  disabled-by-default implementation for per-studio low-reservation class
  alerts, shared account routing, encrypted API auth codes, custom messages,
  transient PTS Seating Chart phone access, and phone-free send auditing. The
  database migration and dashboard page are deployed. Vault-backed PTS and
  Textellent credentials, the current PTS CalendarView and Seating Chart parser,
  a six-class preview simulation, and a controlled one-time Textellent send are
  validated. The disabled workflow artifact `14 - Textellent Low Reservation
  Class Alerts` implements configuration discovery, local-date preview, database
  claims, execution, and phone-free completion auditing. Collector deployment
  and a scheduled single-studio validation remain pending. Seating Charts remains
  a planned workspace.
- Headline marketing spend and attributed ROAS use the same Meta-plus-Eulerity
  scope. MNTN spend and modeled attribution remain separate because MNTN uses a
  different view-through attribution model and is not connected by most users.

Known incomplete surfaces:

- Production authentication activation has the canonical Site URL, Railway
  `APP_URL`, and publishable-key configuration in place. It remains pending
  redirect allow-list and email-template configuration, custom SMTP and abuse
  controls, first-owner bootstrap,
  and cross-tenant security testing. Supabase Vault-backed PTS credential entry,
  password reauthentication, a dedicated collector broker, and configuration-
  driven account/studio targets are implemented locally. Production remains
  disabled until migration `20260805190000`, broker variables, deployment, and
  a controlled new-account login/report validation are complete.

- An owner-only Settings form for adding a studio through an existing
  organization PTS account is implemented locally. It stores only studio
  metadata and the non-secret PTS location ID, validates tenant ownership of
  the selected brand and credential reference, and creates the PTS mapping.
  The live `studios.id` column was verified as an existing `GENERATED ALWAYS`
  identity backed by `studios_id_seq`; existing IDs 1-4 remain unchanged and
  the next studio will receive ID 5. Production deployment remains pending.

- Manual Product Sales history can now be loaded through workflow
  `10 - PTS Product Sales Backfill` by selecting a studio and uploading the PTS
  Product Sales workbook. The Operations dashboard links to the authenticated
  workflow editor. A July 30 sample parsed 186 detail rows after excluding its
  totals row, representing 232 units and $1,825.07 in net sales; it was not
  warehouse-loaded because the source studio was not confirmed.

- Manual Class Sales history can now be loaded through workflow
  `11 - PTS Class Sales Backfill` by selecting a studio and uploading the PTS
  Excel workbook. It uses the existing `pts_class_type_sales_daily` natural
  keys and dashboard reporting path. The workflow remains unpublished so its
  upload form is available only during an authenticated test execution. The
  Operations dashboard provides a stable link to the authenticated workflow
  editor instead of linking to the expiring test-form URL. An
  August 3 sample workbook parsed 402 rows spanning January 1 through July 1;
  it was not warehouse-loaded because the source studio was not confirmed.

- PTS Daily Sales, Product Sales, and Class Sales collection are deployed to
  Railway. Daily
  Sales summary upserts are validated for all four studios for July 28, 2026.
  The published `06 - PTS Product Sales Import` workflow collected and upserted
  47 product lines for the same date across all four studios. A same-date rerun
  retained 47 unique IDs while refreshing update timestamps. Product Sales runs
  daily at 2:00 AM using the previous completed America/New_York business date.
  The published `07 - PTS Class Sales Import` workflow collected, validated,
  and upserted 158 unique class events across all four studios for July 16–29,
  2026. It refreshes the prior 14 completed event days daily at 5:00 AM.
  Broader controlled historical backfill remains incomplete.
- Workflow 06 stopped after the range-enabled Product Sales collector response
  omitted the legacy `reportDate` field required by its validation node. The
  collector response now restores `reportDate` while retaining `fromDate` and
  `toDate`; deployment and a controlled workflow rerun remain pending.
- Workflow 06 also exposed a PTS Run-navigation race that could click Excel on
  the pre-run grid and wait five minutes for a download that would never fire.
  The collector now waits for completed navigation and Kendo loading, retries
  export through the grid API, and reports the failing studio code. A subsequent
  empty-import defect showed that hidden stale grids could still win report
  selection and that PTS initializes the product grid only after its Product
  Sales Details tab is activated. Product Sales now explicitly opens that tab,
  requires a visible completed grid, prefers a populated candidate, logs its
  grid counts, and fails instead of silently succeeding when a populated grid
  produces an empty workbook parse. The August 4 controlled rerun for report
  date August 3 completed after deployment settled, parsed 24 product rows, and
  successfully upserted all 24 rows through workflow 06.
- The range-export replacement remains implemented in Supabase for controlled
  reconciliation, but its daily production loading is not active. Do not point
  dashboards back to it until an all-studio daily load and reconciliation are
  validated.
- Reciprocal benchmark storage and CPC display behavior are prepared, but the
  owner-facing participation control must remain unavailable until login and
  organization-role authorization are implemented.
- Several domain pages are placeholders
- Marketing source drill-down charts and tables are incomplete
- GA4 source/medium mapping coverage requires ongoing curation; unmapped traffic remains explicitly labeled
- Comparison-period behavior needs end-to-end completion
- The legacy `marketing_daily_summary` view is driven by GA4 dates. The Marketing Performance service now builds a complete source-date timeline from GA4, Meta Ads, Eulerity, and Meta Page Insights so source-only dates are retained; this should eventually move into a unified reporting view.
- Executive, financial, customer, and settings experiences are not production
  complete. Operations now includes summary and class-level daily reporting,
  but comparisons and broader operational sources remain incomplete.
- AI insight cards are planned

Do not infer feature completeness from the presence of an empty route file.

## Current Development Priorities

1. Complete unified marketing reporting views and confirm metric definitions.
2. Complete GA4, Meta Ads, Meta Organic, and Eulerity drill-down reporting.
3. Build the executive dashboard on validated reporting views.
4. Add studio comparison and ranking experiences.
5. Establish repeatable dashboard verification and end-to-end testing.
6. Prepare AI-ready reporting views and insight contracts after metrics are trusted.
7. Begin financial, operations, and customer dashboards only when their source data is available.

## Sign-In and Onboarding Checkpoint

When authentication and new-customer onboarding are implemented, circle back to
the reciprocal benchmark feature before either workflow is considered complete:

1. Add an organization-level benchmark participation choice to onboarding.
2. Require an organization owner or administrator to make or change the choice.
3. Default participation to off and present clear, versioned consent language.
4. Connect the choice to `benchmark_participation_settings` through an
   authenticated server route; never expose service-role credentials to the
   browser.
5. Allow withdrawal from Settings and preserve the consent audit history.
6. Verify that opted-out organizations neither contribute to nor receive
   collective benchmarks.
7. Test the 10-studio/3-organization suppression rule and cross-tenant isolation.

## Deployment Notes

Railway deploys the collector from `playwright/`:

- Railway root directory: `playwright`
- Dockerfile: `playwright/Dockerfile`
- Entry point: `node server.js`
- Production configuration comes from Railway environment variables
- Local `.env` files must remain uncommitted and excluded from images

Changing this deployment shape requires an explicit migration plan.

## Known Repository Hygiene Work

- A root `node_modules/` directory is currently tracked in Git. It should be removed in a separate, reviewed cleanup and protected by a root `.gitignore`.
- Historical documents live under `docs/archive/` and must not be treated as current guidance.
- Versioned and duplicate root documentation should be consolidated gradually around the canonical files named in `AGENTS.md`.
- Generated `.next/` files, including validators and route types, must never be edited or committed.

## Definition of Done for a New Integration

An integration is not production until all applicable stages are complete and validated:

1. Secure authentication
2. Repeatable source collection
3. Structured response contract
4. Express route or direct API workflow
5. n8n validation/transformation/retry handling
6. Configuration-driven studio mapping
7. Supabase storage and idempotent loading
8. Reporting view or documented consumer contract
9. Production deployment and operational validation
10. Updated status, integration, schema, and changelog documentation

## Next Handoff

The next session should begin by reading `AGENTS.md`, this file, and the relevant architecture document. Confirm the active Git branch and inspect recent commits before selecting work. The preferred next product task is completing the marketing reporting experience rather than adding another infrastructure pattern.

## PTS Multi-Account Migration Checkpoint

Phase 3 completed on August 9, 2026. Workflows 12B, 13B, 06B, 07B, and 05B
exist in n8n as unpublished multi-account shadows. Each accepts one validated
account job from workflow 15, passes `accountId` to the collector, retains the
configured studio targets, has its inherited schedule disabled, and has its
final warehouse writer disabled. Production workflows 05, 06, 07, 12, and 13
remain unchanged.

Do not execute or publish the shadows until Phase 4 begins with current workflow
exports and a point-in-time warehouse baseline. Phase 4 owns collector parity
tests, per-account audit persistence, retry behavior, and controlled cutover.

Phase 4 began August 9, 2026. Production workflow exports and warehouse counts
were captured, and unpublished workflow 16 was created as a manual single-
account parity runner. After approval, matching protected broker tokens were
verified on the dashboard and collector, the missing broker URL was added to
the collector, and Railway redeployed successfully. PTS credentials remain in
Supabase Vault; n8n receives only account IDs and studio mappings.

With every shadow writer disabled, 05B Daily Sales, 06B Product Sales, and 07B
Class Sales passed sequential parity collection. 13B Reservations also passed
with four transformed items. 12B Upcoming Classes exposed a bounded-workload
issue: its 90-day, four-studio request exceeded the Railway/PTS service window.
It was revised to emit one work item per configured studio and process one HTTP
request per batch with a two-second interval. The write-disabled rerun preserved
the full 90-day horizon, returned all four studio results, and completed in 2m
48s.

The dispatcher and five shadow definitions are now published in n8n for durable
versioning. Their inherited schedules and warehouse writers remain deactivated,
so production workflows and warehouse loading are still unchanged. Phase 5 is
the controlled reliability and cutover phase.
