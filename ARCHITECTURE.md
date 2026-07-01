# Architecture

## Vision

Studio Intelligence is a multi-tenant business intelligence platform designed to aggregate operational, marketing, financial, and customer data for multiple businesses into a centralized warehouse.

---

# Core Architecture

```
          External Systems
──────────────────────────────────────

Google Analytics 4
Google Ads
Meta Ads
Eulerity
Reservation System
POS
Accounting
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

# Standard ETL Pattern

Every integration must follow the same pattern.

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
Reporting / AI
```

This architecture allows every integration to be configuration-driven without hardcoded studio IDs, API keys, or Property IDs.

---

# Multi-Tenant Data Model

Company
    └── Studio
            └── Integration
                    └── Daily Metrics

Every warehouse record should identify:

- Company
- Studio
- Integration
- Date

This allows the platform to support unlimited companies and studios.

---

# Warehouse Design

The warehouse is organized into subject-area tables.

Examples

ga4_daily_metrics

google_ads_daily_metrics

meta_daily_metrics

eulerity_daily_metrics

reservation_daily_metrics

sales_daily_metrics

Each table owns one business domain.

---

# Design Principles

• Configuration over hardcoding

• Small ETL pipelines with one responsibility

• Normalize before loading

• UPSERT instead of duplicate inserts

• HTTP APIs preferred over limited n8n nodes when flexibility or reliability is improved

• Every workflow should be reusable across unlimited studios

---

# Current State

Completed

✓ Multi-tenant configuration database

✓ Active integration discovery

✓ Dynamic Google Analytics Data API integration

✓ Production GA4 ETL

✓ Historical warehouse

Next

Google Ads ETL

Meta ETL

Eulerity ETL

Reservation System ETL

Executive Dashboards

AI Insights
