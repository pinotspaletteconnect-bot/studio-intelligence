# Studio Intelligence Architecture

**Version:** 4.1  
**Last updated:** July 23, 2026

## Purpose

This document defines the technical architecture and responsibility boundaries of Studio Intelligence. If routine implementation choices conflict with these boundaries, this document takes precedence unless an explicit architectural decision supersedes it.

## Architectural Model

Studio Intelligence is a warehouse-first, configuration-driven platform.

```text
External Systems
  → Collection Layer (APIs, Playwright, webhooks, files)
  → ETL Layer (n8n)
  → Warehouse Layer (Supabase PostgreSQL)
  → Business Intelligence Layer (SQL views and services)
  → Presentation Layer (Next.js dashboard and API routes)
  → Intelligence/Action Layer (reports, automation, AI)
```

Each layer owns one responsibility. Data may flow through the layers, but responsibilities must not leak between them.

## Repository and Deployment Shape

```text
studio-intelligence/
├── AGENTS.md
├── project_blueprint.md
├── roadmap.md
├── docs/
├── dashboard/          # Next.js business intelligence application
└── playwright/         # Railway-deployed collection service
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    ├── server.js
    ├── routes/
    ├── services/
    └── scripts/
```

Railway deploys `playwright/` as an independent Node.js/Express service:

- Root directory: `playwright`
- Dockerfile: `playwright/Dockerfile`
- Container application root: `/app`
- Entry point: `node server.js`
- Production configuration: Railway environment variables

Changing this deployment shape requires a documented migration plan.

## Collection Layer

Technologies include direct APIs, Playwright browser automation, Express routes, webhooks, and controlled file imports.

Collection owns:

- Authentication and token/session handling
- Source API communication
- Browser navigation and report downloads
- Source discovery
- Structured extraction
- A stable response contract

Collection does not own:

- Warehouse writes
- Business calculations
- Cross-source normalization
- Studio/account assignment rules that belong in configuration
- Reporting logic

Use direct APIs when reliable APIs exist. Use Playwright when browser automation is required.

## ETL and Orchestration Layer

n8n owns:

- Scheduling and orchestration
- Input validation
- Source-to-warehouse normalization
- Calculations required for loading
- Configuration lookups and studio mapping
- Idempotent UPSERT behavior
- Retry/error handling
- Integration-run auditing
- Temporary artifact cleanup

Collectors should remain generic. Source-specific transformations belong at the ETL boundary, and reusable business metrics belong downstream in reporting views or services.

## Warehouse Layer

Supabase PostgreSQL owns:

- Organization, brand, studio, and integration configuration
- Historical facts and dimensions
- Data integrity and tenant relationships
- Reporting views
- Data exposed to dashboard services, automation, and AI

The organization hierarchy is:

```text
organization → brand → studio → business facts
```

Business-specific account IDs and mappings belong in configuration tables such as `studio_integrations`, not in application code.

## Business Intelligence Layer

SQL reporting views are the preferred home for reusable cross-source calculations and trusted metrics. Frontend services translate reporting data into typed application models.

This layer owns:

- Cross-source joins
- Metric definitions
- Aggregations by date, studio, brand, and organization
- Dashboard-ready models
- AI-ready business context

Consumers should not independently recreate the same KPI in multiple components or workflows.

## Presentation Layer

The dashboard is a Next.js 16 App Router application using React 19 and TypeScript.

```text
Next.js page
  → dashboard component
  → shared application context
  → Next.js API route
  → service layer
  → Supabase reporting view/table
```

### Pages

Pages own layout and composition. They do not query Supabase or contain durable business calculations.

### Shared Application Context

Shared state includes active studio and common dashboard filters. It is the single source of truth for cross-page selections such as date range and comparison period as those features are completed.

### Components

Components own presentation and interaction. Reusable filters, metric cards, charts, tables, and empty/loading/error states should be shared.

### API Routes

API routes validate request parameters, call services, and return stable JSON contracts. They should remain thin.

### Services

Services own Supabase access and application-level aggregation. React components must not communicate directly with Supabase.

## Intelligence and Action Layer

Dashboards, reports, n8n automations, and AI consume business-ready data. AI should receive reporting views or documented service contracts, not raw source-specific payloads.

AI and automation may:

- Explain performance
- Detect anomalies and trends
- Forecast outcomes
- Recommend actions
- Trigger approved workflows

Production actions require explicit authorization, observability, and safe failure behavior.

## Standard Integration Pattern

Every integration should implement the applicable stages:

1. Secure authentication
2. Source discovery and collection
3. Structured response contract
4. n8n validation and normalization
5. Configuration-driven entity mapping
6. Historical, idempotent warehouse loading
7. Reporting view or service contract
8. Dashboard/automation/AI consumption
9. Production validation and monitoring
10. Documentation and changelog update

## Current Production Data Sources

- Google Analytics 4
- Eulerity
- Meta Business Ads
- Meta Page Insights

Their exact status and warehouse destinations are maintained in `integrations.md` and `current_status.md`.

## Permanent Architectural Rules

- Warehouse first
- Configuration over hardcoding
- Preserve history
- One responsibility per layer
- Reuse one integration lifecycle
- Reporting views and services define trusted business metrics
- UI components do not query Supabase directly
- Source collectors do not write to the warehouse
- AI consumes business-ready data
- Secrets and session material never enter Git
- New integrations extend the architecture rather than redesigning it

## Change Control

Update this document when a change alters layer responsibilities, deployment boundaries, the standard integration lifecycle, or the dashboard data-access pattern. Record significant accepted changes in `docs/02_development/decisions.md`.