# Studio Intelligence Integrations

**Version:** 4.1  
**Last updated:** July 23, 2026

## Purpose

This document catalogs external systems and their verified implementation state. Integrations are organized by business capability, not by vendor. The live code, deployed workflows, and warehouse schema take precedence over stale status labels.

## Standard Lifecycle

```text
Authenticate
  → collect source data
  → return a structured contract
  → validate and transform in n8n
  → map studios through configuration
  → load Supabase idempotently
  → expose reporting views/services
  → consume in dashboards, automation, or AI
```

No integration should bypass this lifecycle without an explicit architectural decision.

## Status Definitions

- **Production:** deployed and validated through warehouse loading.
- **Active development:** implementation exists but the end-to-end path is incomplete.
- **Planned:** design intent only; do not depend on it.
- **Needs verification:** documentation or code suggests implementation, but current production evidence is insufficient.

## Marketing Intelligence

### Google Analytics 4

- **Capability:** web traffic, audience analytics, and session source/medium attribution
- **Collection:** API/n8n
- **Warehouse:** `ga4_daily_metrics`; `marketing_attribution_daily` is provisioned for source/medium facts
- **Status:** Production. Daily aggregate metrics and source/medium ingestion are published; Studio 1 was validated on July 28, 2026, and the all-studio schedule is active.

### Eulerity

- **Capability:** paid advertising metrics, spend, and budget allocation
- **Collection:** Playwright automation through the Express collector
- **ETL:** n8n
- **Warehouse:**
  - `eulerity_daily_metrics`
  - `eulerity_daily_spend`
  - `eulerity_daily_budget_allocation`
- **Status:** Production

### Meta Business Ads

- **Capability:** campaign-level advertising performance
- **Collection:** Meta Graph API through shared Meta services and Express routes
- **ETL:** n8n
- **Warehouse:** `meta_ads_daily`
- **Current metrics:** campaign/date, spend, impressions, reach, clicks, CTR, CPC, and CPM
- **Configuration:** ad account mapping through `studio_integrations`
- **Status:** Production

### Meta Page Insights

- **Capability:** Facebook Page discovery and organic Page insight metrics
- **Collection:** Meta Graph API through shared Meta services and Express routes
- **ETL:** n8n
- **Warehouse:** `meta_page_insights_daily`
- **Current verified metric:** Page media views, with day/week/rolling-period dimensions
- **Configuration:** Page mapping and friendly names through `studio_integrations` using the Meta Page integration type
- **Status:** Production

Meta Ads and Meta Page Insights share authentication, token validation, business discovery, account discovery, and Page discovery code under `playwright/services/meta/`.

### MNTN Connected TV

- **Capability:** connected-TV delivery, household reach, verified visits,
  modeled conversions/order value/ROAS, and last-touch attribution
- **Collection:** MNTN Reporting API through n8n HTTP Request nodes
- **ETL:** n8n normalization and rolling 35-day idempotent UPSERT
- **Warehouse:** `mntn_daily_metrics`
- **Reporting:** `mntn_performance_daily`
- **Configuration:** advertiser-to-studio mapping through
  `studio_integrations` with `integration_type = 'mntn'`
- **Credential boundary:** one encrypted n8n Query Auth credential per
  advertiser; API keys are not stored in Supabase or Git
- **Status:** Active. API authentication, three advertiser mappings, warehouse
  objects, dashboard reporting, and the published daily 5:15 AM rolling
  35-day production load are implemented.

#### Scalable MNTN onboarding target

The current three advertiser-specific n8n request nodes are the production
pilot, not the long-term onboarding model. Scale-out should use one shared
workflow:

1. An active `studio_integrations` row determines whether a studio uses MNTN
   and stores its non-secret advertiser ID and refresh configuration.
2. The advertiser API key is stored in an encrypted server-side secret store,
   referenced by the integration row but never returned to the browser or
   written to workflow execution data.
3. The scheduled n8n workflow reads active MNTN integrations and sends each
   integration ID to an internal ingestion endpoint.
4. The ingestion endpoint resolves the secret, requests the rolling 35-day
   MNTN report, normalizes it, and performs the tenant-enforced idempotent
   UPSERT.
5. Disabling or removing the integration stops future collection without
   deleting historical reporting facts.

This design keeps onboarding data-driven and avoids adding a credentialed HTTP
node to the workflow for every new studio.

### Organic Social and Creative Intelligence

Planned scope includes Instagram Business, posts, Reels, Stories, engagement, followers, reusable creative assets, and cross-platform creative performance. Current Meta Page Insights should not be described as a complete organic-social or creative-intelligence implementation.

- **Status:** Planned beyond current Page Insights

### Google Ads and Microsoft Ads

- **Status:** Planned

### Google Business Profile / Local Presence

Planned scope includes profile insights, reviews, search visibility, and customer actions.

