# Studio Intelligence — Agent Instructions

These instructions apply to the entire repository. More-specific `AGENTS.md` files may add rules for their subtree; for example, `dashboard/AGENTS.md` contains Next.js-specific guidance.

## Mission

Studio Intelligence is a warehouse-first business intelligence platform for multi-location experiential businesses. It centralizes marketing, operational, financial, and customer data so dashboards, automation, reporting, and AI can operate from one trustworthy source.

The platform should answer:

1. What happened?
2. Why did it happen?
3. What is happening now?
4. What is likely to happen next?
5. What should the business do?

## Read This Context First

Before planning or implementing substantial work, read the documents relevant to the task:

1. `project_blueprint.md` — durable product vision and principles.
2. `docs/01_architecture/architecture.md` — authoritative system boundaries and data flow.
3. `docs/02_development/current_status.md` — current implementation state and immediate priorities.
4. `roadmap.md` — milestone sequence and planned capabilities.
5. `docs/01_architecture/integrations.md` — integration catalog and status.
6. `docs/01_architecture/data_model.md` and `schema.md` — warehouse model and table inventory.
7. `docs/02_development/developer_guide.md` — implementation standards.
8. `docs/02_development/decisions.md` — accepted architectural decisions.

If documents disagree, prefer actual code and deployed behavior, then `current_status.md` for present state, `architecture.md` for system rules, and `project_blueprint.md` for long-term intent. Correct stale documentation as part of the same change.

## Current Platform

### Collection and ETL

- Node.js/Express collection service in `playwright/`, deployed independently on Railway.
- Playwright is used when browser automation is necessary; direct APIs are preferred when reliable APIs exist.
- n8n owns scheduling, orchestration, validation, transformation, retry handling, auditing, and warehouse loading.
- The collector returns structured source data. It must not contain warehouse-specific writes or business calculations.

### Data and Reporting

- Supabase PostgreSQL is the configuration store, historical warehouse, reporting layer, and source for dashboards and AI.
- Business mappings belong in configuration tables such as `studio_integrations`, not hardcoded in services.
- Consumers should use reporting views or service-layer models instead of querying raw source tables directly.

### Dashboard

- Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, and Supabase client code live in `dashboard/`.
- Pages compose UI; shared application state owns studio and date filters; API routes call services; services own Supabase access.
- React components must not query Supabase directly or perform durable business calculations.
- Do not edit generated `.next/` files. Read `dashboard/AGENTS.md` and the installed Next.js documentation before dashboard changes.

### Production Integrations

Verified as production in the current project documentation:

- Google Analytics 4 (GA4)
- Eulerity
- Meta Business Ads
- Meta Page Insights

Planned or incomplete integrations must remain clearly labeled as such. Do not describe planned work as production without code, warehouse, ETL, deployment, and validation evidence.

## Architectural Rules

- Warehouse first.
- Configuration over hardcoding.
- Preserve history.
- One responsibility per layer.
- Reuse the standard integration lifecycle:
  `source → collector/API → n8n ETL → Supabase → reporting views → services/API routes → dashboard/automation/AI`.
- Keep source-specific logic at collection/ETL boundaries.
- Keep reusable business metrics in SQL reporting views or services, never scattered across UI components.
- Never place credentials, tokens, cookies, session files, or `.env` contents in Git.

## Repository Map

- `playwright/` — Railway-deployed Express collection service and Meta/Eulerity collectors.
- `dashboard/` — Next.js business intelligence application.
- `docs/00_overview/` — concise project orientation.
- `docs/01_architecture/` — architecture, data model, schema, and integration catalog.
- `docs/02_development/` — current status, development rules, decisions, and changelog.
- `docs/archive/` — historical documents; do not treat as current guidance.
- `project_blueprint.md` — durable vision.
- `roadmap.md` — capability roadmap.

`node_modules/`, `.next/`, build output, local environment files, and generated validator/type files are not source and must not be edited or committed.

## Working Method

Before changes:

1. Inspect the relevant implementation and nearby documentation.
2. Check Git status and preserve unrelated user changes.
3. Confirm whether the task concerns collection, ETL, warehouse, reporting, presentation, or intelligence.
4. State material assumptions and identify missing external context.

During changes:

- Keep work narrowly scoped.
- Reuse established services, routes, components, and integration patterns.
- Avoid broad refactors during feature or documentation work.
- Do not change Railway root/Docker structure, Supabase schema, production workflows, authentication, or paid services without explicit approval and a migration plan.

After changes:

1. Run the smallest relevant verification first.
2. For `dashboard/`: run `npm run lint` and `npm run build` from that directory when dependencies and environment permit.
3. For `playwright/`: validate startup and targeted service/route behavior; do not call production integrations without authorization.
4. Report what was verified and what could not be verified.
5. Update `current_status.md`, integration status, roadmap, architecture, schema, or changelog when the documented state changes.

## GitHub Workflow

- Use a separate branch for substantial work.
- Do not push directly to `main` unless the user explicitly requests it.
- Keep commits focused and use clear messages.
- Prefer draft pull requests until verification is complete.
- Never commit secrets, `.env` files, generated output, or dependency directories.

## Decisions Requiring Approval

Ask before:

- Changing database schemas or destructive data migrations.
- Altering production n8n workflows or Railway configuration.
- Rotating credentials or changing authentication flows.
- Adding paid services or materially changing infrastructure.
- Removing a production integration or major feature.
- Deploying to production, sending external messages, or triggering production jobs.

## Product and UX Preferences

- Keep interfaces clear, executive-friendly, and non-technical.
- Design for multi-studio use and mobile layouts.
- Prioritize trustworthy metrics, traceability, and reliability over feature volume.
- Make filters, comparisons, and metric definitions consistent across dashboards.
- Prefer reversible actions and explain consequential assumptions.