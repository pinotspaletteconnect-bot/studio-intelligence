# Studio Intelligence Integrations

**Version 3.0**

**Last Updated:** July 9, 2026

---

# Purpose

This document provides an inventory of all current and planned integrations supported by Studio Intelligence.

It defines:

* Business purpose
* Data collection method
* Refresh strategy
* Warehouse ownership
* Reporting scope
* Development status

All integrations should follow the standard Studio Intelligence integration lifecycle described in the Architecture and Developer Guide.

---

# Integration Lifecycle

Every integration follows the same pattern.

```text
Authenticate
        │
        ▼
Collect Data
        │
        ▼
Return Structured Data
        │
        ▼
ETL Normalization
        │
        ▼
Warehouse UPSERT
        │
        ▼
Reporting Views
        │
        ▼
Dashboards / AI
```

No integration should bypass this workflow.

---

# Integration Status

| Integration             | Domain                  | Collection   | Status       |
| ----------------------- | ----------------------- | ------------ | ------------ |
| GA4                     | Marketing Intelligence  | API          | ✅ Production |
| Eulerity                | Marketing Intelligence  | Playwright   | ✅ Production |
| Weather                 | Marketing Intelligence  | API          | Planned      |
| Meta Business           | Marketing Intelligence  | Graph API    | 🚧 Next      |
| Google Business Profile | Marketing Intelligence  | API          | Planned      |
| SOCi                    | Marketing Intelligence  | API          | Planned      |
| POS                     | Operations Intelligence | API / Export | Planned      |
| Labor                   | Operations Intelligence | API          | Planned      |
| Inventory               | Operations Intelligence | API          | Planned      |
| CRM                     | Customer Intelligence   | API          | Planned      |
| Accounting              | Financial Intelligence  | API          | Planned      |

---

# Marketing Intelligence

## Google Analytics 4 (GA4)

### Purpose

Provide website traffic, acquisition, engagement, and conversion metrics.

### Collection Method

Google Analytics Data API

### Refresh Frequency

Daily

### Warehouse Tables

* ga4_daily_metrics

### Reporting Views

* marketing_daily_summary
* executive_summary

### Status

✅ Production

---

## Eulerity

### Purpose

Collect paid advertising performance and advertising spend.

### Collection Method

Playwright Browser Automation

### Current Features

* Authentication
* Session persistence
* Multi-studio processing
* Metrics collection
* Spend collection
* Budget allocation
* Warehouse ingestion

### Warehouse Tables

* eulerity_daily_metrics
* eulerity_daily_spend
* eulerity_daily_budget_allocation

### Reporting Views

* marketing_daily_summary

### Status

✅ Production

Future Enhancements

* Historical backfill
* Integration auditing
* Campaign-level reporting enhancements

---

## Meta Business

### Purpose

Provide organic Facebook and Instagram performance.

### Collection Method

Meta Graph API

### Planned Data

Daily page metrics

Posts

Reels

Stories

Followers

Engagement

Reach

Creative performance

### Planned Warehouse Tables

* meta_daily_metrics
* meta_posts
* meta_post_metrics
* meta_story_metrics
* meta_reels

### Reporting Views

* marketing_daily_summary
* creative_summary

### Status

🚧 Next Development Priority

---

## Google Business Profile

### Purpose

Track local search visibility and customer interactions.

### Planned Data

* Profile views
* Website clicks
* Calls
* Direction requests
* Reviews
* Review responses

### Status

Planned

---

## SOCi

### Purpose

Support additional social publishing and local marketing data where required.

SOCi is considered a supplemental marketing integration rather than the primary source of truth for organic social performance.

### Status

Planned

---

# Operations Intelligence

## Point of Sale (POS)

Purpose

Revenue

Transactions

Products

Add-ons

Guest purchases

Status

Planned

---

## Reservations

Purpose

Reservations

Attendance

Capacity

Booking trends

Status

Planned

---

## Labor

Purpose

Scheduling

Time tracking

Payroll inputs

Labor utilization

Status

Planned

---

## Inventory

Purpose

Inventory movement

Consumption

Purchasing

Shrinkage

Status

Planned

---

# Customer Intelligence

## CRM

Purpose

Customer history

Retention

Lifetime value

Segmentation

Marketing attribution

Status

Planned

---

# Financial Intelligence

## Accounting

Purpose

Financial statements

Expenses

General ledger

Payroll

Forecasting

Status

Planned

---

# Collection Methods

Studio Intelligence supports multiple collection strategies.

| Method             | Example             |
| ------------------ | ------------------- |
| REST API           | GA4                 |
| Graph API          | Meta Business       |
| Browser Automation | Eulerity            |
| Webhooks           | Future integrations |
| CSV Imports        | Legacy systems      |

Regardless of collection method, all integrations follow the same ETL pipeline.

---

# Integration Standards

Every integration should:

* Support historical imports whenever practical.
* Preserve historical warehouse records.
* Normalize source-specific field names.
* Use configuration rather than hardcoded values.
* Record integration audit information.
* Expose data through reporting views.
* Be consumable by AI without source-specific knowledge.

---

# Future Integrations

Potential future integrations include:

Marketing

* Google Ads
* Meta Ads
* Microsoft Ads
* TikTok
* Pinterest
* LinkedIn

Operations

* Toast
* Square
* Shopify
* Clover

Financial

* QuickBooks
* Xero
* Stripe

Customer

* HubSpot
* Salesforce
* Mailchimp
* Constant Contact

The architecture is intentionally designed so that new integrations can be added through configuration and standard implementation patterns rather than platform redesign.
