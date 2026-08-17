# Studio Intelligence Warehouse Schema

**Version:** 4.3
**Last updated:** August 9, 2026

## Purpose

This document inventories warehouse objects confirmed by current project documentation. The live Supabase schema is authoritative. Do not infer a table exists merely because it appears in a roadmap or archived document.

## Status Labels

- **Current:** documented as part of the active warehouse.
- **Planned:** design intent; not safe for implementation dependencies.
- **Needs verification:** conflicting documentation exists; inspect Supabase and workflows before use.

## Configuration Tables

| Object | Purpose | Status |
| --- | --- | --- |
| `organizations` | Top-level tenant/business organization | Current |
| `brands` | Brand within an organization | Current |
| `studios` | Individual location | Current |
| `studio_integrations` | Configuration and external-account mapping per studio | Current |
| `integration_runs` | Privacy-safe integration execution/audit records; PTS runs support organization, opaque account, report/range, attempt, row-count, unique execution-reference, and sanitized-error metadata through service-role-only RPCs | Current; PTS audit migrations `20260809180000` and `20260809190000` deployed August 9, 2026 |
| `pts_third_party_class_credits` | Privacy-minimized PTS third-party booking credits keyed by studio, order, and external booking; customer names are excluded | Deployed August 10, 2026 through migration `20260810120000` |
| `pts_third_party_class_credits_reporting` | Exact-match status between third-party credits and completed PTS classes | Deployed August 10, 2026 |
| `pts_integration_accounts` | PTS account metadata and encrypted-secret references; never credential values | Current |
| `pts_collection_targets` | Service-only PTS account-to-studio collection configuration | Deployed and validated in production August 9, 2026 |
| `mntn_integration_accounts` | Tenant-scoped MNTN account metadata and Supabase Vault secret references; never API-key values | Deployed August 10, 2026 through migration `20260810190000` |
| `mntn_collection_targets` | Service-only MNTN account-to-advertiser/studio collection routing without secrets | Deployed August 10, 2026 through migration `20260810190000` |
| `user_profiles` | Auth-user profile, terms acceptance, and onboarding completion | Current; migration `20260805110000` deployed August 5, 2026 |
| `legal_documents` | Versioned Terms and Privacy metadata with exact content hashes | Deployed August 11, 2026 through migration `20260811220000` |
| `legal_acceptances` | Append-only per-user acceptance evidence for exact Terms and Privacy versions | Deployed August 11, 2026 through migration `20260811220000` |
| `organization_memberships` | Invite-only user role and status by organization | Current; migration `20260805110000` deployed August 5, 2026 |
| `user_studio_access` | Explicit manager/viewer studio grants | Current; migration `20260805110000` deployed August 5, 2026 |
| `integration_secret_references` | Non-secret integration metadata and external encrypted-secret references | Current; migration `20260805110000` deployed August 5, 2026 |

Expected hierarchy:

```text
organizations 1→many brands 1→many studios
studios 1→many studio_integrations
```

Confirm exact columns, constraints, and foreign-key behavior in Supabase before migrations or code changes.

## PTS Sales Facts

| Object | Grain/purpose | Status |
| --- | --- | --- |
| `pts_sales_daily_summary` | One PTS sales summary per studio/report date | Current |
| `pts_class_sales_daily` | One latest-observed PTS class event per studio/source event key | Current and loading daily |
| `pts_non_class_sales_items` | One minimized Product Sales line item per studio/report date/source row hash | Current and loading daily |
| `pts_class_type_mappings` | Organization-governed raw PTS Type to reporting class-type mapping | Current |
| `pts_product_reporting_mappings` | Organization-governed category/subcategory/item to product group and department mapping | Current |
| `pts_class_type_sales_daily` | One aggregate per studio/event date/raw PTS class type from a range export | Current; replacement range-load destination |
| `pts_product_sales_daily` | One aggregate per studio/sale date/category/subcategory/item from Product Sales | Current; replacement range-load destination |
| `pts_reservation_bookings` | One privacy-safe PTS Reservations grid line per studio, order date, and source row key | Current and loading daily |
| `pts_order_attributes` | One privacy-minimized PTS order with five-digit billing ZIP, booked sales, and item-level discount totals | Migration `20260817160000` implemented; deployment and ETL cutover pending |
| `textellent_accounts` | One reusable encrypted-secret reference, sender number, and usage description per Textellent API account | Deployed August 7, 2026; description migration `20260807200000` deployed |
| `textellent_studio_assignments` | One studio-to-Textellent-account assignment; supports shared accounts | Deployed August 7, 2026 |
| `low_reservation_class_alert_settings` | One privacy-safe automation rule per studio | Deployed August 7, 2026 |
| `low_reservation_class_alert_deliveries` | One phone-free claim/send audit per studio and PTS class | Deployed August 7, 2026 |