- **Status:** Planned

### Contextual Data

| Integration | Status | Notes |
| --- | --- | --- |
| Weather | Needs verification | Some documents describe it as ready or production while current status marks it planned. Verify workflow and warehouse evidence before promoting the status. |
| Holidays | Planned | Context for demand and forecasting |
| School calendars | Planned | Local demand context |
| Community events | Planned | Local demand context |

## Operations Intelligence

### Pinot's Technical System (PTS)

- **Capability:** studio sales, class sales, non-class product sales, attendance,
  capacity, and lead-time reporting
- **Collection:** Playwright automation against
  `admin.pinotspalette.com`; PTS does not provide an API
- **Pilot credentials:** `PTS_USERNAME` and `PTS_PASSWORD` in protected Railway
  variables; credentials are never stored in Git or ordinary Supabase tables
- **Collector authorization:** `POST /pts/sales-report`,
  `POST /pts/product-sales-report`, and `POST /pts/class-sales-report` require
  a bearer token matching the protected
  `COLLECTOR_API_TOKEN` Railway variable; n8n stores the same value in an
  encrypted header-auth credential
- **Configuration:** one `studio_integrations` row per authorized PTS location,
  with `integration_type = 'pts'` and the PTS location ID in `external_id`
- **Warehouse:** `pts_sales_daily_summary`, `pts_class_sales_daily`, and
  `pts_non_class_sales_items`
- **Class-event grain:** the Class Sales Summary export is collected in
  seven-day source windows and the daily workflow refreshes the prior 14
  completed event days. Rows use a stable event key and preserve the source
  `Type` for later reporting groups.
- **Privacy:** customer names in the Sales Report workbook are discarded by the
  collector because product and revenue reporting does not require them
- **Status:** Active development. Daily Sales summaries and Product Sales item
  details are validated through warehouse loading for all four studios on July
  28, 2026. The Product Sales workflow upserted 47 rows into
  `pts_non_class_sales_items`; a same-date rerun retained the same 47 IDs.
  Product Sales is published on a daily 2:00 AM schedule using the previous
  completed America/New_York date. Class-detail loading and controlled
  historical backfills remain incomplete.

#### Scalable PTS onboarding

1. An organization owner authorizes PTS during onboarding and supplies
   credentials through an authenticated secret-entry flow.
2. The username/password are written to an approved encrypted secret manager.
   Supabase stores only the provider and opaque secret reference in
   `pts_integration_accounts`.
3. A server-side validation job logs in, discovers only the PTS locations that
   account can access, and presents those locations for mapping.
4. The owner maps each PTS location to an existing studio or creates the studio.
   The system writes an active `studio_integrations` row containing the
   non-secret location ID and enabled report list.
5. A shared scheduled workflow queries active PTS integrations, groups them by
   credential reference so each account logs in once, and collects each mapped
   studio.
6. Daily imports request one completed date. Historical imports are queued in
   small resumable batches, with idempotent UPSERT keys and run auditing.
7. Disabling PTS stops future imports without deleting historical facts.

The current Railway environment variables are the production pilot, not the
long-term credential store. The onboarding UI must not be enabled until login,
owner/admin authorization, secret storage, and tenant-isolation tests exist.

Other planned sources include reservations, scheduling, labor, staffing,
inventory, and broader studio operations. No operations integration should be
marked production until the full collection-to-warehouse path is validated.

## Financial Intelligence

Planned sources include QuickBooks Online, Xero, Stripe or payment systems, payroll, budgets, expenses, and forecasting.

## Customer Intelligence

Planned sources include reservation/customer systems, CRM, loyalty, email engagement, and marketing attribution.

## Integration Standards

Every integration must:

- Authenticate securely without committing secrets.
- Use direct APIs when reliable APIs exist; use Playwright when browser automation is necessary.
- Return a stable, structured source contract.
- Keep business normalization and warehouse writes in n8n/ETL.
- Map organizations, studios, and external accounts through configuration rather than code.
- Preserve historical data and use idempotent loading.
- Record observable failures and integration runs.
- Document table grain, natural keys, scheduling, and retry behavior.
- Provide a reporting or consumer contract before dashboard use.
- Update this catalog, `current_status.md`, schema documentation, and the changelog when status changes.

## Credential Boundaries

- Railway environment variables are the production configuration source for the collector.
- Supabase keys, Meta tokens, Eulerity credentials, session state, and n8n credentials must never be stored in Git or documentation.
- Documentation may name required environment-variable keys, but must never include their values.

## Adding an Integration

Before implementation, document:

1. Business question and owner
2. Authentication method
3. Collection mechanism and endpoint contract
4. Expected source grain
5. n8n transformation and error strategy
6. Configuration mapping
7. Warehouse table, keys, and retention
8. Reporting view or service contract
9. Verification plan
10. Operational owner and status evidence
