# Studio Intelligence Architecture

---

# Overview

Studio Intelligence is a multi-tenant business intelligence platform that consolidates marketing, operational, financial, and customer data into a centralized warehouse.

The platform is designed to support unlimited companies, unlimited studios, and unlimited integrations through a configuration-driven architecture.

The warehouse becomes the single source of truth for dashboards, APIs, reporting, and AI.

---

# Platform Architecture

```
                External Systems
────────────────────────────────────────────

Google Analytics 4
Eulerity
SOCi
PTS (Pinot Technical System)
Future Integrations

            │
            ▼

          n8n ETL

            │
            ▼

    Supabase Warehouse

            │
            ▼

 Executive Dashboards
 Studio Dashboards
 APIs
 AI Insights
 Forecasting
```

---

# Business Domains

Studio Intelligence organizes data by business domain rather than software vendor.

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

GA4 is the authoritative source for website behavior.

---

## Paid Marketing

Primary System

Eulerity

Channels

- Google Search
- Google Display
- Google Video (YouTube)
- Meta Social

Metrics

- Spend
- Clicks
- Impressions
- CPC
- CTR
- Campaign Performance

Eulerity is the authoritative source for paid advertising performance.

All Eulerity traffic is attributed within GA4 using Eulerity source/medium values.

---

## Local Marketing

Primary System

SOCi

Purpose

- Studio-specific Meta campaigns
- Local Facebook marketing
- Local Instagram marketing
- Community engagement

Future

- Reviews
- Reputation management
- Local listings

SOCi is the authoritative source for localized social marketing.

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

PTS is the authoritative source for studio operations and revenue.

---

# Standard ETL Architecture

Every integration follows the same architecture.

```
Configuration
      │
      ▼

Get Active Integrations

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

Dashboards
APIs
AI
```

This pattern ensures every integration behaves consistently regardless of data source.

---

# Warehouse Design

Warehouse tables are organized by source system.

Examples

- ga4_daily_metrics
- eulerity_daily_metrics
- soci_daily_metrics
- pts_daily_metrics

Business-facing dashboards should consume reporting views rather than raw source tables.

Examples

- marketing_daily_summary
- operations_daily_summary
- executive_daily_summary
- studio_daily_summary

---

# Multi-Tenant Model

Company

└── Studio

&nbsp;&nbsp;&nbsp;&nbsp;└── Integration

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── Daily Metrics

Every warehouse record should identify:

- Company
- Studio
- Integration
- Date

No workflow should require hardcoded IDs or studio-specific logic.

---

# Design Principles

Studio Intelligence follows these core principles.

- Configuration over hardcoding
- Warehouse-first architecture
- Normalize before loading
- One responsibility per workflow
- UPSERT instead of duplicate inserts
- Historical data is preserved
- Every workflow must support unlimited studios
- Every integration should be reusable
- Prefer direct APIs over limited connector nodes when flexibility or reliability is improved

---

# Current Integrations

## Completed

✅ Google Analytics 4

Production ETL complete.

---

## Planned

- Eulerity
- SOCi
- PTS
- Future financial integrations

---

# Long-Term Vision

Studio Intelligence should become the operating system for multi-location experiential businesses.

Rather than simply reporting historical numbers, the platform should automatically collect operational data, measure business performance, identify trends, forecast future results, and provide AI-driven recommendations that help owners make better decisions every day.
