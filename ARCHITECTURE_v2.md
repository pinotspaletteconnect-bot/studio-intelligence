# Studio Intelligence Architecture v2.0

## Executive Overview

Studio Intelligence is a configuration-driven business intelligence
platform for multi-location businesses. It centralizes operational,
marketing, financial, and customer data into a warehouse that powers
reporting, forecasting, automation, APIs, and AI.

## Core Principles

-   Configuration over hardcoding
-   Warehouse-first architecture
-   Normalize before loading
-   Reporting uses views instead of raw source tables
-   Browser automation is separated from ETL orchestration
-   Unlimited organizations, brands, studios, and integrations
-   UPSERT instead of duplicate inserts
-   Historical data is preserved
-   Every integration is auditable

## High Level Platform

External Systems → API Integrations (GA4, GBP, Future APIs) → Browser
Integrations (Eulerity, SOCi, PTS)

Playwright Browser Automation ↓ n8n ETL Orchestrator ↓ Supabase
Warehouse ↓ Reporting Views ↓ Dashboards • APIs • AI • Forecasting

## Platform Components

### n8n

Scheduling, orchestration, normalization, warehouse loading, retries and
auditing.

### Playwright

Authentication, session management, browser automation, downloads and
browser-only integrations. Never writes directly to the warehouse.

### Supabase

Configuration tables, fact tables, reporting views and AI source.

## Enterprise Hierarchy

Organization → Brand → Studio → Studio Integration → Fact Tables

## Configuration Tables

-   organizations
-   brands
-   studios
-   studio_integrations
-   integration_runs

## Business Domains

-   Website Analytics (GA4)
-   Advertising (Eulerity, SOCi)
-   Operations (PTS)
-   Local Presence (GBP)
-   Weather
-   Financial
-   Future systems

## Integration Patterns

API → Normalize → UPSERT → Audit

Browser → Playwright → Download → Parse → Normalize → UPSERT → Delete
Temporary Files → Audit

## Fact Tables

-   ga4_daily_metrics
-   eulerity_daily_metrics
-   eulerity_daily_spend
-   eulerity_daily_budget_allocation

## Reporting Layer

Reporting views: - marketing_daily_summary - executive_daily_summary -
operations_daily_summary - studio_daily_summary

Views combine business facts from multiple source systems.

## ETL Standard

Acquire → Normalize → UPSERT → Audit → Reporting Views

## Browser Automation Standard

Login → Switch Studio → Download Files → Return Files → n8n Imports →
Delete Temporary Files

## Naming Standards

Fact tables: `<source>`{=html}*daily*`<entity>`{=html}

Examples: - ga4_daily_metrics - eulerity_daily_metrics -
eulerity_daily_spend - eulerity_daily_budget_allocation

## AI Layer

AI consumes reporting views only.

## Deployment

GitHub → Railway → n8n → Playwright → Supabase

## Current Status

Completed: - Warehouse - Configuration Tables - GA4 Import - Eulerity
Schemas

In Progress: - Playwright Automation - Eulerity Metrics Import -
Eulerity Spend Import - Budget Allocation Import

Planned: - SOCi - PTS - Google Business Profile - Weather - Financial
Integrations - Executive Dashboard - AI Recommendation Engine

## Architecture Decisions

-   Configuration over hardcoded IDs
-   Source-specific fact tables
-   Browser automation separated from ETL
-   Reporting via views
-   AI uses reporting views
-   Temporary ETL files deleted after import
-   Playwright never writes directly to Supabase

## Long-Term Vision

Studio Intelligence becomes the operating system for multi-location
experiential businesses by continuously acquiring, normalizing, and
analyzing data from every business system to power dashboards,
forecasting, automation, and AI recommendations.
