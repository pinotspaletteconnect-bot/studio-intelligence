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

- **Capability:** web traffic and audience analytics
- **Collection:** API/n8n
- **Warehouse:** `ga4_daily_metrics`
- **Status:** Production

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

Planned sources include reservations, POS, scheduling, labor, staffing, inventory, and studio operations. No operations integration should be marked production until the full collection-to-warehouse path is validated.

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