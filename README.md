# Studio Intelligence

Studio Intelligence is a warehouse-first business intelligence platform for multi-location experiential businesses. It combines data from marketing and, over time, operations, finance, and customer systems into one Supabase warehouse that supports dashboards, automation, reporting, and AI-assisted decisions.

## Current Platform

```text
External systems
  → APIs / Playwright collection service on Railway
  → n8n orchestration and ETL
  → Supabase PostgreSQL warehouse and reporting views
  → Next.js dashboard, automation, reports, and AI
```

Verified production marketing sources:

- Google Analytics 4
- Eulerity
- Meta Business Ads
- Meta Page Insights

Current product work focuses on unified marketing reporting, dashboard filters and comparisons, trend visualization, studio comparison, and executive intelligence.

## Repository

- `playwright/` — Node.js/Express collectors deployed on Railway
- `dashboard/` — Next.js 16/React 19 business intelligence application
- `docs/` — current architecture, status, integration, and development documentation
- `project_blueprint.md` — durable vision and principles
- `roadmap.md` — capability roadmap
- `AGENTS.md` — persistent working context and rules for Codex/AI assistants

Start with [the project overview](docs/00_overview/README.md), then read [current status](docs/02_development/current_status.md) and [architecture](docs/01_architecture/architecture.md).

## Local Development

Dashboard:

```bash
cd dashboard
npm install
npm run dev
```

Collector:

```bash
cd playwright
npm install
npm run dev
```

Production credentials are supplied outside Git. Never commit `.env` files, tokens, session data, generated `.next/` files, or dependency directories.

## Documentation

The canonical documentation map and conflict-resolution order are defined in `AGENTS.md`. Files under `docs/archive/` are historical only.