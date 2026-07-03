# Studio Intelligence Architecture

---

# Vision

Studio Intelligence is a multi-tenant business intelligence platform that consolidates marketing, operational, financial, customer, and AI-derived data into a centralized analytics warehouse.

The platform is designed to support:

- Unlimited organizations
- Unlimited brands
- Unlimited studios
- Unlimited integrations
- Unlimited external systems

through a configuration-driven architecture.

The warehouse becomes the single source of truth for reporting, forecasting, dashboards, APIs, automation, and AI-powered decision support.

The long-term objective is to build the operating system for multi-location experiential businesses.

---

# Core Architecture

```
                    External Systems
──────────────────────────────────────────────────────────────

Google Analytics 4
Eulerity
SOCi
PTS (Pinot Technical System)
Google Business Profile
Weather
Holiday Calendar
Accounting
Payroll
Inventory
Future Integrations

                           │
                           ▼

                    n8n ETL Platform

                           │
                           ▼

                 Supabase Data Warehouse

                           │

        ┌──────────────────┼──────────────────┐

        ▼                  ▼                  ▼

   Reporting Views     Executive APIs     AI Models

        │                  │                  │

        └──────────────────┼──────────────────┘

                           ▼

                     Dashboards
                     Forecasting
                     Recommendations
                     Automation
```

---

# Enterprise Hierarchy

Every record belongs to the following hierarchy.

```
Organization

    │

Brand

    │

Studio

    │

Integration

    │

Business Domain

    │

Fact Record
```

Example

```
Duff's Easel Empire

    Pinot's Palette

        Louisville

        Jeffersonville

        Gilbert

        Short North
```

No workflow should ever require studio-specific logic.

Everything should be configuration driven.

---

# Warehouse Architecture

Studio Intelligence separates the warehouse into three layers.

```
                Source Systems

                      │

                      ▼

              Source Fact Tables

                      │

                      ▼

             Reporting Views

                      │

                      ▼

      Dashboards
      APIs
      AI
      Forecasting
      Automation
```

## Layer 1 — Source Fact Tables

Purpose

Store exactly what the external source system reports.

No calculations.

No business logic.

No cross-system joins.

Every source owns its own fact tables.

---

## Layer 2 — Reporting Views

Purpose

Business logic lives here.

Reporting views combine multiple source systems into business-friendly datasets.

Examples

marketing_daily_summary

studio_daily_summary

operations_daily_summary

executive_daily_summary

financial_daily_summary

forecast_summary

---

## Layer 3 — AI & Automation

Purpose

Consume reporting views.

Never consume raw fact tables directly unless specifically required.

AI should answer business questions rather than reconstruct source data.

---

# Configuration Tables

These tables define the platform.

organizations

brands

studios

studio_integrations

integration_runs

No workflow should contain hardcoded IDs.

All integrations originate from studio_integrations.

---

# Source Fact Tables

Every external system owns its own source tables.

---

## Google Analytics 4

Table

ga4_daily_metrics

Grain

One row

Studio

Date

Authoritative for

Website traffic

Users

Sessions

Engagement

Website conversions

Revenue attribution

---

## Eulerity

### eulerity_daily_metrics

Grain

Studio

Date

Contains

Impressions

Clicks

CTR

CPC

CPM

Channel metrics

---

### eulerity_daily_spend

Grain

Studio

Campaign

Date

Contains

Spend

Campaign

Activation Date

User

---

### eulerity_budget_snapshots

Grain

Studio

Snapshot Date

Contains

Dashboard Screenshot

AI Extracted Budget Allocation

Historical Budget Distribution

---

## SOCi

Planned

soci_campaign_daily

reviews_daily

social_posts_daily

google_business_profile_daily

---

## Pinot Technical System (PTS)

Planned

reservations_daily

sales_daily

customers_daily

private_parties_daily

inventory_daily

gift_cards_daily

---

## Weather

Planned

weather_daily

---

## Calendar

Planned

holiday_calendar

school_calendar

event_calendar

---

