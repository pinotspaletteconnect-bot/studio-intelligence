Studio Intelligence AI Refresher
Version 2.0

Last Updated: July 6, 2026

This document is intended to quickly bring any AI assistant up to speed before working on Studio Intelligence.

Read this document before making recommendations.

Then read:

ARCHITECTURE.md
DEVELOPER_GUIDE.md
CURRENT_STATUS.md

If recommendations conflict with these documents, follow the documentation.

Project Overview

Studio Intelligence is a warehouse-first business intelligence platform for multi-location experiential businesses.

The objective is to automatically collect, normalize, warehouse, analyze, and report operational business data.

Browser automation is only one component of the overall platform.

Current Technology Stack
Orchestration
n8n

Responsibilities

Scheduling
Workflow orchestration
ETL
Retry logic
Auditing
Calling APIs
Calling Playwright
Browser Automation

Location

studio-intelligence/playwright

Technology

Node.js
Express
Playwright

Hosted on

Railway

Responsibilities

Login
Session management
Navigation
Browser automation
Download reports
Return structured browser data

Never

Normalize data
Write database records
Perform ETL
Warehouse

Technology

Supabase (PostgreSQL)

Responsibilities

Configuration
Warehouse
Reporting Views
AI data source
Source Control

GitHub Repository

studio-intelligence

Primary working directory

playwright/
Current Repository Structure
studio-intelligence/

playwright/

    Dockerfile

    package.json

    server.js

    routes/

        eulerity.js

    scripts/

        eulerity/

            eulerity.js

    services/

        eulerityParser.js

        supabase.js

    downloads/

    auth/

    utils/

docs/

    ARCHITECTURE.md

    DEVELOPER_GUIDE.md

    ROADMAP.md

    CURRENT_STATUS.md

    CHANGELOG.md
Current Production Environment
Railway

Hosts

Playwright Express service

Deployment

Docker

Base Image

Microsoft Playwright

Express Endpoints

GET /

GET /eulerity

POST /eulerity/download

Status

Production Ready

n8n

Responsible for

Calling

POST /eulerity/download

Receiving JSON

Performing ETL

Writing to Supabase

Current Working Integration
Eulerity

Status

Browser Automation Complete

Features

✔ Login

✔ Session Persistence

✔ Multi-Studio Processing

✔ Metrics Download

✔ Spend Download

✔ Budget Distribution

✔ CSV Parsing

✔ Structured JSON Response

Studios

STM
GIL
JEF
SN
Current Warehouse

Configuration Tables

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

(planned)

marketing_daily_summary
operations_daily_summary
executive_daily_summary
studio_daily_summary
Architecture Rules

Playwright

Owns browser automation only.

n8n

Owns ETL.

Supabase

Owns storage and configuration.

Reporting Views

Own business reporting.

Never move responsibilities between components.

Current Development Stage

Infrastructure

✅ Complete

Playwright

✅ Complete

Railway

✅ Complete

Docker

✅ Complete

Express API

✅ Complete

Eulerity Browser Automation

✅ Complete

Current Focus

Eulerity Warehouse Import

Next Immediate Objectives
Build Eulerity import workflow in n8n.
Normalize returned JSON.
UPSERT Metrics.
UPSERT Spend.
UPSERT Budget Allocation.
Record Integration Audit.
Remove temporary debugging.
Planned Integrations

Priority

Eulerity ETL
Weather
GA4 Enhancements
SOCi
Google Business Profile
POS
Labor
Inventory
Planned Architecture Refactor

Do not implement until Eulerity ETL is stable.

Current

Business credentials are stored in Railway Variables.

Future

Move business configuration into Supabase.

Examples

Eulerity credentials
GA4 configuration
SOCi credentials
API keys
External IDs
Scheduling rules

Leave Railway Variables for infrastructure secrets only.

Benefits

Single source of truth
Easier credential rotation
Multi-studio support
Future multi-tenant architecture
Current Session Starting Point

Assume the following is already working:

GitHub repository configured.
Railway deployment configured.
Docker deployment configured.
Express API online.
Playwright executing in Railway.
n8n successfully calling Railway.
Eulerity automation returning structured JSON.

Do not spend time redesigning infrastructure that is already complete.

AI Working Rules

Before suggesting a change, ask:

Does this already exist?
Does it violate the documented architecture?
Can the existing component own this responsibility?
Is there already a reusable solution?

Prefer extending existing systems over creating new ones.