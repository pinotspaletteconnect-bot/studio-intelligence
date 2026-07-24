# Studio Intelligence

> A warehouse-first business intelligence platform for multi-location experiential businesses.

Studio Intelligence centralizes marketing, operational, financial, and customer data so owners and operators can understand performance, compare locations, automate reporting, and build trustworthy AI-assisted decisions from one source of truth.

## The Questions the Platform Must Answer

1. What happened?
2. Why did it happen?
3. What is happening now?
4. What is likely to happen next?
5. What should the business do?

## Core Principles

- **Warehouse first:** integrations feed Supabase; dashboards and AI consume business-ready views.
- **Configuration over code:** organizations, studios, accounts, external IDs, and integration mappings are configurable.
- **Clear layer ownership:** collectors collect, n8n transforms, Supabase stores and reports, services model data, and the dashboard presents it.
- **Historical preservation:** business history is a strategic asset.
- **Reusable patterns:** new sources extend the standard lifecycle rather than introducing parallel systems.
- **Trust before automation:** metric definitions and data quality come before AI recommendations or production actions.

## Architecture

```text
GA4 • Eulerity • Meta • future operational/financial/customer sources
                             ↓
                 APIs and Playwright collectors
                             ↓
                    Express service on Railway
                             ↓
                    n8n orchestration and ETL
                             ↓
                   Supabase PostgreSQL warehouse
                             ↓
                  SQL reporting views and services
                             ↓
              Next.js dashboards • reports • automation • AI
```

## Current Stack

| Layer | Technology |
| --- | --- |
| Collection | Node.js, Express, Playwright, direct APIs |
| Deployment | Railway, Docker |
| Orchestration and ETL | n8n |
| Warehouse and configuration | Supabase PostgreSQL |
| Dashboard | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Source control | GitHub |

## Verified Production Integrations

- Google Analytics 4
- Eulerity
- Meta Business Ads
- Meta Page Insights

See `docs/01_architecture/integrations.md` for exact responsibilities, warehouse destinations, and status definitions.

## Active Product Focus

The platform foundation is established. Current work centers on:

- Unified marketing reporting views
- Marketing trends, date ranges, and comparisons
- Executive dashboards and studio comparison
- Consistent KPI definitions and validation
- AI-ready reporting contracts

Financial, operations, customer, creative, and broader local-presence capabilities remain roadmap items unless `current_status.md` says otherwise.

## Repository Structure

```text
studio-intelligence/
├── AGENTS.md
├── project_blueprint.md
├── roadmap.md
├── docs/
│   ├── 00_overview/
│   ├── 01_architecture/
│   ├── 02_development/
│   ├── archive/
│   └── ideas/
├── dashboard/          # Next.js business intelligence application
└── playwright/         # Railway-deployed collection service
```

## Documentation Source of Truth

| Document | Purpose |
| --- | --- |
| `AGENTS.md` | Persistent instructions and working rules for Codex/AI agents |
| `project_blueprint.md` | Durable product vision and business principles |
| `docs/01_architecture/architecture.md` | Authoritative system boundaries and data flow |
| `docs/02_development/current_status.md` | Current implementation state and next priorities |
| `roadmap.md` | Milestone sequence and future capabilities |
| `docs/01_architecture/integrations.md` | Integration catalog and verified statuses |
| `docs/01_architecture/data_model.md` | Logical warehouse model |
| `docs/01_architecture/schema.md` | Warehouse table/view inventory |
| `docs/02_development/developer_guide.md` | Development and verification standards |
| `docs/02_development/decisions.md` | Accepted architectural decisions |
| `docs/02_development/changelog.md` | Meaningful platform milestones |

Documents under `docs/archive/` are historical context only.

## Working in the Repository

### Dashboard

```bash
cd dashboard
npm install
npm run dev
npm run lint
npm run build
```

### Collector

```bash
cd playwright
npm install
npm run dev
```

Do not run production integrations, change credentials, or deploy without authorization. Never edit generated `.next/` files or commit `.env`, dependency, session, download, or build-output directories.

## Product Vision

Studio Intelligence should become the operating system for multi-location experiential businesses: one place to understand performance, explain causes, forecast outcomes, recommend actions, and eventually automate approved workflows.