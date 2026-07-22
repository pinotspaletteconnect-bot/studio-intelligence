Studio Intelligence Current Status

Version 4.0

Last Updated: July 22, 2026

Purpose

This document describes the current implementation status of Studio Intelligence.

Unlike the Project Blueprint or Architecture documents, this file changes frequently and reflects the current development state of the platform.

It should provide enough information for any developer or AI assistant to immediately understand what has been completed, what is currently in production, what is actively being developed, and what work remains.

Overall Project Status

Instead of saying:

Studio Intelligence has successfully completed its fourth production marketing integration...

I'd say something like:

Studio Intelligence has successfully completed the foundational architecture for both its data collection platform and its frontend reporting platform.

The platform now consists of two mature layers:

Data Collection Platform

Playwright
Express Services
n8n ETL
Supabase Warehouse

Business Intelligence Platform

Next.js Dashboard
Shared Application Context
Service Layer
API Layer
Dashboard Components

Development is now focused primarily on reporting, dashboards, analytics, and AI insights rather than additional infrastructure.

The platform now collects marketing data from four independent production systems using a standardized, service-oriented architecture.

Current production integrations include:

Google Analytics 4
Eulerity
Meta Business Ads
Meta Page Insights

Each integration follows the same architectural pattern:

External Platform
        ↓
Playwright / API Service
        ↓
Express Endpoint
        ↓
n8n ETL
        ↓
Supabase Warehouse
        ↓
Reporting Views
        ↓
Dashboards
        ↓
AI

This architecture is now considered stable and serves as the standard implementation for future integrations.

The project is now transitioning from building integrations toward building reporting, dashboards, and AI-driven business intelligence.

Completed During This Sprint
Meta Page Insights Integration

The Meta Page Insights integration is now production complete.

Completed components include:

Facebook Page discovery
Page Insights collector
Shared Graph API implementation
Production Express endpoint
Railway deployment
n8n ETL workflow
Warehouse loading
Studio mapping
Production validation

The service successfully downloads Facebook Page insight metrics for every configured Pinot's Palette studio.

Current imported dimensions include:

Facebook Page
Insight Date
Period
Day
Week
Rolling 28 Days

Current imported metrics include:

Facebook Views (page_media_view)

The collector is designed to support additional Page Insight metrics as Meta makes them available.

Meta Page Architecture

Page collection follows the same service-oriented architecture as every other Studio Intelligence integration.

Playwright performs only data collection.

Business logic is intentionally handled inside the ETL.

The Playwright service:

Discovers every accessible Facebook Page
Downloads Page Insight metrics
Returns normalized JSON
Performs no filtering or warehouse logic

Studio assignment occurs entirely through the studio_integrations configuration table using:

integration_type = 'meta_page'

This keeps the collector generic while allowing the warehouse to determine which pages belong to which studios.

Friendly Page Naming

Facebook returns the generic page name:

Pinot's Palette

During ETL, the generic Facebook name is replaced using the configured integration name from studio_integrations.

Examples include:

Pinot's Palette Louisville
Pinot's Palette Short North
Pinot's Palette Gilbert
Pinot's Palette Jeffersonville

This ensures warehouse reporting remains consistent regardless of future Facebook page name changes.

Meta Business Ads Integration

The Meta Business Ads integration remains production complete.

Completed components include:

OAuth authentication
Long-lived access token management
Business Manager discovery
Ad Account discovery
Facebook Page discovery
Reusable Graph API service
Campaign Insights collection
Production Express endpoints
Railway deployment
n8n integration
Warehouse loading

Current imported metrics include:

Spend
Impressions
Reach
Clicks
CTR
CPC
CPM
Campaign Name
Campaign ID
Date

Meta account mapping remains configuration-driven using studio_integrations.

No hardcoded account IDs exist within the application.

Meta Authentication Architecture

Meta authentication has been centralized into:

playwright/services/meta/auth.js

The shared authentication service manages:

OAuth
Long-lived token exchange
Token persistence
Graph API communication
Business discovery
Ad account discovery
Facebook Page discovery
Token validation

Both Meta Business Ads and Meta Page Insights use the same shared authentication layer.

Railway Deployment Validation

Deployment architecture has been fully validated.

Current deployment configuration:

Railway Root Directory: playwright
Docker build context: playwright
Playwright maintains its own package.json
Service starts using:
node server.js

A .dockerignore file excludes the local .env from Docker images.

Railway environment variables remain the production source of configuration.

This deployment architecture is considered stable.

Current Production Integrations
Integration	Status
Google Analytics 4	✅ Production
Eulerity	✅ Production
Meta Business Ads	✅ Production
Meta Page Insights	✅ Production
Weather Reporting	🚧 Planned
Google Business Profile	Planned
Reservation System	Planned
QuickBooks	Planned
Current Warehouse
Configuration
organizations
brands
studios
studio_integrations
integration_runs
Marketing
ga4_daily_metrics
eulerity_daily_metrics
eulerity_daily_spend
eulerity_daily_budget_allocation
meta_ads_daily
meta_page_insights_daily

