# Studio Intelligence Roadmap

**Version:** 4.1  
**Last updated:** July 23, 2026

## Purpose

This roadmap defines capability milestones and their sequence. `docs/02_development/current_status.md` is authoritative for the active sprint and verified implementation state.

```text
Platform foundation
  → standardized collection
  → trusted warehouse/reporting
  → interactive business intelligence
  → predictive intelligence
  → approved business automation
```

## Phase 1 — Platform Foundation

**Status:** Complete

Delivered:

- GitHub repository and documentation framework
- Railway and Docker deployment
- Node.js/Express collection service
- Playwright automation foundation
- n8n orchestration and ETL
- Supabase warehouse
- Multi-organization/brand/studio configuration model

## Phase 2 — Marketing Data Collection

**Status:** Complete for the current four production sources

Production sources:

- Google Analytics 4
- Eulerity
- Meta Business Ads
- Meta Page Insights

The standardized path from collection through n8n and Supabase is validated. Additional integrations should reuse it.

Remaining platform work is operational hardening—monitoring, auditing, credential lifecycle, backfills, and repeatable tests—not a new collection architecture.

## Phase 3 — Marketing Business Intelligence

**Status:** Active

### Objective

Transform four production marketing sources into trusted cross-platform metrics and useful decisions.

### Current milestones

1. Define and validate unified marketing reporting views.
2. Complete dashboard date range and comparison behavior.
3. Complete marketing trend visualization.
4. Add campaign performance and studio comparison.
5. Establish metric definitions and data-quality checks.
6. Prepare AI-ready marketing context only after metrics are trusted.

### Planned extensions

- Google Ads and Microsoft Ads
- Google Business Profile and reviews
- Broader organic social content metrics
- Creative Intelligence across images, videos, Reels, promotions, paintings, and campaigns
- Contextual demand data such as weather, holidays, school calendars, and community events

An extension is not considered production until its full end-to-end path is validated.

## Phase 4 — Executive Intelligence

**Status:** Foundation active; full capability planned

### Objective

Give owners and multi-unit operators a fast, trusted view across studios.

Planned capabilities:

- Executive KPI dashboard
- Studio rankings and comparisons
- Trend and anomaly summaries
- Cross-domain scorecards
- Benchmarking
- Explainable AI summaries and recommended actions

The current Next.js shared context, service layer, API layer, and reusable dashboard components are the foundation for this phase.

## Phase 5 — Operations Intelligence

**Status:** Planned

Planned sources and capabilities:

- Reservations and attendance
- Capacity utilization
- Scheduling, staffing, and labor
- Inventory and product usage
- Studio-level operational KPIs

Work begins after the source systems and warehouse contracts are confirmed.

## Phase 6 — Financial Intelligence

**Status:** Planned

Planned capabilities:

- Revenue and expenses
- Payroll and labor cost
- Budgeting and profitability
- Cash flow and forecasting
- Financial KPIs by studio, brand, and organization

Potential source systems include QuickBooks Online, payment/POS platforms, and payroll systems; no vendor should be treated as selected until confirmed.

## Phase 7 — Customer Intelligence

**Status:** Planned

Planned capabilities:

- Unified customer profiles
- Visit and purchase history
- Retention and lifetime value
- Segmentation and loyalty
- Marketing attribution
- Customer behavior insights

## Phase 8 — Predictive Intelligence

**Status:** Future

Planned capabilities:

- Forecasting
- Anomaly detection
- Demand prediction
- Campaign and creative recommendations
- Staffing, budget, and inventory recommendations
- Natural-language business analysis

Models and AI must consume documented, business-ready views with traceable metric definitions.

## Phase 9 — Business Automation

**Status:** Future

Planned capabilities:

- Automated reporting and alerts
- Approved n8n action workflows
- Marketing optimization suggestions
- Staffing, inventory, and budget action plans
- Human-reviewed and eventually policy-controlled execution

Automation must be observable, reversible where possible, and explicitly authorized before production actions.

## Cross-Platform Initiatives

These apply to every phase:

- Configuration-driven multi-tenancy
- Historical preservation and backfills
- Integration-run auditing and alerting
- Data-quality tests and metric definitions
- Credential lifecycle and security
- Consistent dashboard filters and comparison logic
- Mobile-friendly, executive-readable UX
- Clear documentation and handoff state
- Repository hygiene: generated output, dependencies, and secrets stay out of Git

## Prioritization Rules

Prefer work that:

- Improves trust in metrics
- Reduces manual reporting
- Increases revenue or profitability visibility
- Creates reusable platform capability
- Supports multi-location decision-making
- Advances AI readiness without bypassing data quality

Avoid adding integrations merely to increase the integration count. Trusted reporting and actionable intelligence from existing sources take priority.