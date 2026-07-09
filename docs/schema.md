# Studio Intelligence Schema
**Version 3.0**

**Last Updated:** July 9, 2026

---

# Purpose

This document defines the logical warehouse schema for Studio Intelligence.

Unlike DATA_MODEL.md, which explains the conceptual organization of the warehouse, this document catalogs the actual database tables, their purpose, ownership, and relationships.

This document should be updated whenever a new table is added or removed.

---

# Schema Organization

The warehouse is organized into the following categories:

- Configuration
- Dimensions
- Facts
- Reporting Views

---

# Configuration Tables

These tables define the structure of the business.

---

## organizations

**Purpose**

Top-level business organization.

**Primary Key**

id

**Relationships**

1 → Many brands

---

## brands

**Purpose**

Brand owned by an organization.

**Primary Key**

id

**Foreign Keys**

organization_id

---

## studios

**Purpose**

Individual business locations.

**Primary Key**

id

**Foreign Keys**

brand_id

organization_id

---

## studio_integrations

**Purpose**

Defines which integrations are enabled for each studio.

**Primary Key**

id

**Foreign Keys**

studio_id

---

## integration_runs

**Purpose**

Audit trail of integration executions.

**Primary Key**

id

**Foreign Keys**

studio_id

integration_id (future)

---

# Dimension Tables

Dimension tables describe business entities.

---

## dim_campaigns

Status

Planned

---

## dim_creative_assets

Status

Planned

---

## dim_products

Status

Planned

---

## dim_customers

Status

Planned

---

## dim_staff

Status

Planned

---

# Fact Tables

Fact tables contain measurable business events.

---

## Marketing Intelligence

### ga4_daily_metrics

**Grain**

One row per Studio + Day

**Purpose**

Daily website analytics.

Status

Production

---

### eulerity_daily_metrics

**Grain**

One row per Studio + Day

**Purpose**

Daily advertising performance.

Status

Production

---

### eulerity_daily_spend

**Grain**

One row per Studio + Day + Campaign

**Purpose**

Advertising spend.

Status

Production

---

### eulerity_daily_budget_allocation

**Grain**

One row per Studio + Day

**Purpose**

Budget allocation percentages.

Status

Production

---

### weather_daily

**Grain**

One row per Studio + Day

**Purpose**

Historical weather conditions.

Status

Schema Complete

Integration Pending

---

### meta_daily_metrics

Status

Planned

---

### meta_posts

Status

Planned

---

### meta_post_metrics

Status

Planned

---

### meta_story_metrics

Status

Planned

---

### meta_reels

Status

Planned

---

# Operations Intelligence

## reservations

Status

Planned

---

## labor_daily

Status

Planned

---

## inventory_daily

Status

Planned

---

## sales_daily

Status

Planned

---

# Financial Intelligence

## revenue_daily

Status

Planned

---

## payroll_daily

Status

Planned

---

## expenses_daily

Status

Planned

---

# Customer Intelligence

## customer_visits

Status

Planned

---

## customer_lifetime_value

Status

Planned

---

## marketing_attribution

Status

Planned

---

# Reporting Views

Reporting Views should be the primary interface used by dashboards and AI.

---

## marketing_daily_summary

Status

Planned

---

## marketing_weekly_summary

Status

Planned

---

## operations_daily_summary

Status

Planned

---

## executive_summary

Status

Planned

---

## customer_summary

Status

Planned

---

# Naming Standards

Configuration

Plural nouns

Example

organizations

---

Dimensions

Prefix

dim_

Example

dim_customers

---

Facts

source_grain_subject

Examples

ga4_daily_metrics

meta_post_metrics

eulerity_daily_spend

---

Reporting Views

Business-oriented names.

Examples

marketing_daily_summary

executive_summary

studio_summary

---

# Grain Standards

Every fact table should clearly define its grain.

Examples

GA4

Studio + Day

Eulerity Metrics

Studio + Day

Eulerity Spend

Studio + Day + Campaign

Meta Posts

Studio + Post

Reservations

Studio + Reservation

Sales

Studio + Transaction

---

# Status Legend

| Status | Meaning |
|---------|---------|
| Planned | Designed but not started |
| In Development | Currently being built |
| Production | Fully operational |
| Deprecated | Scheduled for removal |

---

# Current Warehouse Summary

| Category | Count |
|----------|------:|
| Configuration Tables | 5 |
| Dimension Tables | 0 |
| Fact Tables | 5 Production |
| Reporting Views | 0 |

This document should always reflect the current warehouse implementation.