PTS imports preserve source row hashes for idempotency. Product Sales records
retain category, subcategory, item, quantity, revenue, tax, and business
transaction information but exclude customer names. The July 28, 2026
four-studio validation loaded 47 unique item rows and retained those row IDs on
a repeated import.
All PTS tables are service-role-only until authenticated tenant RLS policies and
dashboard access are implemented.

## PTS Reporting Views

| Object | Grain/purpose | Status |
| --- | --- | --- |
| `pts_class_sales_reporting` | One class event with raw and governed reporting class types | Current |
| `pts_product_sales_reporting` | One product item with governed product group and department | Current |
| `pts_daily_operations_reporting` | One studio/report date combining summary totals with separately aggregated class and product facts | Current |
| `pts_class_type_sales_daily_reporting` | Daily class-type aggregates with governed reporting types | Current |
| `pts_product_sales_daily_reporting` | Daily product/item aggregates with governed product groups and departments | Current |
| `pts_operations_daily` | One studio/date derived from class revenue, fees, and authoritative Product Sales detail | Current replacement reporting view |
| `pts_upcoming_class_snapshots` | One future class event per studio, snapshot date, and stable source event key; preserves nullable calendar `display_name` separately from painting | Current and loading daily |
| `pts_upcoming_class_snapshots_reporting` | Snapshot history with governed class types and consecutive-day seats/revenue pickup | Deployed |
| `homebase_integration_accounts` | One tenant-scoped, Vault-backed read-only Homebase API key per SASHA studio | Active development |
| `homebase_labor_daily` | One privacy-minimized scheduled/actual labor summary per studio and date | Active development |
| `homebase_shift_labor` | One privacy-minimized scheduled/actual labor record per studio and Homebase shift | Active development |
| `pts_upcoming_classes_current` | Latest complete future-class snapshot per studio | Deployed |
| `pts_reservation_bookings_reporting` | Reservation booking lines joined to studio names | Current |
| `pts_reservation_booking_daily` | Exact daily gross booked seats and booked sales with active, refunded, and held seat counts | Current |
| `pts_order_geography_daily` | Order count, booked sales, average order value, and discount use by studio/date/ZIP | Migration `20260817160000` implemented; deployment and ETL cutover pending |
| `low_reservation_class_alert_targets` | Service-only joined PTS/Textellent routing and studio rule configuration | Deployed August 7, 2026 |

The reporting views do not join event and product rows directly. Each source is
aggregated at its own grain before daily metrics are combined, preventing
duplicated class revenue, seats, or attendance.

The replacement range model deliberately excludes the Class Sales Summary
`Products` amount from total-sales arithmetic because the same merchandise is
represented authoritatively in Product Sales. `pts_operations_daily` calculates
total sales as class sales plus class fees plus Product Sales net sales.

## Marketing Fact Tables

| Object | Expected grain/purpose | Status |
| --- | --- | --- |
| `ga4_daily_metrics` | GA4 metrics by studio/date and documented analytics dimensions | Current |
| `marketing_attribution_daily` | GA4 metrics by studio/date/session source/session medium | Current |
| `ga4_north_america_daily_metrics` | North America-filtered GA4 summary by studio/date | Deployed August 17, 2026; ETL pending |
| `ga4_north_america_breakdown_daily` | North America-filtered country, city, technology, and source/medium facts kept as explicit breakdown grains | Deployed August 17, 2026; ETL pending |
| `ga4_north_america_content_daily` | North America-filtered page-path performance by studio/date | Deployed August 17, 2026; ETL pending |
| `ga4_north_america_event_daily` | North America-filtered event performance by studio/date | Deployed August 17, 2026; ETL pending |
| `eulerity_daily_metrics` | Eulerity performance metrics at the documented daily grain | Current |
| `eulerity_daily_spend` | Eulerity spend by studio/date and applicable campaign dimensions | Current |
| `eulerity_daily_budget_allocation` | Daily allocated budget by studio/date | Current |
| `marketing_strategy_changes` | Tenant-scoped, dated Eulerity strategy annotations with optional studio scope, category, author, and notes | Deployed August 16, 2026 through migration `20260816120000` |
| `meta_ads_daily` | Meta campaign insights by account/campaign/date with studio mapping | Current |
| `meta_page_insights_daily` | Facebook Page insights by page/date/period with studio mapping | Current |
| `meta_integration_accounts` | Tenant-scoped Meta owner OAuth connections with Vault secret references and token-health timestamps | Migration prepared; not deployed |
| `meta_source_assets` | Meta portfolios, ad accounts, Pages, and Instagram professional accounts discovered per connection | Migration prepared; not deployed |
| `mntn_daily_metrics` | MNTN delivery and modeled/last-touch attribution by studio, advertiser, and date | Current |
| `weather_daily` | Historical/contextual weather by location/date | Needs verification |

