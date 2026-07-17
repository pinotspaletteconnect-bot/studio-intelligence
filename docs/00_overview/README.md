# Studio Intelligence

> **Studio Intelligence is a warehouse-first business intelligence platform designed to become the operating system for multi-location experiential businesses.**

Studio Intelligence centralizes operational, marketing, financial, and customer data into a unified data warehouse where it can be analyzed, visualized, automated, and interpreted by AI.

Rather than treating each software platform as a separate reporting system, Studio Intelligence creates a **single source of truth** that powers dashboards, executive reporting, forecasting, and intelligent recommendations.

---

# Vision

Build the leading business intelligence platform for multi-location experiential businesses by unifying data from every operational system into one intelligent platform.

Studio Intelligence should answer not only **what happened**, but also:

* Why did it happen?
* What is likely to happen next?
* What actions should be taken?
* What opportunities are being missed?

---

# Mission

Eliminate manual reporting by automatically collecting, normalizing, warehousing, and analyzing business data from every major operational system.

Studio Intelligence enables owners and operators to spend less time gathering information and more time making informed decisions.

---

# Core Principles

### Warehouse First

All integrations feed a centralized warehouse.

Dashboards, AI, reporting, and automation consume warehouse reporting views—not raw source systems.

---

### Configuration Over Code

Studios, organizations, credentials, external IDs, schedules, and integrations should be configurable rather than hardcoded.

The platform should support new businesses primarily through configuration instead of software changes.

---

### Single Responsibility

Each component owns one responsibility.

* **Collection Layer** gathers data.
* **ETL Layer** transforms data.
* **Warehouse** stores data.
* **Reporting Views** generate business metrics.
* **AI** consumes reporting views.

Responsibilities should never overlap.

---

### Reusable Architecture

Every new integration should plug into the existing architecture without redesigning the platform.

Patterns should be reusable across all future integrations.

---

# Platform Architecture

```text
External Systems
        │
        ▼
Collection Layer
(API Clients / Playwright)
        │
        ▼
ETL Layer (n8n)
        │
        ▼
Supabase Data Warehouse
        │
        ▼
SQL Reporting Views
        │
        ▼
Dashboards • Automation • AI
```

---

# Intelligence Domains

Studio Intelligence is organized into business intelligence domains rather than individual integrations.

## Marketing Intelligence

* Paid Advertising
* Organic Social
* Web Analytics
* Creative Intelligence
* Local Presence

## Operations Intelligence

* Reservations
* Staffing
* Labor
* Scheduling
* Inventory

## Financial Intelligence

* Revenue
* Expenses
* Payroll
* Forecasting

## Customer Intelligence

* Customer Behavior
* Retention
* Lifetime Value
* Loyalty

## Executive Intelligence

* KPIs
* Benchmarking
* Forecasting
* Recommendations
* AI Decision Support

---

# Current Technology Stack

## Orchestration

* n8n

Responsibilities:

* Scheduling
* Workflow orchestration
* ETL
* Retry logic
* Auditing
* API orchestration

---

## Collection Layer

### Playwright

Technology

* Node.js
* Express
* Playwright

Hosted on Railway

Responsibilities

* Browser automation
* Authentication
* Session management
* Navigation
* Report downloads
* Structured data extraction

Playwright **does not** normalize data or write to the warehouse.

---

## Warehouse

Supabase (PostgreSQL)

Responsibilities

* Configuration
* Data warehouse
* Historical storage
* Reporting views
* AI data source

---

## Source Control

GitHub

Repository

```
studio-intelligence
```

---

# Current Production Status

## Platform

* ✅ GitHub Repository
* ✅ Railway Deployment
* ✅ Docker Deployment
* ✅ Express API
* ✅ Remote Playwright Execution
* ✅ n8n Integration
* ✅ Supabase Warehouse

---

## Production Integrations

### GA4

Status

✅ Operational

---

### Eulerity

Status

✅ Production Ready

Capabilities

* Login automation
* Session persistence
* Multi-studio processing
* Metrics collection
* Spend collection
* Budget allocation
* Warehouse ingestion
* Daily normalization

---

### Weather

Status

✅ Warehouse Ready

---

# Current Development Focus

The platform has transitioned from infrastructure development into business intelligence development.

Current priorities include:

* Marketing reporting views
* Meta Business integration
* Creative Intelligence foundation
* Executive reporting
* AI-ready datasets

---

# Repository Structure

```text
studio-intelligence/

docs/
    README.md
    PROJECT_BLUEPRINT.md
    ARCHITECTURE.md
    DATA_MODEL.md
    DEVELOPER_GUIDE.md
    CURRENT_STATUS.md
    ROADMAP.md
    INTEGRATIONS.md
    AI_GUIDE.md
    CHANGELOG.md

playwright/
    auth/
    downloads/
    routes/
    scripts/
    services/
    utils/
    server.js
```

---

# Documentation Guide

| Document             | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| PROJECT_BLUEPRINT.md | Long-term vision and business objectives         |
| ARCHITECTURE.md      | Overall system architecture                      |
| DATA_MODEL.md        | Warehouse schema and relationships               |
| DEVELOPER_GUIDE.md   | Development standards and architecture rules     |
| CURRENT_STATUS.md    | Current sprint and implementation status         |
| ROADMAP.md           | Planned milestones and future work               |
| INTEGRATIONS.md      | Integration catalog and implementation details   |
| AI_GUIDE.md          | Context for AI assistants working on the project |
| CHANGELOG.md         | Project history and release notes                |

---

# Design Philosophy

Studio Intelligence is **not** a reporting application.

It is an operating system for multi-location experiential businesses.

Integrations are simply data sources.

The warehouse is the single source of truth.

Reporting views transform raw data into business intelligence.

Automation acts on that intelligence.

AI interprets the results and recommends actions.

Every architectural decision should move the platform toward a unified, configuration-driven ecosystem capable of collecting, organizing, understanding, and acting upon business data.

---

# Long-Term Vision

Studio Intelligence will enable businesses to connect every operational system into a single intelligent platform capable of:

* Collecting data automatically
* Preserving complete historical records
* Producing real-time executive dashboards
* Detecting trends and anomalies
* Forecasting future performance
* Recommending business actions
* Automating operational workflows
* Powering AI-driven decision making

The ultimate objective is to provide business owners with one place to understand what is happening across their organization, why it is happening, what is likely to happen next, and what actions should be taken.
