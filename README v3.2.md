# Studio Intelligence

> **Studio Intelligence is a warehouse-first business intelligence platform that transforms disconnected business systems into a single intelligent operating system for multi-location experiential businesses.**

Rather than treating every software platform as its own reporting system, Studio Intelligence automatically collects, normalizes, stores, and analyzes business data from across the organization to create a single source of truth.

The platform powers executive dashboards, automated reporting, forecasting, business intelligence, and AI-driven recommendations from one centralized warehouse.

---

# Vision

Build the leading business intelligence platform for multi-location experiential businesses.

Studio Intelligence should answer not only **what happened**, but also:

- Why did it happen?
- What is likely to happen next?
- What should we do about it?
- What opportunities are we missing?

---

# Mission

Eliminate manual reporting by automatically collecting, transforming, warehousing, and interpreting operational data from every major business system.

Owners should spend their time making decisions—not gathering information.

---

# Current Status (Version 3.2)

The platform has successfully completed its foundational architecture and is now transitioning into business intelligence development.

## Operational Integrations

| Integration | Status | Method |
|-------------|--------|--------|
| Google Analytics 4 | ✅ Production | API |
| Eulerity | ✅ Production | Browser Automation |
| Meta Ads | ✅ Collection Layer Complete | Graph API |

## Current Sprint

- Meta Ads warehouse integration
- n8n ETL workflow
- Marketing reporting views
- Executive marketing dashboards

For implementation details see:

**CURRENT_STATUS.md**

---

# Core Principles

## Warehouse First

Every integration feeds a centralized warehouse.

Dashboards, AI, reporting, and automation consume warehouse reporting views—not raw source systems.

---

## Configuration Over Code

Businesses, studios, credentials, schedules, mappings, and integrations should be configurable whenever possible.

Adding new organizations should require configuration rather than software changes.

---

## Single Responsibility

Every layer owns one responsibility.

| Layer | Responsibility |
|--------|----------------|
| Collection | Gather data |
| ETL | Transform & normalize |
| Warehouse | Store historical data |
| Reporting Views | Produce business metrics |
| AI | Interpret business intelligence |

Responsibilities should never overlap.

---

## Reusable Architecture

Every integration should follow the same lifecycle and plug into the existing architecture without redesign.

Patterns are more valuable than one-off solutions.

---

# Platform Architecture

```text
Business Systems
        │
        ▼
+---------------------------+
| Collection Services       |
|                           |
| • Google Analytics 4      |
| • Eulerity                |
| • Meta Ads                |
| • Future Integrations     |
+---------------------------+
        │
        ▼
+---------------------------+
| n8n ETL                   |
| Validation                |
| Normalization             |
| Scheduling                |
| UPSERT                    |
+---------------------------+
        │
        ▼
+---------------------------+
| Supabase Data Warehouse   |
| Historical Storage        |
| Configuration             |
| Fact Tables              |
+---------------------------+
        │
        ▼
+---------------------------+
| Reporting Views           |
| Business Metrics          |
| Executive Summaries       |
+---------------------------+
        │
        ▼
+---------------------------+
| Dashboards               |
| Automation               |
| Artificial Intelligence  |
+---------------------------+
```

---

# Intelligence Domains

## Marketing Intelligence

- Paid Advertising
- Organic Social
- Google Analytics
- Creative Intelligence
- Local Presence

---

## Operations Intelligence

- Reservations
- Staffing
- Labor
- Scheduling
- Inventory

---

## Financial Intelligence

- Revenue
- Expenses
- Payroll
- Forecasting
- QuickBooks

---

## Customer Intelligence

- Customer Behavior
- Segmentation
- Lifetime Value
- Loyalty
- Attribution

---

## Executive Intelligence

- KPIs
- Benchmarking
- Forecasting
- Executive Dashboards
- AI Recommendations

---

# Technology Stack

## Collection Layer

### Playwright / Express

Responsibilities

- Browser automation
- Authentication
- Session management
- Report downloads
- API endpoints
- Structured JSON output

Hosted on Railway.

---

## ETL Layer

### n8n

Responsibilities

- Workflow orchestration
- Scheduling
- Data validation
- Data normalization
- Warehouse UPSERT
- Retry logic
- Monitoring

---

## Warehouse

### Supabase PostgreSQL

Responsibilities

- Configuration tables
- Historical fact storage
- Reporting views
- AI data source

---

## Source Control

- GitHub

---

# Current Repository Structure

```text
studio-intelligence/

docs/
│
├── README.md
├── PROJECT_BLUEPRINT.md
├── ARCHITECTURE.md
├── DEVELOPER_GUIDE.md
├── CURRENT_STATUS.md
├── ROADMAP.md
├── INTEGRATIONS.md
├── AI_GUIDE.md
└── CHANGELOG.md

playwright/
│
├── routes/
├── services/
│   ├── eulerity/
│   ├── ga4/
│   └── meta/
├── scripts/
├── server.js
└── .env

n8n/

supabase/

package.json
```

---

# Development Workflow

Every integration follows the same lifecycle.

1. Design the integration
2. Build the collection service
3. Validate locally
4. Deploy to Railway
5. Build the n8n ETL workflow
6. Create warehouse tables
7. Build reporting views
8. Expose data to AI

This workflow should be followed for every future integration.

---

# Documentation Guide

Read the documentation in this order.

| Document | Purpose |
|----------|---------|
| README.md | Project overview |
| PROJECT_BLUEPRINT.md | Long-term vision |
| ARCHITECTURE.md | System architecture |
| DEVELOPER_GUIDE.md | Development standards |
| CURRENT_STATUS.md | Current implementation |
| ROADMAP.md | Future milestones |
| INTEGRATIONS.md | Integration catalog |
| AI_GUIDE.md | AI context |
| CHANGELOG.md | Project history |

---

# Design Philosophy

Studio Intelligence is **not** simply a reporting application.

It is intended to become the operating system for running a multi-location experiential business.

Individual software platforms become data sources.

The warehouse becomes the single source of truth.

Reporting views generate business intelligence.

Automation executes operational tasks.

Artificial Intelligence interprets business performance and recommends actions.

Every architectural decision should strengthen this ecosystem rather than create isolated solutions.

---

# Roadmap

## Marketing Intelligence (Current)

- Google Analytics 4
- Eulerity
- Meta Ads
- Marketing reporting
- Executive dashboards

## Operations Intelligence

- Reservations
- POS
- Labor
- Inventory

## Financial Intelligence

- QuickBooks
- Payroll
- Expenses
- Forecasting

## Customer Intelligence

- CRM
- Customer Lifetime Value
- Attribution
- Loyalty

## Executive Intelligence

- KPI Dashboards
- Predictive Forecasting
- AI Recommendations
- Automated Decision Support

---

# Long-Term Vision

Studio Intelligence will provide a unified intelligence platform capable of:

- Automatically collecting business data
- Maintaining complete historical records
- Producing executive dashboards
- Detecting trends and anomalies
- Forecasting future performance
- Recommending business actions
- Automating operational workflows
- Powering AI-driven decision making

The long-term goal is simple:

**One warehouse. One reporting layer. One AI. Complete business intelligence.**