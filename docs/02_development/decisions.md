# Studio Intelligence Architecture Decisions

**Version 1.0**

**Last Updated:** July 9, 2026

---

# Purpose

This document records significant architectural and design decisions made during the development of Studio Intelligence.

The purpose is to preserve the reasoning behind important decisions so they are not repeatedly revisited or unintentionally reversed.

When proposing architectural changes, developers and AI assistants should review this document first.

A decision should only be reconsidered when business requirements have materially changed.

---

# Decision Format

Each decision contains:

* Decision
* Status
* Rationale
* Consequences

---

# SI-001 — Warehouse-First Architecture

**Status:** Accepted

## Decision

Studio Intelligence will use a warehouse-first architecture.

All integrations will collect and normalize data into a centralized warehouse before reporting or AI consumption.

## Rationale

A centralized warehouse provides:

* A single source of truth
* Historical data preservation
* Cross-domain reporting
* Simplified AI access
* Consistent business metrics

## Consequences

Every integration must populate the warehouse.

Reporting and AI should not consume raw source systems.

---

# SI-002 — Reporting Views are the Business Layer

**Status:** Accepted

## Decision

Business reporting will be generated from SQL reporting views rather than raw warehouse tables.

## Rationale

Reporting views:

* Standardize business metrics
* Hide warehouse complexity
* Simplify dashboards
* Provide consistent KPIs
* Improve AI data quality

## Consequences

Dashboards and AI should consume reporting views whenever practical.

---

# SI-003 — Single Responsibility Architecture

**Status:** Accepted

## Decision

Each platform component owns one responsibility.

| Component  | Responsibility                 |
| ---------- | ------------------------------ |
| Collection | Retrieve data                  |
| ETL        | Normalize data                 |
| Warehouse  | Store data                     |
| Reporting  | Calculate business metrics     |
| AI         | Interpret business information |

## Rationale

Separating responsibilities simplifies maintenance and improves scalability.

## Consequences

Business logic should not be duplicated across components.

---

# SI-004 — Playwright is Collection Only

**Status:** Accepted

## Decision

Playwright is responsible only for browser automation and structured data collection.

## Rationale

Keeping browser automation independent from ETL allows the same collection layer to support multiple downstream workflows.

## Consequences

Playwright should never:

* Write directly to the warehouse
* Normalize business data
* Perform warehouse calculations
* Understand reporting requirements

---

# SI-005 — n8n Owns ETL

**Status:** Accepted

## Decision

All normalization, calculations, UPSERT logic, retry handling, and auditing belong in n8n.

## Rationale

ETL is easier to modify, monitor, and reuse when centralized.

## Consequences

Collection layers remain simple and reusable.

---

# SI-006 — Configuration Over Hardcoding

**Status:** Accepted

## Decision

Business configuration should be stored centrally rather than hardcoded into application logic.

## Rationale

Supports:

* Multi-location businesses
* Multi-tenant architecture
* Easier maintenance
* Simpler onboarding

## Consequences

Organizations, studios, integrations, credentials, schedules, and feature flags should be configuration-driven.

---

# SI-007 — Intelligence Domains

**Status:** Accepted

## Decision

Studio Intelligence is organized around business intelligence domains rather than individual software integrations.

Domains include:

* Marketing Intelligence
* Operations Intelligence
* Financial Intelligence
* Customer Intelligence
* Executive Intelligence

## Rationale

Business capabilities remain stable while software integrations change over time.

## Consequences

Future integrations should strengthen an existing domain rather than introduce new architectural patterns.

---

# SI-008 — Meta Business as the Organic Social Source of Truth

**Status:** Accepted

## Decision

Meta Business will serve as the primary source of truth for Facebook and Instagram organic performance.

SOCi will remain a supplemental integration where appropriate.

## Rationale

Meta Graph API provides direct access to engagement, reach, followers, posts, reels, and stories without relying on an intermediary platform.

## Consequences

Organic social reporting will be built around Meta Business.

SOCi integrations should supplement—not replace—Meta Business data.

---

# SI-009 — Creative Intelligence as a Platform Service

**Status:** Accepted

## Decision

Creative assets will exist independently from marketing platforms.

Creative assets include:

* Images
* Videos
* Reels
* Captions
* Campaigns
* Paintings
* Events
* Promotional themes

## Rationale

The same creative asset may be used across multiple marketing channels.

Tracking creative independently enables cross-platform performance analysis.

## Consequences

Marketing platforms should reference creative assets rather than own them.

---

# SI-010 — AI Consumes Business Intelligence

**Status:** Accepted

## Decision

Artificial intelligence should consume reporting views rather than raw warehouse tables.

## Rationale

Reporting views provide standardized business metrics and reduce platform-specific complexity.

## Consequences

AI recommendations remain consistent regardless of changes to individual integrations.

---

# Future Decisions

Examples of future decisions that should be documented here include:

* Security model changes
* Authentication strategies
* Multi-tenant architecture enhancements
* New intelligence domains
* Data retention policies
* AI architecture decisions
* Integration framework changes

---

# Decision Review

Architecture decisions are intended to be long-lived.

Before proposing changes to an accepted decision, ask:

* Has the business requirement changed?
* Does the current decision prevent future growth?
* Is the proposed solution objectively better?
* Does the change simplify the platform?

If the answer is **No**, preserve the existing decision.

The goal of Studio Intelligence is not to redesign the platform repeatedly—it is to build upon a stable architectural foundation.
