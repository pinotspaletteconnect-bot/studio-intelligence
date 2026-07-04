# Studio Intelligence Developer Guide
Version 1.0

This document is the operational guide for anyone (human or AI) developing Studio Intelligence.

Before making architectural recommendations, read this document.

If proposed changes conflict with this document, STOP.
The architecture has already been decided.

---

# Project Goal

Studio Intelligence is a warehouse-first business intelligence platform
for multi-location experiential businesses.

The purpose is NOT simply to automate websites.

The purpose is to continuously collect, normalize, warehouse, analyze,
and expose operational business data for reporting, dashboards,
forecasting, automation, and AI.

---

# Design Philosophy

Everything should be built so another integration can be added without
rewriting existing code.

Configuration always wins over hardcoding.

Reusable systems always win over one-off solutions.

Simple systems win over clever systems.

---

# Ownership

Every component owns exactly one responsibility.

## Playwright

Owns browser automation only.

Responsibilities

- Login
- Session management
- Navigation
- Browser interactions
- Download reports
- Return downloaded files

Never

- Writes to Supabase
- Makes business decisions
- Performs ETL
- Knows warehouse schema

---

## n8n

Owns ETL.

Responsibilities

- Scheduling
- Studio iteration
- Calling Playwright
- Calling APIs
- File handling
- Data normalization
- UPSERT operations
- Retry logic
- Auditing

Never

- Browser automation

---

## Supabase

Owns data storage.

Responsibilities

- Configuration
- Warehouse
- Reporting views
- Security
- AI source

Never

- Browser automation
- Scheduling

---

## Reporting Views

Own cross-domain reporting.

Never query source tables directly from dashboards.

Dashboards should consume reporting views.

AI should consume reporting views.

---

# Repository

```
studio-intelligence/

playwright/

    auth/
        Browser sessions

    downloads/
        Temporary downloads only

    routes/
        Express API endpoints

    scripts/
        Browser automation

    services/
        Shared helper services

    utils/

    server.js

docs/

    ARCHITECTURE.md
    DEVELOPER_GUIDE.md
    ROADMAP.md
    CHANGELOG.md
    CURRENT_STATUS.md
```

---

# Browser Automation Rules

Playwright performs browser automation only.

Flow

Login

↓

Switch Studio

↓

Download Report

↓

Return Downloaded File

↓

Exit

Never

Normalize data.

Never

UPSERT warehouse.

Never

Know database schema.

---

# ETL Rules

n8n owns ETL.

Flow

Receive File

↓

Normalize

↓

UPSERT

↓

Audit

↓

Delete Temporary Files

---

# Warehouse Rules

Warehouse-first architecture.

Never duplicate facts.

Every source receives its own fact table.

Fact tables preserve history.

UPSERT instead of INSERT.

---

# Configuration Rules

Nothing is hardcoded.

Studios

Organizations

Brands

Integrations

Credentials

Properties

External IDs

All configuration belongs inside Supabase.

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

Reporting

Future SQL Views

- marketing_daily_summary
- operations_daily_summary
- executive_daily_summary
- studio_daily_summary

---

# Current Integrations

GA4

Status

Production

Warehouse

Complete

Playwright

Not Required

---

Eulerity

Playwright

Login
✔

Session Persistence
✔

Metrics Download
✔

Spend Download
In Progress

Budget Download
In Progress

Warehouse

Schemas Complete

Metrics Import
In Progress

Spend Import
Planned

Budget Import
Planned

---

Weather

Warehouse Complete

Import Pending

---

PTS

Planned

---

SOCi

Planned

---

Google Business Profile

Planned

---

# Coding Rules

Every file has one responsibility.

Routes

Receive requests.

Nothing more.

Scripts

Browser automation only.

Services

Reusable logic.

Utilities

Generic helper functions.

Never place business logic in routes.

---

# Current Sprint

Objective

Finish Eulerity ETL.

Tasks

☐ Metrics parser

☐ Metrics import

☐ Spend download

☐ Spend import

☐ Budget download

☐ Budget import

☐ Integration auditing

---

# Current Database

One row per Studio + Day

GA4

One row per Studio + Day

Eulerity Metrics

One row per Studio + Day

Eulerity Budget

One row per Studio + Day

Eulerity Spend

One row per Studio + Day + Campaign

---

# Development Rules

When making recommendations

First ask

"Does this already exist?"

If yes

Follow the existing architecture.

Never redesign completed work.

Avoid introducing duplicate systems.

Reuse existing configuration whenever possible.

When uncertain

Read

ARCHITECTURE.md

DEVELOPER_GUIDE.md

CURRENT_STATUS.md

before making recommendations.

---

# End Goal

Studio Intelligence should eventually support any business with multiple
locations by adding configuration rather than writing new software.

Every new integration should plug into the existing architecture rather
than changing it.