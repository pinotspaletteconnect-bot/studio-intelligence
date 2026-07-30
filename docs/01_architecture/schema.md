# Studio Intelligence Warehouse Schema

**Version:** 4.1  
**Last updated:** July 23, 2026

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
| `integration_runs` | Integration execution/audit records | Current |
| `pts_integration_accounts` | PTS account metadata and encrypted-secret references; never credential values | Current |

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
| `pts_class_sales_daily` | One latest-observed PTS class event per studio/source event key | Current; event-grain migration pending production validation |
| `pts_non_class_sales_items` | One minimized Product Sales line item per studio/report date/source row hash | Current and loading daily |

PTS imports preserve source row hashes for idempotency. Product Sales records
retain category, subcategory, item, quantity, revenue, tax, and business
transaction information but exclude customer names. The July 28, 2026
four-studio validation loaded 47 unique item rows and retained those row IDs on
a repeated import.
All PTS tables are service-role-only until authenticated tenant RLS policies and
dashboard access are implemented.

## Marketing Fact Tables

| Object | Expected grain/purpose | Status |
| --- | --- | --- |
| `ga4_daily_metrics` | GA4 metrics by studio/date and documented analytics dimensions | Current |
| `marketing_attribution_daily` | GA4 metrics by studio/date/session source/session medium | Current |
| `eulerity_daily_metrics` | Eulerity performance metrics at the documented daily grain | Current |
| `eulerity_daily_spend` | Eulerity spend by studio/date and applicable campaign dimensions | Current |
| `eulerity_daily_budget_allocation` | Daily allocated budget by studio/date | Current |
| `meta_ads_daily` | Meta campaign insights by account/campaign/date with studio mapping | Current |
| `meta_page_insights_daily` | Facebook Page insights by page/date/period with studio mapping | Current |
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