# Reporting Views

Business reporting should never consume source tables directly.

Instead, reporting views combine multiple fact tables.

Examples

marketing_daily_summary

Combines

GA4

Eulerity

SOCi

Produces

Marketing Spend

Website Sessions

ROAS

Cost Per Session

Cost Per User

CTR

Conversions

---

studio_daily_summary

Combines

GA4

Eulerity

PTS

Weather

Holiday Calendar

Produces

Revenue

Attendance

Marketing Spend

Website Traffic

Conversion Rate

Average Ticket

Lead Time

Weather

Holiday Flags

---

executive_daily_summary

Combines

Every business domain

Produces

Executive KPIs

Growth

Forecasts

Alerts

Benchmarking

---

# Standard Integration Pattern

Every integration follows the exact same workflow.

```
studio_integrations

        │

Read Active Integrations

        │

Filter Integration Type

        │

Loop Each Studio

        │

Retrieve Data

(API
CSV
Browser
Screenshot)

        │

Normalize

        │

UPSERT

        │

integration_runs

        │

Reporting Views
```

Every workflow should be reusable.

No workflow should contain studio-specific logic.

---

# AI Vision Pipeline

Not every business system exposes an API.

Some expose only dashboards.

Architecture

```
Screenshot

      │

Vision Model

      │

Structured Data

      │

Warehouse
```

Examples

Eulerity Budget Distribution

POS Dashboards

Financial Reports

Scheduling Dashboards

Competitive Analysis

---

# Integration Registry

Every external connection is represented by one record.

studio_integrations

Example

| Studio | Integration | External ID |
|---------|-------------|-------------|
| Louisville | GA4 | 354847068 |
| Louisville | Eulerity | 4816848909762560 |
| Louisville | SOCi | Future |
| Louisville | PTS | Future |

No workflow should contain hardcoded identifiers.

---

# Integration Auditing

Every ETL execution is recorded.

integration_runs

Typical fields

Studio

Integration

Workflow

Started

Completed

Duration

Status

Records Imported

Errors

Every imported record should be traceable to its ETL execution.

---

# System of Record

Every business metric has exactly one authoritative source.

| Business Data | System of Record |
|-------------------------------|----------------|
| Website Analytics | GA4 |
| Advertising Performance | Eulerity |
| Local Marketing | SOCi |
| Reservations | PTS |
| Revenue | PTS |
| Customers | PTS |
| Reviews | SOCi |
| Weather | Weather API |
| Holidays | Internal Calendar |

---

# Design Principles

Configuration over hardcoding

Warehouse-first architecture

Source-specific fact tables

Reporting views contain business logic

Normalize before loading

Preserve source fidelity

UPSERT instead of duplicate inserts

Historical data is preserved

Unlimited studios

Unlimited integrations

Unlimited brands

Unlimited organizations

Every ETL execution is auditable

One responsibility per workflow

APIs preferred over browser automation

Browser automation only when APIs are unavailable

AI may be used as a structured data ingestion layer

---

# Platform Maturity

Infrastructure

★★★★★

GA4

★★★★★

Eulerity

★★☆☆☆

SOCi

☆☆☆☆☆

PTS

☆☆☆☆☆

Reporting Views

★☆☆☆☆

Executive Dashboard

☆☆☆☆☆

Forecasting

☆☆☆☆☆

AI Insights

★☆☆☆☆

Automation

★★☆☆☆

---

# Long-Term Vision

Studio Intelligence is designed to become the operating system for multi-location experiential businesses.

Rather than simply reporting historical numbers, the platform continuously collects operational, financial, marketing, customer, and AI-derived data from every business system, stores each source in its own authoritative fact tables, transforms those facts into unified business reporting views, and enables dashboards, forecasting, automation, anomaly detection, and AI-driven recommendations that help owners make better decisions every day.

The architecture is intentionally designed so that new data sources can be added without changing existing workflows, dashboards, or AI models. Source systems remain independent, reporting logic remains centralized, and business intelligence continues to grow as the platform evolves.