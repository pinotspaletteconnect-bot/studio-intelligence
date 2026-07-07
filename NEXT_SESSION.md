Studio Intelligence – Next Session
Session Start Document

Updated: July 6, 2026

Current Project Status

Studio Intelligence has successfully completed its first cloud-hosted browser automation integration.

The Playwright service is now deployed to Railway, callable from n8n, and successfully retrieves live marketing data from Eulerity.

The architecture has now been validated end-to-end.

Current Architecture
n8n

    │

    ▼

Railway
(Express API)

    │

    ▼

Playwright

    │

    ▼

Eulerity

    │

    ▼

Download Reports

    │

    ▼

Parse Reports

    │

    ▼

Return Structured JSON

    │

    ▼

n8n ETL

    │

    ▼

Supabase Warehouse

    │

    ▼

Reporting Views

    │

    ▼

Dashboards / AI
Completed
Infrastructure

✔ GitHub Repository

✔ Railway Deployment

✔ Docker Deployment

✔ Express API

✔ Remote Playwright Execution

✔ n8n HTTP Integration

Playwright

Completed

✔ Login

✔ Session Management

✔ Studio Switching

✔ Metrics Download

✔ Spend Download

✔ Budget Distribution

✔ CSV Parsing

✔ JSON Response

API

Working Endpoints

GET /

GET /eulerity

POST /eulerity/download
Current Output

The Playwright service successfully returns:

Studio

Metrics

Spend

Budget Allocation

for

STM
GIL
JEF
SN
Project Decisions

The following architectural decisions are considered final.

Playwright

Responsible only for browser automation.

Returns browser-acquired data.

Never

Normalize
UPSERT
Know warehouse schema
n8n

Owns

Scheduling
ETL
Parsing
UPSERT
Retry Logic
Auditing
Supabase

Owns

Warehouse
Configuration
Reporting Views
AI Source Data
Immediate Next Goal

Move Eulerity data into the warehouse.

Playwright is considered feature complete.

The remaining work belongs to ETL.

Next Session Objectives
Phase 1

Create Supabase ingestion.

Tasks

Create

Eulerity Import Workflow

Workflow

Receive JSON

↓

Normalize

↓

UPSERT Metrics

↓

UPSERT Spend

↓

UPSERT Budget

↓

Integration Audit

↓

Success
Phase 2

Historical Import

Allow loading historical Eulerity reports.

Goal

One row per

Studio

Day

Campaign

Phase 3

Marketing Reporting

Create SQL views.

Examples

marketing_daily_summary

marketing_weekly_summary

studio_marketing_summary

executive_marketing_summary
Upcoming Integrations

Priority Order

Eulerity Warehouse Import
Weather
GA4 Enhancements
SOCi
Google Business Profile
POS
Labor
Inventory
Future Architecture Work
Centralized Configuration (Planned Refactor)

Current

Credentials live inside Railway Variables.

Future

Move all business configuration into Supabase.

Includes

Eulerity Credentials
GA4 Configuration
SOCi Credentials
API Keys
Studio Settings
External IDs
Scheduling Rules

Railway should eventually contain only infrastructure secrets.

Benefits

Single source of truth
Easier password rotation
Multi-studio support
Future multi-tenant platform
Simpler deployments

This refactor is intentionally postponed until after the Eulerity ETL is complete.

Technical Debt

Remove temporary debugging.

Examples

Email configured:

Password configured:

Popup debugging

These were added only during Railway deployment troubleshooting.

Current Folder Structure
studio-intelligence/

playwright/

    auth/

    downloads/

    routes/

    scripts/

    services/

    utils/

    server.js

    Dockerfile

docs/

    ARCHITECTURE.md

    DEVELOPER_GUIDE.md

    ROADMAP.md

    CHANGELOG.md

    CURRENT_STATUS.md
Success Criteria for Next Session

Complete all of the following:

☐ Create Eulerity Import workflow in n8n

☐ Build Supabase UPSERT nodes

☐ Populate

eulerity_daily_metrics
eulerity_daily_spend
eulerity_daily_budget_allocation

☐ Create Integration Audit records

☐ Verify duplicate-safe UPSERTs

☐ Run first successful warehouse import

Milestone Status
Milestone 1 — Infrastructure

Status: ✅ Complete

GitHub
Railway
Docker
Express API
Playwright
n8n integration
Milestone 2 — Eulerity ETL

Status: 🟡 In Progress

Browser automation: ✅
JSON output: ✅
Warehouse import: ☐
Auditing: ☐
Milestone 3 — Studio Intelligence Platform

Status: 🚧 Next

Unified warehouse
Reporting views
Executive dashboards
AI insights
Automated reporting
Notes for Future Development
Do not move business logic into Playwright. Keep it focused on browser automation.
Use configuration over hardcoding. New studios and integrations should be added through configuration whenever possible.
Preserve the separation of responsibilities: Playwright → browser automation, n8n → ETL, Supabase → storage and reporting.
After the Eulerity ETL is stable, implement the centralized configuration refactor so application credentials are managed from Supabase (or a dedicated secrets manager) rather than Railway variables.
Maintain warehouse-first design. All dashboards, AI, and analytics should consume reporting views rather than raw source tables.


Current Remaining Work

The workflow already has all required source data available.

Per studio:

metrics[]
spend[]
budget[]

The remaining work is to merge these collections into a single daily record before the warehouse Upsert.

Each daily record should contain:

Studio
Date
Impressions
Clicks
CTR
Spend Total
Allocated Spend
Budget %
CPC
CPM

After this transformation, the existing Lookup Studio ID and Upsert nodes can remain unchanged.

Next Session Checklist
Replace Expand Daily Metrics with Build Eulerity Daily Records.
Merge metrics, spend, and budget arrays.
Calculate:
Spend by channel
CPC
CPM
Add CPM columns to eulerity_daily_metrics.
Update the Upsert node to include the new calculated fields.
Verify all 28 daily records are written with complete metrics.
Session Outcome

This was one of the biggest milestones on the project so far.

You now have:

✅ GitHub repository established
✅ Railway deployment working
✅ Playwright automation working
✅ n8n orchestration working
✅ Supabase integration working
✅ Studio lookup and normalization working
✅ End-to-end Eulerity ingestion into the warehouse

From here, the work shifts from building infrastructure to enriching the warehouse. Once the spend/budget merge is complete, the Eulerity pipeline will be essentially production-ready, and the same ETL pattern can be reused for GA4, SOCi, and your POS data.