Studio Intelligence Developer Guide
Version 1.1

Last Updated: July 6, 2026

This document is the operational guide for anyone (human or AI) developing Studio Intelligence.

Before making architectural recommendations, read this document.

If proposed changes conflict with this document, STOP.

The architecture has already been decided.

Project Goal

Studio Intelligence is a warehouse-first business intelligence platform for multi-location experiential businesses.

The goal is not simply to automate websites.

The goal is to continuously:

Collect
Normalize
Warehouse
Analyze
Report
Forecast
Automate
Enable AI

using operational business data.

Core Design Philosophy

Studio Intelligence follows several core principles.

Configuration over Code

Business configuration should never be hardcoded.

Studios, brands, integrations, credentials, IDs, schedules, and feature flags should all be configurable.

Warehouse First

Every integration feeds the warehouse.

Dashboards never query raw source data.

AI never consumes raw source data.

Everything flows through reporting views.

Single Responsibility

Every component owns exactly one responsibility.

If a responsibility already belongs somewhere else, do not duplicate it.

Reusable over One-Off

Every integration should plug into the existing architecture.

Adding a new integration should require configuration—not redesign.

Overall Architecture
Browser / APIs

        │

        ▼

Playwright or API Client

        │

        ▼

n8n ETL

        │

        ▼

Supabase Warehouse

        │

        ▼

SQL Reporting Views

        │

        ▼

Dashboards • AI • Automation
Component Ownership
Playwright
Owns

Browser automation only.

Responsibilities

Login
Session management
Browser interaction
Navigation
Report downloads
Extract browser-visible values
Return structured browser data

Outputs

Downloaded CSV files
Browser-derived values
Structured JSON

Never

Normalize data
Write to Supabase
Perform ETL
Know warehouse schema
Make business decisions
n8n

Owns ETL.

Responsibilities

Scheduling
Workflow orchestration
Calling Playwright
Calling APIs
Parsing files
Data normalization
UPSERT logic
Retry logic
Error handling
Auditing
Temporary file cleanup

Never

Browser automation
Supabase

Owns storage.

Responsibilities

Configuration
Warehouse
Reporting views
Security
AI data source

Never

Browser automation
Scheduling
ETL
Reporting Views

Own cross-domain reporting.

Responsibilities

Join warehouse tables
Business metrics
Executive reporting
AI-ready datasets

Dashboards consume reporting views.

AI consumes reporting views.

Never query raw fact tables directly.

Repository Structure
studio-intelligence/

playwright/

    auth/
        Browser sessions

    downloads/
        Temporary downloads

    routes/
        Express API endpoints

    scripts/
        Browser automation

    services/
        Shared parsing logic

    utils/
        Generic helpers

    server.js

docs/

    ARCHITECTURE.md
    DEVELOPER_GUIDE.md
    ROADMAP.md
    CHANGELOG.md
    CURRENT_STATUS.md
Browser Automation Rules

Playwright performs browser automation only.

Flow

Login

↓

Process Every Configured Studio

↓

Download Metrics CSV

↓

Download Spend CSV

↓

Read Budget Distribution

↓

Return Browser Results

↓

Exit

Outputs

Metrics CSV
Spend CSV
Budget Allocation JSON

Never

Normalize data
UPSERT warehouse
Know warehouse schema
ETL Rules

n8n owns ETL.

Flow

Receive Browser Results

↓

Normalize

↓

UPSERT

↓

Audit

↓

Delete Temporary Files
Warehouse Rules

Warehouse-first architecture.

Rules

Preserve history
Never duplicate facts
UPSERT instead of INSERT
One fact table per source
Reporting uses SQL Views
Configuration Rules

Nothing business-specific is hardcoded.

Configuration belongs in Supabase.

Includes

Organizations
Brands
Studios
Integrations
Credentials
External IDs
Feature Flags
Scheduling Rules

Infrastructure secrets may remain in Railway.

Examples

Database URL
Supabase Service Key
Railway deployment settings

Future Refactor

Application credentials (Eulerity, GA4, SOCi, etc.) will move from Railway Variables into centralized configuration stored in Supabase (or another secrets provider).

Goal

Single source of truth
Easier password rotation
Multi-tenant support
Simplified deployments
Current Warehouse
Configuration
organizations
brands
studios
studio_integrations
integration_runs
Fact Tables
ga4_daily_metrics
eulerity_daily_metrics
eulerity_daily_spend
eulerity_daily_budget_allocation
weather_daily
Reporting Views

Planned

marketing_daily_summary
operations_daily_summary
executive_daily_summary
studio_daily_summary
Current Integrations
GA4

Status

Production

Warehouse

Complete

Playwright

Not Required

Eulerity
Browser Automation
Login ✔
Session Persistence ✔
Metrics Download ✔
Spend Download ✔
Budget Collection ✔
Structured JSON Response ✔
Warehouse
Schema ✔
Metrics Import ☐
Spend Import ☐
Budget Import ☐
Integration Auditing ☐
Weather

Warehouse Complete

Import Pending

PTS

Planned

SOCi

Planned

Google Business Profile

Planned

Current Sprint
Objective

Complete Eulerity warehouse integration.

Tasks

☑ Railway Deployment

☑ Docker Deployment

☑ Browser Automation

☑ Metrics Download

☑ Spend Download

☑ Budget Collection

☑ JSON Response

☑ n8n Integration

☐ Supabase UPSERT

☐ Integration Auditing

☐ Historical Backfill

Current Database Design

GA4

One row per Studio + Day

Eulerity Metrics

One row per Studio + Day

Eulerity Budget

One row per Studio + Day

Eulerity Spend

One row per Studio + Day + Campaign

Development Rules

When making recommendations:

First ask:

Does this already exist?

If yes:

Follow the existing architecture.

Never redesign completed work.

Avoid introducing duplicate systems.

Reuse existing configuration whenever possible.

When uncertain:

Read

ARCHITECTURE.md
DEVELOPER_GUIDE.md
CURRENT_STATUS.md

before making recommendations.

Architecture Decisions

These decisions are considered settled.

Warehouse-first architecture
Configuration over hardcoding
One responsibility per component
Playwright returns browser data only
n8n owns ETL
Supabase owns configuration and storage
Reporting uses SQL Views
Dashboards never query raw fact tables
AI consumes reporting views instead of raw data

Do not move responsibilities between components simply because it appears easier.

End Goal

Studio Intelligence should support any multi-location business by adding configuration rather than writing new software.

Every new integration should plug into the existing architecture without changing the platform.