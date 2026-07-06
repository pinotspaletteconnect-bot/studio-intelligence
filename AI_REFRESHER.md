# AI_REFRESHER.md
Last Updated: July 6, 2026

---

# Purpose

This document is the first document the AI should read at the beginning of every coding session.

It is not intended to replace the Architecture or Developer Guide.

Its purpose is to quickly restore project context, document engineering decisions, and identify exactly where development should resume.

---

# Current Status

Current Version

v0.3.0

Current Sprint

Eulerity ETL

Current Focus

n8n ETL

Last Completed

✅ Eulerity Playwright Layer Complete

---

# System Architecture

Playwright

↓

Browser Data

↓

n8n

↓

Warehouse

↓

Reporting Views

↓

AI

Responsibilities

Playwright
- Browser automation
- Login
- Navigation
- Download reports
- Return structured browser data

n8n
- Acquire configuration
- Execute integrations
- Normalize
- UPSERT
- Auditing

Supabase
- Configuration
- Warehouse
- Reporting Views

AI
- Reporting Views only
- Never consume raw fact tables

---

# Current Integrations

| Integration | Status | Workflow |
|------------|--------|----------|
| GA4 | ✅ Production | 03 |
| Eulerity | 🟡 ETL | 04 |
| SOCi | ⏳ Planned | 05 |
| PTS | ⏳ Planned | 06 |
| Weather | ⏳ Planned | 07 |

---

# Workflow Catalog

## Workflow 02

Name

Get Active Integrations

Purpose

Returns every active Studio + Integration.

Database Tables

- studios
- studio_integrations

Returns

- studio_id
- integration_id
- studio_code
- studio_name
- city
- state
- country
- timezone
- integration_type
- integration_name
- external_id
- configuration

SQL

```sql
SELECT
    s.id AS studio_id,
    si.id AS integration_id,

    s.studio_code,
    s.studio_name,
    s.city,
    s.state,
    s.country,
    s.timezone,

    si.integration_type,
    si.integration_name,
    si.external_id,
    si.configuration

FROM studios s

INNER JOIN studio_integrations si
    ON s.id = si.studio_id

WHERE
    s.active = TRUE
    AND si.is_active = TRUE

ORDER BY
    s.id,
    si.integration_type;
```

This workflow is the configuration source for every import workflow.

---

## Workflow 03

Name

GA4 Dynamic Import

Purpose

Imports GA4 metrics into the warehouse.

Flow

Manual Trigger

↓

Workflow 02

↓

Filter (integration_type = ga4)

↓

Loop Studios

↓

GA4 API

↓

Normalize

↓

UPSERT ga4_daily_metrics

Node Responsibilities

Filter

Only GA4 integrations.

HTTP Request

Calls the Google Analytics Data API.

Code Node

Transforms the API response into warehouse rows.

PostgreSQL

UPSERT into ga4_daily_metrics.

---

## Workflow 04

Name

Eulerity Dynamic Import

Status

In Development

Purpose

Import Eulerity metrics, spend and budget allocation.

Important Design Decision

Playwright processes ALL active studios in a single browser session.

Workflow 04 should call:

POST /eulerity/download

exactly once.

Do NOT execute Playwright once per studio.

The returned JSON should then be split into warehouse rows.

Planned Flow

Manual Trigger

↓

POST /eulerity/download

↓

Metrics

↓

Spend

↓

Budget

↓

UPSERT

↓

integration_runs

---

## Workflow 05

Reserved

SOCi Import

---

## Workflow 06

Reserved

PTS Import

---

## Workflow 07

Reserved

Weather Import

---

# Repository

playwright/

    routes/
        eulerity.js

    scripts/
        eulerity/
            eulerity.js

    services/
        eulerityParser.js

    server.js

---

# Current Warehouse

Configuration

- organizations
- brands
- studios
- studio_integrations
- integration_runs

Fact Tables

- ga4_daily_metrics
- eulerity_daily_metrics
- eulerity_daily_spend
- eulerity_daily_budget_allocation
- weather_daily

---

# Engineering Decisions

These decisions have already been made.

Do not redesign them.

- Playwright owns browser automation only.
- n8n owns ETL.
- Supabase owns storage.
- Reporting Views own reporting.
- AI consumes reporting views only.
- Workflow 02 is the configuration loader.
- One workflow per integration.
- Playwright returns structured JSON.
- UPSERT operations occur in n8n.
- Browser automation never writes to the warehouse.
- Browser automation never knows the database schema.

---

# Current Sprint

Remaining Tasks

☐ Build Workflow 04

☐ Normalize Eulerity response

☐ UPSERT Metrics

☐ UPSERT Spend

☐ UPSERT Budget Allocation

☐ Record integration_runs

☐ Delete temporary download files

---

# Resume Here

At the start of the next coding session:

1. Read:
   - ARCHITECTURE.md
   - DEVELOPER_GUIDE.md
   - AI_REFRESHER.md

2. Continue building Workflow 04 (Eulerity Dynamic Import).

3. Do not modify the Playwright layer unless a bug is discovered.

Playwright is considered feature complete.