# Studio Intelligence Developer Guide

**Version 3.0**

**Last Updated:** July 9, 2026

---

# Purpose

This document defines the development standards, architectural rules, coding practices, and implementation patterns for Studio Intelligence.

Every developer and AI assistant should read this guide before making architectural or implementation recommendations.

The purpose of this guide is to ensure that Studio Intelligence remains consistent, scalable, maintainable, and configuration-driven as new features and integrations are added.

If implementation ideas conflict with this document, follow this guide.

---

# Development Philosophy

Studio Intelligence is a long-term platform.

Solutions should be designed for scalability and reuse rather than speed of implementation.

The platform should evolve by extending existing architecture rather than introducing one-off solutions.

Every new feature should make the platform better—not just solve today's problem.

---

# Core Development Principles

## Warehouse First

Every integration exists to populate the warehouse.

Applications, dashboards, automation, and AI consume reporting views—not external systems.

The warehouse is the permanent source of truth.

---

## Configuration Over Code

Business-specific information should never be hardcoded.

Examples include:

* Organizations
* Brands
* Studios
* Credentials
* API Keys
* External IDs
* Feature Flags
* Scheduling Rules

New businesses should primarily require configuration rather than software changes.

---

## Single Responsibility

Each platform component owns one responsibility.

Responsibilities must never overlap.

| Component        | Responsibility               |
| ---------------- | ---------------------------- |
| Collection Layer | Retrieve data                |
| ETL              | Normalize and transform      |
| Warehouse        | Store data                   |
| Reporting Views  | Business calculations        |
| AI               | Analysis and recommendations |

---

## Reusable Patterns

Whenever possible, extend existing systems.

Avoid creating special-case logic for individual integrations.

If multiple integrations require similar behavior, create reusable components.

---

# Platform Responsibilities

## Collection Layer

Collection is responsible for retrieving data from external systems.

Supported methods include:

* Playwright browser automation
* REST APIs
* Graph APIs
* Webhooks
* File imports

Collection responsibilities:

* Authentication
* Navigation
* Session management
* Downloading reports
* Returning structured data

Collection should **never**:

* Normalize data
* Perform calculations
* Write to Supabase
* Understand warehouse schemas
* Apply business rules

---

## ETL Layer

Technology

* n8n

Responsibilities

* Scheduling
* Data transformation
* Validation
* Normalization
* Calculations
* UPSERT logic
* Error handling
* Retry logic
* Integration auditing
* Cleanup

Business logic belongs here.

---

## Warehouse

Technology

* Supabase PostgreSQL

Responsibilities

* Historical storage
* Configuration
* Data integrity
* Security
* Reporting source
* AI source

The warehouse should preserve historical information whenever practical.

---

## Reporting Views

Reporting views convert warehouse data into business intelligence.

Responsibilities

* Join domains
* Calculate KPIs
* Standardize business metrics
* Hide warehouse complexity

Dashboards and AI should consume reporting views whenever possible.

---

# Standard Integration Pattern

Every new integration should follow the same lifecycle.

```text
Authenticate

↓

Collect Data

↓

Return Structured Response

↓

Normalize

↓

Warehouse UPSERT

↓

Reporting Views

↓

Dashboards

↓

Automation

↓

AI
```

If an integration does not fit this pattern, reconsider the design before implementation.

---

# Integration Checklist

When adding a new integration:

## Planning

* Identify business purpose
* Identify data owner
* Define refresh frequency
* Determine warehouse tables
* Determine reporting requirements

---

## Collection

* Authenticate
* Retrieve source data
* Handle paging if required
* Handle rate limits
* Return structured JSON

---

## ETL

* Validate source data
* Normalize field names
* Standardize dates
* Standardize numeric values
* Calculate derived metrics
* UPSERT warehouse

---

## Warehouse

* Preserve historical data
* Avoid duplicate facts
* Maintain referential integrity
* Record integration audit information

---

## Reporting

* Create reporting views
* Validate business metrics
* Test executive reporting
* Verify AI compatibility

---

# Coding Standards

## Naming

Use descriptive names.

Avoid abbreviations unless they are industry standard.

Examples:

Good

```text
calculateDailySpend()
```

Avoid

```text
calc1()
```

---

## Reuse

Before creating new logic:

Ask:

* Does this already exist?
* Can this be reused?
* Can this become generic?

Duplicate logic should be avoided whenever practical.

---

## Error Handling

Errors should:

* Be descriptive
* Preserve context
* Be recoverable when possible

Never silently ignore failures.

---

## Logging

Log:

* Integration start
* Integration completion
* Record counts
* Warnings
* Errors
* Retry attempts

Avoid excessive debugging in production.

---

# Git Workflow

For every meaningful milestone:

1. Complete the implementation.
2. Test functionality.
3. Update documentation if necessary.
4. Commit with a descriptive message.
5. Push to GitHub.

Documentation is considered part of the implementation.

---

# Testing

Every integration should be tested for:

* Successful authentication
* Successful collection
* Invalid credentials
* Empty datasets
* Duplicate runs
* Historical imports
* Error recovery

---

# Documentation Requirements

When a new integration is added:

Update:

* DATA_MODEL.md
* INTEGRATIONS.md
* CURRENT_STATUS.md
* ROADMAP.md (if priorities change)
* CHANGELOG.md

Architecture documents should only change if the platform architecture changes.

---

# Decision Framework

Before implementing any change, ask:

1. Does this already exist?
2. Can an existing component own this responsibility?
3. Does it violate the architecture?
4. Is it reusable?
5. Does it improve the platform?
6. Is configuration preferable to code?

If the answer to any of these questions is "No," reconsider the implementation.

---

# Anti-Patterns

Avoid:

* Hardcoded business logic
* Duplicate calculations
* Platform-specific reporting
* Browser automation performing ETL
* Warehouse logic inside collection scripts
* Reporting directly from raw source systems
* AI consuming raw integration tables

These patterns increase technical debt and reduce scalability.

---

# Long-Term Development Goals

Studio Intelligence should continue evolving toward a platform that can support:

* Unlimited organizations
* Unlimited locations
* Unlimited integrations
* Unlimited historical data
* Automated reporting
* AI-driven recommendations
* Intelligent business automation

Every feature should move the platform closer to becoming the operating system for multi-location experiential businesses.