Current Meta Ads metrics documented by the project include spend, impressions, reach, clicks, CTR, CPC, CPM, campaign ID/name, and date. Current Meta Page insight ingestion includes Page media views and period dimensions. Validate the actual column names before writing queries.

## Reporting Views

`ga4_source_medium_performance` is current and provides governed source/medium
classification over `marketing_attribution_daily`. Studio 1 was validated
against GA4 daily totals on July 28, 2026. The
`marketing_reporting_sources` directory adds global, organization, brand, and
studio-scoped dashboard classifications without removing raw attribution facts.
It features paid, direct, Google Organic, social, and approved tourism traffic;
groups incidental referrals; and keeps unknown traffic available for governance.

`mntn_performance_daily` is current and provides MNTN delivery, modeled
view-through attribution, last-touch attribution, CPM, cost per verified visit,
and cost per conversion. Its natural fact key is
`(studio_id, advertiser_id, report_date)`. Tenant ownership is assigned from
the active `studio_integrations` MNTN advertiser mapping before every insert or
advertiser change.

Unified marketing and executive reporting views are active development priorities. Candidate names documented elsewhere include:

- `vw_marketing_daily`
- `vw_marketing_weekly`
- `vw_marketing_monthly`
- `vw_campaign_performance`

These names are **planned until verified in Supabase**. Do not claim they are implemented based on this document.

## Planned Domains

The following are logical plans, not confirmed tables:

### Marketing and Creative

Campaign/ad dimensions, organic social facts, Google Business Profile, reviews, creative assets, creative performance, and marketing attribution.

### Operations

Reservations, classes/events, attendance, capacity, staffing, labor, schedules, inventory, products, and studio hours.

### Financial

Sales, payments, expenses, payroll, budgets, forecasts, and profitability.

### Customer

Customers, visits, retention, lifetime value, loyalty, segmentation, communication engagement, and attribution.

## Required Documentation Per Object

Before production use, every table/view should document:

- Purpose and owner
- Row grain
- Primary key or natural key
- Organization/brand/studio relationship
- External source identifiers
- Source and normalized timestamps/timezone
- Required fields and null behavior
- UPSERT/duplicate behavior
- Backfill and retention policy
- Relevant indexes and constraints
- Upstream workflow and downstream consumers

## Naming Guidance

- Fact tables describe source/domain and grain.
- Reporting views use stable business terms and follow the live prefix convention.
- Internal IDs and external IDs must be distinguishable.
- Avoid renaming production objects solely for stylistic consistency.

## Change Procedure

Schema changes require explicit approval and a migration plan. For every change:

1. Inspect the live Supabase definition.
2. Identify producers and consumers.
3. Plan forward migration and rollback/recovery.
4. Preserve historical data.
5. Update n8n workflows and service queries atomically where possible.
6. Verify idempotency and tenant isolation.
7. Update this file, `data_model.md`, `current_status.md`, and the changelog.

Never include connection strings, keys, tokens, or credential values in this document.

## Reciprocal Benchmarks

`benchmark_participation_settings` stores organization-level consent and
defaults every organization to opted out. `benchmark_participation_audit`
records consent changes. Neither table is available to anonymous or ordinary
authenticated clients; application service code must also enforce that only an
organization owner or administrator can change participation.

`get_paid_cpc_benchmark` is the first protected aggregate. It returns a median
and mean only when the requesting studio's organization participates and the
eligible cohort contains at least 10 studios across at least 3 organizations.
It never returns another studio's value. Additional metrics should follow the
same reciprocal-access and minimum-cohort rules.
