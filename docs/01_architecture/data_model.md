# Studio Intelligence Data Model

**Version:** 4.1  
**Last updated:** July 23, 2026

## Purpose

This document defines the logical warehouse model, data ownership, grain conventions, and growth direction. `schema.md` catalogs implemented tables and views; the live Supabase schema is authoritative.

## Warehouse Philosophy

Supabase PostgreSQL is the permanent source of truth for configuration, historical facts, and reporting. External platforms are sources, not reporting databases.

```text
Configuration
  → dimensions and source facts
  → reporting views
  → services and API contracts
  → dashboards, automation, and AI
```

## Core Business Hierarchy

```text
organization → brand → studio → business facts
```

Every location-level fact should resolve to a studio. External IDs are mapped through configuration rather than embedded in application code.

## Configuration Model

Current configuration entities:

- `organizations`
- `brands`
- `studios`
- `studio_integrations`
- `integration_runs`

Expected future configuration may include credential references, feature flags, schedules, permissions, and notification rules. Secret values should remain in the appropriate secret manager/environment rather than ordinary warehouse tables or Git.

## Marketing Intelligence

### Current source facts

- GA4: `ga4_daily_metrics`
- Eulerity performance: `eulerity_daily_metrics`
- Eulerity spend: `eulerity_daily_spend`
- Eulerity budget allocation: `eulerity_daily_budget_allocation`
- Meta advertising: `meta_ads_daily`
- Meta Page insights: `meta_page_insights_daily`

These sources should converge through business-oriented reporting views instead of forcing consumers to join source tables independently.

### Planned marketing domains

- Campaign/ad/ad-set dimensions
- Organic posts, Reels, Stories, and engagement
- Google Business Profile and review facts
- Creative assets and cross-platform creative performance
- Attribution and conversion models
- Context such as weather, holidays, school calendars, and local events

Weather-related tables appear in older documentation, but production status requires verification.

## Operations Intelligence

Current PTS source facts:

- `pts_sales_daily_summary`: one row per studio and report date; natural key
  `(studio_id, report_date)`
- `pts_non_class_sales_items`: one product transaction line per studio, report
  date, and source row hash; natural key
  `(studio_id, report_date, source_row_hash)`
- `pts_class_sales_daily`: one latest-observed PTS class event per studio and
  stable source event key. The event date comes from the class time rather than
  the collector's report window. Source type, room, capacity, attendance, and
  class/product/fee sales remain available for operational reporting.

Product item facts retain category, subcategory, item name, quantity, sales,
tax, and source transaction context while deliberately excluding customer
names. Planned extensions include reservations, staffing, labor, inventory,
products, and studio hours.

PTS operations reporting preserves these source grains and applies governed
organization-level mappings downstream:

- `pts_class_type_mappings` maps raw PTS Type values into Regular, Little
  Brushes, Paint it Forward, Private Party, Mobile Events, and No Class
  reporting groups. Holiday remains preserved as the source value and reports
  as Regular.
- `pts_product_reporting_mappings` maps source category, subcategory, or item
  values into product groups and the Food & Beverage or Other Products
  departments.
- `pts_class_sales_reporting` and `pts_product_sales_reporting` expose mapped
  detail without replacing source values.
- `pts_daily_operations_reporting` aggregates each fact source independently
  before combining studio/date metrics, avoiding duplicated event or product
  amounts.

## Financial Intelligence

Planned facts and dimensions include sales, payments, expenses, payroll, budgets, forecasts, and profitability.

## Customer Intelligence

Planned facts and dimensions include customers, visits, segments, retention, lifetime value, loyalty, communication engagement, and attribution.

## Creative Intelligence

Creative assets are business entities independent of an advertising platform. Planned entities include creative assets, campaigns, tags, themes, paintings/events, placements, and performance facts. A reusable asset should be measurable across channels.

## Reporting Views

Reporting views form the trusted business layer. Planned/current work includes:

- Daily, weekly, and monthly marketing views
- Campaign performance
- Studio comparison/rankings
- Executive summaries
- Operations, financial, and customer summaries as their facts become available
- AI-specific context views only after underlying metrics are validated

Consumers should query reporting views or service-layer models whenever practical.

## Grain and Keys

Every fact table and view must document:

- Business grain (for example, one row per studio/date/campaign)
- Natural or source key
- Tenant relationship
- Source timezone and normalized reporting date
- Idempotent UPSERT key
- Backfill behavior
- Retention/history policy

Do not combine incompatible grains in one fact table.

## Naming Standards

- Configuration/dimensions: clear plural business nouns (`studios`, `creative_assets`).
- Facts: source or domain plus grain (`ga4_daily_metrics`, `meta_ads_daily`).
- Reporting views: business-oriented names, preferably with a `vw_` prefix if that is the adopted live convention.
- IDs: distinguish internal warehouse IDs from external source IDs.

Follow the live schema’s existing convention consistently; do not rename production objects solely for style.

## Historical Strategy

Preserve history whenever practical. UPSERT only when the documented business key already exists. Corrections should be auditable, and backfills must not duplicate facts.

## Layer Ownership

| Layer | Ownership |
| --- | --- |
| Collection | Retrieve source records and return structured contracts |
| n8n ETL | Validate, map, normalize, retry, audit, and load |
| Warehouse | Preserve facts, configuration, relationships, and integrity |
| Reporting | Define reusable trusted business metrics |
| Services/API | Expose typed application contracts |
| Dashboard | Present and interact with business-ready data |
| AI | Explain, forecast, and recommend from documented context |

## Updating This Model

Update this document when a new domain or logical relationship is introduced. Update `schema.md` whenever a concrete table/view is added, removed, or changes grain.
