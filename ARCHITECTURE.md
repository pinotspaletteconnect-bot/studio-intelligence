# Studio Intelligence Architecture

---

# Overview

Studio Intelligence is a multi-tenant business intelligence platform that consolidates marketing, operational, financial, and customer data into a centralized analytics warehouse.

The platform is designed to support:

- Unlimited organizations
- Unlimited brands
- Unlimited studios
- Unlimited integrations
- Unlimited data sources

through a configuration-driven architecture.

The warehouse serves as the single source of truth for dashboards, APIs, reporting, forecasting, automation, and AI-driven insights.

---

# Platform Architecture

```
                External Systems
────────────────────────────────────────────

Google Analytics 4
Eulerity
SOCi
PTS (Pinot Technical System)
Google Business Profile
Future Integrations

            │
            ▼

        n8n ETL Platform

            │
            ▼

    Supabase Data Warehouse

            │
            ▼

 Executive Dashboards
 Studio Dashboards
 APIs
 AI Insights
 Forecasting
 Automation
```

---

# Enterprise Hierarchy

Studio Intelligence is built around a scalable enterprise hierarchy.

```
Organization

    │

    ▼

Brand

    │

    ▼

Studio

    │

    ▼

Studio Integration

    │

    ▼

Fact Tables
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

This hierarchy allows the platform to support multiple organizations and brands without future schema changes.

---

# Business Domains

Studio Intelligence organizes data by **business domain** rather than software vendor.

## Website Analytics

Primary System

Google Analytics 4

Purpose

- Website traffic
- Users
- Sessions
- Attribution
- Landing pages
- Engagement
- Conversions
- Revenue attribution

Warehouse Table

- ga4_daily_metrics

GA4 is the authoritative source for website behavior.

---

## Advertising

Primary Systems

- Eulerity
- SOCi
- Future Advertising Platforms

Purpose

- Google Search
- Google Display
- Google Video
- Meta Advertising
- Remarketing

Metrics

- Spend
- Clicks
- Impressions
- CPC
- CTR
- CPM
- Campaign Performance

Warehouse Table

- advertising_daily_channel_metrics

Advertising data is organized by:

- Provider
- Platform
- Channel

Examples

| Provider | Platform | Channel |
|-----------|----------|----------|
| Eulerity | Google | Search |
| Eulerity | Google | Remarketing |
| Eulerity | Meta | Meta |
| SOCi | Meta | Meta |

This allows multiple advertising systems to contribute to the same reporting model.

---

## Local Marketing

Primary System

SOCi

Purpose

- Studio-specific Meta campaigns
- Local Facebook marketing
- Local Instagram marketing
- Community engagement
- Reviews
- Reputation Management
- Local Listings

Future warehouse tables

- reviews_daily
- social_posts_daily
- google_business_profile_daily

SOCi is the authoritative source for localized marketing.

---

## Operations & Revenue

Primary System

PTS (Pinot Technical System)

Purpose

- Reservations
- Attendance
- Revenue
- Class sales
- Retail sales
- Bar sales
- Candle sales
- Private parties
- Mobile events
- Gift cards
- Customer records

Future warehouse tables

- reservations_daily
- revenue_daily
- customer_daily

PTS is the authoritative source for studio operations and revenue.

---

# Warehouse Design

Studio Intelligence follows a dimensional warehouse architecture.

Configuration Tables

- organizations
- brands
- studios
- studio_integrations
- integration_runs

Fact Tables

- ga4_daily_metrics
- advertising_daily_channel_metrics
- Future operational tables
- Future financial tables

Business-facing dashboards should consume reporting views rather than raw source tables.

Examples

- marketing_daily_summary
- operations_daily_summary
- executive_daily_summary
- studio_daily_summary

---

# Standard ETL Architecture

Every integration follows the same architecture.

```
Studio Integrations

      │
      ▼

Read Active Integrations

      │
      ▼

Loop Through Studios

      │
      ▼

API Request

      │
      ▼

Normalize Response

      │
      ▼

Warehouse UPSERT

      │
      ▼

Integration Runs

      │
      ▼

Dashboards
APIs
AI
```

This pattern ensures every integration behaves consistently regardless of data source.

---

# Integration Registry

Every external system is represented by one record in **studio_integrations**.

Each record represents one studio connected to one external system.

Examples

| Studio | Integration | External ID |
|---------|-------------|-------------|
| Louisville | GA4 | 354847068 |
| Louisville | Eulerity | 4816848909762560 |
| Louisville | SOCi | Future |
| Louisville | PTS | Future |

No workflow should require hardcoded IDs.

---

# ETL Auditing

Every workflow records execution information in:

- integration_runs

Typical information recorded

- Integration
- Studio
- Start Time
- Completion Time
- Status
- Records Processed
- Duration
- Error Message

Fact tables may reference the integration run that created each record.

---

# Multi-Tenant Model

Organization

└── Brand

&nbsp;&nbsp;&nbsp;&nbsp;└── Studio

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── Integration

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── Business Domain

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── Daily Metrics

Every warehouse record should ultimately resolve to:

- Organization
- Brand
- Studio
- Integration
- Business Domain
- Date

No workflow should require hardcoded IDs or studio-specific logic.

---

# Design Principles

Studio Intelligence follows these core principles.

- Configuration over hardcoding
- Warehouse-first architecture
- Business-domain modeling instead of vendor modeling
- Normalize before loading
- Preserve raw source data when practical
- One responsibility per workflow
- UPSERT instead of duplicate inserts
- Historical data is preserved
- Every workflow must support unlimited studios
- Every integration should be reusable
- Every ETL execution should be auditable
- Prefer direct APIs over limited connector nodes whenever possible

---

# Current Integrations

## Completed

✅ Google Analytics 4

Production ETL complete.

---

## In Development

🚧 Eulerity

Advertising ETL using internal APIs.

---

## Planned

- SOCi
- PTS
- Google Business Profile
- Weather
- Financial integrations
- AI Recommendation Engine

---

# Long-Term Vision

Studio Intelligence should become the operating system for multi-location experiential businesses.

Rather than simply reporting historical numbers, the platform should automatically collect operational, financial, and marketing data from every business system, unify it into a centralized warehouse, identify trends, forecast future performance, automate reporting, and provide AI-driven recommendations that help owners make better decisions every day.
