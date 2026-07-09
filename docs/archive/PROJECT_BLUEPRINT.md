Studio Intelligence Project Blueprint
Vision

Studio Intelligence is a multi-tenant Business Intelligence and AI platform designed to consolidate every aspect of business operations into a single source of truth.

Rather than replacing existing business systems, Studio Intelligence treats each platform as the authoritative source for the data it owns. Marketing, reservations, sales, operations, financial, and customer data are continuously collected into a centralized data warehouse where historical trends, cross-platform relationships, and AI-driven insights can be generated.

The platform is designed around historical time-series data, allowing every metric to be analyzed not only as its current value, but also as how it changes over time.

While the first implementation is being built for Pinot's Palette, the architecture is designed to support any multi-location business without redesign.

Mission

Eliminate manual reporting.

Create a single source of truth that connects data across every business system.

Provide owners and operators with a complete understanding of:

-What is happening.
-Why it is happening.
-What is likely to happen next.
-What actions should be taken.

Studio Intelligence should become the operating system for running a business, transforming raw operational data into actionable intelligence.

Core Architecture Principles
Source Ownership

Each external platform remains the system of record for the information it owns.

Examples include:

-Google Analytics 4 — Website traffic, attribution, and conversions.
-Eulerity — Paid advertising performance and spend.
-Meta Business Manager — Organic social media performance.
-POS/Reservations — Revenue, customers, and bookings.
-Accounting Software — Financial reporting.
-Other future integrations as appropriate.

Studio Intelligence does not replace these systems. It unifies them.

Historical First

Whenever practical, data is collected as historical snapshots instead of only current values.

Examples include:

-Daily advertising metrics.
-Daily social media metrics.
-Daily revenue.
-Daily reservation activity.
-Daily customer growth.

Maintaining historical records enables trend analysis, forecasting, anomaly detection, seasonality analysis, and long-term AI learning.

Marketing Intelligence

Marketing data is organized into distinct domains rather than treating every marketing platform as a single source.

Organic Social

Measures how content performs naturally.

Examples:

-Reach
-Impressions
-Engagement
-Shares
-Saves
-Comments
-Followers
-Video performance

Primary source: Meta Business Manager (and future platform-specific APIs).

Paid Advertising

Measures advertising efficiency and return on investment.

Examples:

-Spend
-Clicks
-CPC
-CPM
-CTR
-Conversions
-ROAS

Primary source: Eulerity (with future expansion where appropriate).

Creative Intelligence

Creative assets are treated as reusable business objects that may appear across multiple channels.

A single creative may be used in:

-Organic Facebook
-Organic Instagram
-Organic TikTok
-Paid Meta campaigns
-Email marketing
-Website promotions
-Other future channels

Studio Intelligence will analyze creative performance across all distribution channels and correlate that performance with business outcomes such as reservations, revenue, customer acquisition, and engagement.

Project Goals
Operational Goals
-Replace manual reporting with automated ETL pipelines.
-Centralize all business data.
-Maintain complete historical records.
-Support unlimited companies and locations.
-Minimize maintenance through configuration-driven architecture.
-Build reusable, modular data pipelines.
Business Goals
-Increase revenue.
-Improve marketing ROI.
-Improve labor planning.
-Improve customer retention.
-Reduce operating costs.
-Improve decision making.
-Connect marketing performance directly to business outcomes.
AI Goals
-Daily executive summaries.
-Trend detection.
-Forecasting.
-Marketing recommendations.
-Operational recommendations.
-Automated anomaly detection.
-Conversational reporting.
-Creative performance analysis.
-Cross-platform attribution.
-Predictive business insights.

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
- Meta Business

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

Source	               System of Record
GA4	Website            behavior & conversions
Eulerity	           Paid advertising metrics
Meta Business Manager  Organic social performance
SOCi	               Publishing workflow
PTS	                   Revenue & reservations

That principle will keep us from accidentally duplicating metrics later.

Future Modules

- Accounting Intelligence
    - QuickBooks Automation
    - Expense Intelligence
    - Receipt OCR
    - AI Categorization