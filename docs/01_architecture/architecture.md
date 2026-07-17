# Studio Intelligence Architecture

**Version 3.0**

**Last Updated:** July 9, 2026

---

# Purpose

This document defines the technical architecture of Studio Intelligence.

It describes how data flows through the platform, how responsibilities are divided, and the architectural principles that guide implementation.

If implementation decisions conflict with this document, the architecture should take precedence.

---

# Architectural Philosophy

Studio Intelligence follows a warehouse-first architecture.

External systems are responsible for generating business data.

Studio Intelligence is responsible for collecting, normalizing, warehousing, analyzing, and presenting that data.

Every component in the platform owns a single responsibility.

---

# High-Level Architecture

```text
┌────────────────────────────┐
│    External Systems         │
│                            │
│ GA4                        │
│ Meta Business              │
│ Eulerity                   │
│ Google Business Profile    │
│ Weather                    │
│ POS Systems                │
│ Labor Systems              │
│ Inventory Systems          │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│    Collection Layer         │
│                            │
│ API Clients                │
│ Playwright Automation      │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│       ETL Layer             │
│                            │
│ n8n Workflows              │
│ Validation                 │
│ Normalization              │
│ Transformation             │
│ Auditing                   │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│   Supabase Warehouse        │
│                            │
│ Configuration Tables       │
│ Fact Tables               │
│ Dimension Tables          │
│ Historical Data           │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│   SQL Reporting Views       │
│                            │
│ Marketing                 │
│ Operations                │
│ Financial                 │
│ Executive                 │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│   Consumers                 │
│                            │
│ Dashboards                │
│ Reports                   │
│ Automation                │
│ Artificial Intelligence   │
└────────────────────────────┘
```

---

# Component Responsibilities

Every component owns exactly one responsibility.

No responsibility should exist in multiple places.

---

# Collection Layer

Purpose:

Collect raw business data.

Technologies:

* Playwright
* API Clients
* Webhooks
* File Imports

Responsibilities:

* Authentication
* Browser automation
* API communication
* Session management
* Report downloads
* Structured data extraction

Collection does **not**:

* Normalize data
* Perform calculations
* Write database records
* Understand warehouse schemas
* Apply business logic

---

# ETL Layer

Technology:

* n8n

Purpose:

Transform collected data into warehouse-ready records.

Responsibilities:

* Scheduling
* Workflow orchestration
* File parsing
* Data validation
* Data normalization
* Calculations
* UPSERT logic
* Error handling
* Retry logic
* Integration auditing
* Temporary file cleanup

The ETL layer is responsible for converting source-specific formats into standardized warehouse structures.

---

# Warehouse Layer

Technology:

* Supabase PostgreSQL

Purpose:

Store all historical business information.

Responsibilities:

* Configuration
* Historical storage
* Warehouse schema
* Data integrity
* Security
* AI source data

The warehouse should preserve historical information whenever possible.

---

# Reporting Layer

Purpose:

Convert warehouse data into business intelligence.

Reporting views:

* Join multiple sources
* Calculate KPIs
* Generate executive metrics
* Standardize business reporting

Consumers should query reporting views instead of raw fact tables whenever possible.

---

# AI Layer

Artificial intelligence should consume reporting views rather than raw warehouse tables.

AI responsibilities include:

* Trend analysis
* Executive summaries
* Forecasting
* Recommendations
* Business insights
* Natural language interaction

AI should never rely on source-specific data structures.

---

# Intelligence Domains

Studio Intelligence organizes information into business domains.

## Marketing Intelligence

Sources include:

* GA4
* Eulerity
* Meta Business
* Google Business Profile
* SOCi
* Weather

Primary objectives:

* Marketing performance
* Attribution
* Creative performance
* Campaign analysis
* ROI

---

## Operations Intelligence

Sources include:

* Reservations
* POS
* Labor
* Inventory
* Scheduling

Primary objectives:

* Capacity
* Utilization
* Staffing
* Operational efficiency

---

## Financial Intelligence

Sources include:

* Revenue
* Expenses
* Payroll
* Budgets

Primary objectives:

* Profitability
* Forecasting
* Financial performance

---

## Customer Intelligence

Sources include:

* CRM
* Reservations
* Marketing
* Loyalty

Primary objectives:

* Customer lifetime value
* Retention
* Segmentation
* Behavior analysis

---

## Executive Intelligence

Consumes every domain.

Primary objectives:

* KPI reporting
* Cross-domain insights
* Benchmarking
* Forecasting
* Recommendations

---

# Data Flow

Every integration follows the same lifecycle.

```text
Collect

↓

Validate

↓

Normalize

↓

Warehouse

↓

Reporting Views

↓

Dashboards

↓

Automation

↓

AI
```

Every integration should fit this pipeline without redesign.

---

# Integration Pattern

Each integration should follow the same architecture.

1. Authenticate
2. Collect source data
3. Return structured data
4. Normalize in ETL
5. UPSERT warehouse
6. Build reporting views
7. Expose to AI

This pattern applies whether the integration uses Playwright, APIs, or webhooks.

---

# Configuration Philosophy

Business configuration belongs in the warehouse.

Examples include:

* Organizations
* Brands
* Studios
* Integration settings
* External IDs
* Feature flags
* Scheduling rules

Infrastructure secrets may remain outside the warehouse when appropriate.

The objective is to minimize hardcoded business logic.

---

# Historical Data Strategy

Studio Intelligence is designed to preserve business history.

Historical information enables:

* Trend analysis
* Forecasting
* Benchmarking
* AI learning
* Executive reporting

Warehouse tables should preserve historical records whenever practical.

---

# Scalability Goals

The platform should support:

* Unlimited organizations
* Unlimited brands
* Unlimited studio locations
* Unlimited integrations
* Unlimited historical records

without requiring architectural redesign.

---

# Architectural Rules

The following principles are considered permanent.

* Warehouse-first architecture
* Configuration over hardcoding
* Single responsibility
* Historical preservation
* One integration pattern
* Reporting views as the business layer
* AI consumes reporting views
* Integrations plug into the existing platform rather than modifying it

These principles should guide every future architectural decision.
