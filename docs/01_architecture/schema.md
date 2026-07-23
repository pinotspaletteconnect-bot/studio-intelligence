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

Expected hierarchy:

```text
organizations 1→many brands 1→many studios
studios 1→many studio_integrations
```

Confirm exact columns, constraints, and foreign-key behavior in Supabase before migrations or code changes.

## Marketing Fact Tables

| Object | Expected grain/purpose | Status |
| --- | --- | --- |
| `ga4_daily_metrics` | GA4 metrics by studio/date and documented analytics dimensions | Current |
| `eulerity_daily_metrics` | Eulerity performance metrics at the documented daily grain | Current |
| `eulerity_daily_spend` | Eulerity spend by studio/date and applicable campaign dimensions | Current |
| `eulerity_daily_budget_allocation` | Daily allocated budget by studio/date | Current |
| `meta_ads_daily` | Meta campaign insights by account/campaign/date with studio mapping | Current |
| `meta_page_insights_daily` | Facebook Page insights by page/date/period with studio mapping | Current |
| `weather_daily` | Historical/contextual weather by location/date | Needs verification |

Current Meta Ads metrics documented by the project include spend, impressions, reach, clicks, CTR, CPC, CPM, campaign ID/name, and date. Current Meta Page insight ingestion includes Page media views and period dimensions. Validate the actual column names before writing queries.

## Reporting Views

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