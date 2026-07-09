# Studio Intelligence AI Guide

**Version 3.0**

**Last Updated:** July 9, 2026

---

# Purpose

This document provides context for AI assistants contributing to Studio Intelligence.

It summarizes the platform, architecture, development philosophy, and current priorities so that future AI sessions can contribute effectively without redesigning completed work.

AI assistants should read the following documents before making architectural recommendations:

1. README.md
2. PROJECT_BLUEPRINT.md
3. ARCHITECTURE.md
4. DATA_MODEL.md
5. DEVELOPER_GUIDE.md
6. CURRENT_STATUS.md

If recommendations conflict with these documents, follow the documentation.

---

# What Studio Intelligence Is

Studio Intelligence is a warehouse-first business intelligence platform designed to become the operating system for multi-location experiential businesses.

The platform automatically collects, normalizes, warehouses, analyzes, and interprets operational business data from multiple external systems.

The objective is not to automate websites.

The objective is to create a single source of truth that powers reporting, automation, forecasting, and artificial intelligence.

---

# Current Platform Status

Studio Intelligence has completed its foundational architecture.

The following platform components are operational:

* GitHub repository
* Docker deployment
* Railway hosting
* Express API
* Playwright automation
* n8n orchestration
* Supabase warehouse
* GA4 integration
* Eulerity integration

Development has shifted from infrastructure work to expanding business intelligence capabilities.

---

# Platform Architecture

Studio Intelligence follows a warehouse-first architecture.

```text id="lrjq2m"
External Systems

↓

Collection Layer

↓

ETL

↓

Warehouse

↓

Reporting Views

↓

Dashboards

↓

Automation

↓

Artificial Intelligence
```

Every integration should follow this pattern.

---

# Component Responsibilities

## Collection Layer

Responsible for retrieving data from external systems.

Examples:

* Playwright
* REST APIs
* Graph APIs
* Webhooks

Collection should:

* Authenticate
* Collect data
* Return structured responses

Collection should never:

* Normalize data
* Perform calculations
* Write to the warehouse

---

## ETL Layer

Technology

* n8n

Responsibilities

* Validation
* Normalization
* Calculations
* UPSERT logic
* Error handling
* Auditing

Business logic belongs here.

---

## Warehouse

Technology

* Supabase PostgreSQL

Responsibilities

* Historical storage
* Configuration
* Data integrity
* Reporting source
* AI source

The warehouse is the permanent source of truth.

---

## Reporting Views

Reporting views transform warehouse data into business-ready datasets.

Dashboards and AI should consume reporting views whenever practical.

---

# Intelligence Domains

Studio Intelligence is organized around business domains.

Current domains:

* Marketing Intelligence
* Operations Intelligence
* Financial Intelligence
* Customer Intelligence
* Executive Intelligence

New integrations should strengthen one of these domains rather than create new architectural patterns.

---

# Current Priorities

Current development is focused on Marketing Intelligence.

Immediate priorities:

1. Marketing reporting views
2. Meta Business integration
3. Creative Intelligence
4. Google Business Profile
5. Weather integration

Future priorities:

* Operations Intelligence
* Financial Intelligence
* Customer Intelligence
* Executive Intelligence

---

# Integration Status

| Integration             | Status       |
| ----------------------- | ------------ |
| GA4                     | ✅ Production |
| Eulerity                | ✅ Production |
| Weather                 | 🚧 Planned   |
| Meta Business           | 🚧 Next      |
| Google Business Profile | Planned      |
| SOCi                    | Planned      |

---

# Development Philosophy

AI should recommend solutions that are:

* Reusable
* Configuration-driven
* Warehouse-first
* Scalable
* Consistent with existing architecture

Avoid recommending one-off implementations.

---

# Decision Framework

Before proposing any implementation, ask:

1. Does this already exist?
2. Can an existing component own this responsibility?
3. Does it violate the documented architecture?
4. Is it reusable?
5. Is configuration preferable to code?
6. Will this make future integrations easier?

If the answer to any question is "No," reconsider the recommendation.

---

# Things AI Should Never Suggest

Do not recommend:

* Browser automation performing ETL
* Playwright writing directly to Supabase
* Hardcoded business configuration
* Duplicate warehouse logic
* Reporting directly from source systems
* AI consuming raw integration tables
* Platform-specific architectural exceptions

These violate the core architecture.

---

# Current Collection Technologies

| Technology  | Purpose                   |
| ----------- | ------------------------- |
| Playwright  | Browser automation        |
| REST APIs   | Standard integrations     |
| Graph APIs  | Social media integrations |
| Webhooks    | Event-driven integrations |
| CSV Imports | Legacy systems            |

Regardless of collection method, all integrations follow the same ETL pipeline.

---

# AI Design Philosophy

AI should optimize for the long-term health of the platform rather than short-term implementation speed.

Recommendations should:

* Reduce future maintenance
* Encourage reuse
* Preserve clean architecture
* Improve scalability
* Minimize technical debt

Architecture consistency is more valuable than implementation convenience.

---

# Creative Intelligence

Creative Intelligence is a first-class subsystem within Marketing Intelligence.

Creative assets should exist independently of individual marketing platforms.

Examples include:

* Images
* Videos
* Reels
* Captions
* Paintings
* Campaigns
* Promotional Themes
* Instructors

Marketing platforms reference creative assets rather than owning them.

This allows Studio Intelligence to evaluate creative performance across multiple channels.

---

# Long-Term Vision

Studio Intelligence is evolving beyond reporting.

The platform will ultimately:

* Collect business information.
* Organize it into a single source of truth.
* Explain business performance.
* Predict future outcomes.
* Recommend actions.
* Automate routine business decisions.

Every recommendation should move the platform toward becoming the operating system for multi-location experiential businesses.

---

# Final Guidance

When contributing to Studio Intelligence:

Understand the vision before proposing solutions.

Respect established architectural decisions.

Prefer extending existing systems over creating new ones.

Think in terms of business capabilities rather than individual integrations.

Build features that make the next feature easier to implement.

Studio Intelligence is a long-term platform.

Every decision should make it more scalable, more maintainable, and more intelligent.
