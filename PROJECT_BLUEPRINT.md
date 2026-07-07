# Studio Intelligence Project Blueprint

---

# Vision

Studio Intelligence is a multi-tenant Business Intelligence and AI platform designed to consolidate every aspect of business operations into a single source of truth.

The platform will aggregate marketing, reservations, sales, operations, financial, and customer data from multiple systems into a centralized warehouse where it can be analyzed, visualized, and interpreted by AI.

While the first implementation is being built for Pinot's Palette, the architecture is designed to support any multi-location business without redesign.

---

# Mission

Eliminate manual reporting.

Provide owners and operators with a complete understanding of what is happening, why it is happening, what is likely to happen next, and what actions should be taken.

Studio Intelligence should become the operating system for running a business.

---

# Project Goals

## Operational Goals

- Replace manual reporting with automated ETL pipelines.
- Centralize all business data.
- Maintain complete historical records.
- Support unlimited companies and studios.
- Minimize maintenance through configuration-driven architecture.

## Business Goals

- Increase revenue.
- Improve marketing ROI.
- Reduce operating costs.
- Improve labor planning.
- Improve customer retention.
- Improve decision making.

## AI Goals

- Daily executive summaries.
- Trend detection.
- Forecasting.
- Marketing recommendations.
- Operational recommendations.
- Automated anomaly detection.
- Conversational reporting.

---

# Current Status

## Phase 1 — Foundation

Status: ✅ COMPLETE

Completed:

- Supabase data warehouse
- Multi-tenant database design
- Studio configuration system
- Active Integration discovery
- Dynamic Google Analytics Data API integration
- Production GA4 ETL pipeline
- Historical data warehouse
- Dynamic Property ID support
- Daily UPSERT processing

The project now has its first production-quality ETL pipeline and a reusable architecture for all future integrations.

---

# Core Principles

## Configuration over Hardcoding

Every integration should be driven from configuration stored in Supabase rather than workflow edits.

---

## Warehouse First

All reporting originates from the warehouse—not directly from external APIs.

---

## Normalize Before Loading

External APIs return inconsistent formats.

Every integration should normalize its data before writing to the warehouse.

---

## Small Reusable ETL Pipelines

Each workflow has a single responsibility.

Example:

- Google Analytics
- Google Ads
- Meta
- Eulerity
- Reservations

rather than one massive workflow.

---

## Multi-Tenant by Design

Every workflow must support:

- Unlimited companies
- Unlimited studios
- Unlimited integrations

without modification.

---

## Historical Data is Permanent

Warehouse data should never be deleted or overwritten unnecessarily.

Historical reporting is a primary design goal.

---

# Platform Architecture

The technical architecture is documented separately in:

ARCHITECTURE.md

The standard ETL pattern is:

Configuration

↓

Get Active Integrations

↓

Loop Through Studios

↓

API Request

↓

Normalize

↓

Warehouse UPSERT

↓

Dashboards / AI

Every future integration must follow this architecture.

---

# Data Domains

The warehouse will eventually contain data across multiple business domains.

## Marketing

- Google Analytics 4
- Google Ads
- Meta Ads
- Eulerity
- SOCi

## Operations

- Reservations
- Attendance
- Instructor utilization
- Private events
- Mobile events

## Revenue

- Class sales
- Retail sales
- Bar sales
- Food sales
- Candle sales
- Gift cards

## Financial

- Accounting
- Payroll
- Banking
- Royalties

## Customer

- Lifetime value
- Repeat visits
- Membership
- Reviews

## External

- Weather
- Tourism
- Local events
- Holiday calendars

---

# Development Phases

## Phase 1 ✅ COMPLETE

Foundation

- Supabase
- Multi-tenant architecture
- Configuration system
- Google Analytics ETL
- Historical warehouse

---

## Phase 2

Marketing ETLs

- Google Ads
- Meta
- Eulerity
- SOCi

---

## Phase 3

Operational ETLs

- Reservation System
- POS
- Inventory
- Product Sales

---

## Phase 4

Reporting

- Executive Dashboard
- Studio Dashboard
- Marketing Dashboard
- Operational Dashboard

---

## Phase 5

Artificial Intelligence

- Daily executive briefing
- Forecasting
- Marketing recommendations
- Operational recommendations
- Staffing recommendations
- Revenue forecasting
- Conversational analytics

---

# Success Criteria

Studio Intelligence is considered successful when:

✓ Manual reporting has been eliminated.

✓ Every studio updates automatically.

✓ Historical data is preserved indefinitely.

✓ Dashboards update without manual intervention.

✓ AI produces actionable business recommendations.

✓ New integrations can be added without redesign.

✓ A new company can be onboarded through configuration alone.

---

# Long-Term Vision

Studio Intelligence should evolve into the operating system for experiential businesses.

Rather than simply reporting historical numbers, the platform should explain why results occurred, predict future performance, recommend actions, and automate operational decisions using AI.

The architecture should continue to scale without redesign as additional companies, studios, integrations, and AI capabilities are added.
Future Modules

- Accounting Intelligence
    - QuickBooks Automation
    - Expense Intelligence
    - Receipt OCR
    - AI Categorization