# Studio Intelligence AI Guide

**Version:** 4.1  
**Last updated:** July 23, 2026

## Purpose

This guide explains how AI assistants should reason about Studio Intelligence. Repository-wide operating instructions live in the root `AGENTS.md`; read that file first.

## Required Context Order

For substantial work, consult:

1. `AGENTS.md`
2. `project_blueprint.md`
3. `docs/01_architecture/architecture.md`
4. `docs/02_development/current_status.md`
5. The domain-specific architecture or integration document
6. Relevant code and recent commits

When documentation conflicts, prefer verified code/deployment behavior, then correct the stale document.

## Mental Model

Studio Intelligence is a warehouse-first business intelligence platform—not a collection of unrelated integrations and not merely a dashboard.

```text
source
  → API/Playwright collection
  → Express contract
  → n8n validation and ETL
  → Supabase history and reporting views
  → Next.js services/API routes
  → dashboards, automation, and AI
```

AI should reason in business domains—marketing, operations, financial, customer, and executive intelligence—while respecting the technical layer boundaries.

## Verified Current State

Production marketing sources:

- Google Analytics 4
- Eulerity
- Meta Business Ads
- Meta Page Insights

Platform components:

- Railway-hosted Node.js/Express collector in `playwright/`
- n8n orchestration and ETL
- Supabase PostgreSQL configuration/warehouse/reporting
- Next.js 16/React 19 dashboard in `dashboard/`
- Shared dashboard context, API routes, service layer, and reusable dashboard components

Use `current_status.md` for active priorities and the integration catalog for exact status. Do not promote planned features to production based on aspirational documents.

## Reasoning Rules

### Respect layer ownership

- Collectors authenticate and collect.
- n8n validates, maps, transforms, retries, audits, and loads.
- Supabase preserves history and exposes trusted business views.
- Services own application data access and models.
- API routes provide contracts.
- React components present and interact.
- AI interprets business-ready data.

### Prefer configuration

Do not hardcode studio IDs, account IDs, Page IDs, credentials, schedules, or organization-specific behavior. Use the configuration model, especially `studio_integrations`.

### Protect metric trust

Before recommending or implementing a KPI:

1. Define its business meaning and grain.
2. Identify authoritative source fields.
3. Specify date, studio, and comparison behavior.
4. Place reusable calculations in reporting views or services.
5. Validate with known examples.
6. Document the definition.

### Be conservative about external systems

Do not invent API availability, table names, environment variables, credentials, n8n workflow behavior, or production status. Inspect the implementation or request the missing evidence.

## Prohibited Suggestions and Actions

Do not:

- Put Supabase warehouse writes in Playwright collectors.
- Put reusable business calculations in React components.
- Let components query Supabase directly.
- Commit credentials, tokens, cookies, sessions, `.env` files, downloads, generated output, or dependencies.
- Edit `.next/` generated validators or route/type files.
- Change Railway deployment roots or Docker boundaries as incidental work.
- Trigger production workflows, rotate credentials, deploy, or send external messages without authorization.
- Treat `docs/archive/` as current guidance.

## AI Feature Design

AI features should consume documented reporting views or stable service contracts and include:

- Traceable source metrics
- Time period and comparison context
- Studio/brand/organization scope
- Clear separation of facts, inferences, forecasts, and recommendations
- Confidence or data-quality caveats
- Human approval before consequential actions

Good AI output explains what changed, why the evidence suggests it changed, what may happen next, and which action is recommended.

## Documentation Duty

When implementation changes project state, update the relevant source of truth in the same branch:

- `current_status.md` for current implementation
- `integrations.md` for integration state
- `schema.md`/`data_model.md` for warehouse changes
- `architecture.md`/`decisions.md` for boundary changes
- `roadmap.md` for milestone sequencing
- `changelog.md` for meaningful delivered milestones

Avoid adding new overlapping summary files. Improve the canonical document instead.