The warehouse now supports four production marketing data sources.

Current Platform Components
Infrastructure
GitHub Repository
Railway Hosting
Express API
Playwright Automation Service
Docker Deployment
Supabase Warehouse
n8n ETL Platform
Marketing Integrations
Google Analytics 4
Eulerity
Meta Business Ads
Meta Page Insights
Architecture
Service-oriented integrations
Configuration-driven studio mappings
Shared Graph API architecture
Standardized ETL pipeline
Multi-tenant warehouse design
Immediate Priorities

The focus of development now shifts from integration work to business intelligence.

Marketing Reporting Views

Build unified reporting views combining:

Google Analytics 4
Eulerity
Meta Business Ads
Meta Page Insights

Planned views:

vw_marketing_daily
vw_marketing_weekly
vw_marketing_monthly
vw_campaign_performance
Executive Dashboards

Develop the first production dashboards including:

Marketing Summary
Campaign Performance
Studio Comparison
Executive Overview
Marketing KPIs

Implement calculated business metrics including:

Cost Per Session
Cost Per User
Cost Per Click
Marketing Efficiency
Studio Rankings
ROAS (when revenue attribution becomes available)
Creative Intelligence

Begin development of creative reporting independent of advertising platforms.

Track:

Paintings
Marketing creatives
Images
Videos
Reels
Promotional themes
Campaign performance by creative
Major Milestones Completed
Platform
GitHub Repository
Railway Deployment
Express API
Playwright Automation
Docker Architecture
Supabase Warehouse
n8n ETL Platform
Marketing
Google Analytics 4 Integration
Eulerity Integration
Meta Business Ads Integration
Meta Page Insights Integration
Architecture
Multi-tenant warehouse
Configuration-driven integrations
Shared authentication services
Standardized ETL architecture
Centralized marketing data model
Next Development Sprint

With four production marketing integrations now operating in production, the next sprint focuses on transforming collected data into actionable business intelligence.

Development priorities include unified reporting views, executive dashboards, cross-platform marketing analytics, AI-ready business metrics, and marketing insights that explain not only what happened, but why it happened, what is likely to happen next, and what actions should be taken.

Frontend Dashboard Architecture

Document everything we built today.

Something like:

Frontend Dashboard Architecture

The frontend has been standardized around a layered architecture matching the backend service-oriented design.

Next.js Pages
        ↓
Shared App Context
        ↓
Dashboard Components
        ↓
API Routes
        ↓
Service Layer
        ↓
Supabase
Shared Application Context

Implemented a global application context responsible for:

Active Studio
Date Range
Comparison Period
Studio List
Dashboard State

This removes prop drilling and establishes a shared filtering model for every dashboard.

API Layer

Frontend API routes have been introduced to isolate React components from database access.

Current APIs:

/api/studios
/api/marketing/summary

Future dashboard APIs will follow this same pattern.

Service Layer

Frontend services now encapsulate all Supabase access.

Current services include:

lib/services/studios.ts
lib/services/marketing.ts

React components no longer communicate directly with Supabase.

Dashboard Components

Implemented reusable dashboard components:

Dashboard Toolbar
Dynamic Studio Selector
KPI Metric Cards

These components establish the standard UI pattern for all future dashboards.

3. Immediate Priorities

This section should change significantly.

Instead of:

Marketing Reporting Views

I'd say:

Current Development Sprint

Frontend Reporting Platform

Complete:

✅ Shared dashboard architecture
✅ Global filtering
✅ KPI dashboard
✅ Marketing summary API

Remaining:

Marketing Trend Chart
Executive Dashboard
Financial Dashboard
Operations Dashboard
Date Range Filtering
Comparative Analytics
AI Insight Cards
4. Major Milestones

I'd add a new category.

Frontend

Next.js Dashboard
Shared Application Context
Frontend Service Layer
Dashboard API Layer
Dynamic Studio Filtering
Marketing KPI Dashboard
Reusable Dashboard Components
5. Next Sprint

This should completely change.

Instead of:

Build reporting views...

I'd write something closer to:

Next Development Sprint

The project is now entering its first business intelligence sprint.

The immediate objective is transforming the collected warehouse data into interactive dashboards and decision-support tools.

Development priorities:

Marketing Trend Visualization
Executive Dashboard
Financial Dashboard
Operations Dashboard
Date Range Filtering
Studio Comparison
AI-generated Business Insights

The platform architecture for both backend data collection and frontend reporting is now considered stable. Future development will focus primarily on analytics, visualization, and intelligence rather than infrastructure.