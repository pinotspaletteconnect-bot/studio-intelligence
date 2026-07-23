# Studio Intelligence Current Status

**Version:** 4.1  
**Last updated:** July 23, 2026

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

## Warehouse

### Configuration

- `organizations`
- `brands`
- `studios`
- `studio_integrations`
- `integration_runs`

### Current marketing facts

- `ga4_daily_metrics`
- `eulerity_daily_metrics`
- `eulerity_daily_spend`
- `eulerity_daily_budget_allocation`
- `meta_ads_daily`
- `meta_page_insights_daily`

The live Supabase schema is authoritative. Update `docs/01_architecture/schema.md` whenever tables or views change.

## Dashboard State

Implemented foundation:

- Next.js App Router application in `dashboard/`
- Shared application context for active studio and common dashboard state
- Studio list API: `/api/studios`
- Marketing summary API: `/api/marketing/summary`
- Supabase access isolated behind frontend services
- Reusable dashboard toolbar, studio selector, and metric cards
- Marketing KPI page foundation

Known incomplete surfaces:

- Several domain pages are placeholders
- Marketing trend visualization is incomplete
- Date-range and comparison behavior needs end-to-end completion
- Executive, financial, operations, customer, and settings experiences are not production complete
- AI insight cards are planned

Do not infer feature completeness from the presence of an empty route file.

## Current Development Priorities

1. Complete unified marketing reporting views and confirm metric definitions.
2. Finish marketing trend visualization, date filters, and comparison periods.
3. Build the executive dashboard on validated reporting views.
4. Add studio comparison and ranking experiences.
5. Establish repeatable dashboard verification and end-to-end testing.
6. Prepare AI-ready reporting views and insight contracts after metrics are trusted.
7. Begin financial, operations, and customer dashboards only when their source data is available.

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