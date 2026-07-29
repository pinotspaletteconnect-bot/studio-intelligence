# Studio Intelligence Changelog

All notable changes to Studio Intelligence will be documented in this file.

This project follows a milestone-based changelog rather than tracking every individual commit.

---

# Unreleased

## Added

- Added the PTS Sales Report foundation: secure Railway credential boundary,
  four verified PTS location mappings, a multi-studio Playwright collector,
  separate class/non-class Excel parsers, data-minimized sales facts, and
  service-role-only Supabase storage.
- Documented scalable PTS onboarding through encrypted credential references,
  owner-controlled location mapping, shared credential-grouped collection, and
  resumable historical backfills.
- Added the privacy-safe reciprocal benchmark foundation: organization-level
  opt-in (default off), immutable consent audit entries, service-role-only
  access, and minimum cohort suppression at 10 studios across 3 organizations.
- Added the first collective metric, paid CPC median/mean, and a conditional
  Paid CPC comparison that is shown only to participating organizations when
  the protected cohort threshold is met.
- Marketing Performance overview modeled on the approved dashboard direction.
- Separate Meta Ads and Eulerity spend reporting.
- GA4, Meta Ads, Meta Organic, and Eulerity drill-down routes.
- Working 7-, 30-, and 90-day marketing filters.
- Meta organic reporting-coverage indicator that is independent of paid-ad spend.
- Paid CPC cards and platform CPC calculations sourced from paid-platform spend and clicks.
- Attribution-ready revenue and ROAS cards that remain unavailable until validated GA4 source/medium facts exist.
- GA4 source/medium performance table with sessions, new users, key events, revenue, and governed channel classification.
- Deployed the additive `ga4_source_medium_performance` reporting view and Eulerity paid-source classification.
- Published the corrected GA4 source/medium workflow with tenant ownership derived from studio configuration, normalized dates, and idempotent upserts.
- Prepared the scalable marketing source directory migration with global,
  organization, brand, and studio precedence; separate Facebook and Instagram
  organic reporting; automatic paid/social coverage; tourism curation; and
  grouped incidental referrals.
- Made the GA4 source/medium dashboard table sortable by source,
  classification, sessions, new users, key events, and revenue, defaulting to
  sessions from highest to lowest.
- Changed dashboard presets to completed-day ranges ending yesterday, added the
  applied start/end dates to the toolbar, and added a validated custom range
  with an explicit Apply action.
- Backfilled GA4 source/medium attribution for Short North, Gilbert, and
  Jeffersonville for June 28 through July 27, 2026. Each studio now has all 30
  dates with no duplicate studio/date/source/medium records.
- Removed 72 malformed January 7 attribution rows created by the superseded
  date parser after confirming the replacement historical data.
- Restored and published the normal seven-day, all-studio GA4 source/medium
  production workflow after the controlled backfill.
- Added attributed revenue to each paid platform performance row so the GA4
  revenue used in the displayed ROAS calculation is visible beside spend.
- Replaced the Conversion Path progress bars with a tapered, stage-by-stage
  funnel that shows totals and conversion from each prior stage.
- Added a Top Meta Campaigns table using campaign spend, impressions, reach,
  clicks, CTR, CPC, and CPM while deliberately excluding unsupported
  campaign-level sessions, reservations, revenue, and ROAS.
- Expanded the Meta delivery table for design review with the account,
  campaign, ad-set, and ad names plus their permanent Meta IDs.
- Simplified the Meta card to account and campaign identity, and added an
  all-campaign total row with CTR, CPC, and CPM recalculated from aggregate
  spend, click, and impression totals.
- Added an Eulerity channel performance card for Social, Search, Display,
  Video, and Other with allocated spend, spend share, impressions, clicks,
  recalculated CTR, recalculated CPC, and a selected-period total.
- Validated 131 unique Studio 1 attribution rows across July 21–28 against GA4 daily sessions, key events, and revenue, then restored the all-studio schedule.

- Added the MNTN Connected TV warehouse integration with non-secret
  advertiser-to-studio mappings for Gilbert, Louisville/St. Matthews, and Short
  North; tenant ownership is enforced from `studio_integrations`.
- Added a MNTN dashboard card separating modeled view-through attribution from
  last-touch attribution and showing spend, delivery, visits, conversions,
  order value, ROAS, CPM, and acquisition costs.
- Defined a rolling 35-day MNTN refresh so the daily UPSERT replaces attribution
  facts that can mature during MNTN's 30-day measurement window.
- Published the MNTN n8n workflow on a daily 5:15 AM schedule and loaded 35
  days for each of the three configured advertisers. A repeated run retained
  105 unique advertiser-date rows, confirming duplicate-safe updates.
- Included MNTN in marketing spend totals, daily platform spend, the platform
  mix chart, and platform performance. MNTN reporting is omitted when the
  selected studio and period have no MNTN data; CPC remains limited to
  click-based platforms while MNTN reports CPM and modeled ROAS.

## Changed

- Marketing KPIs now expose CPC immediately while withholding revenue attribution and ROAS until the existing GA4 source/medium workflow is populated and validated.
- Marketing API input is validated and API failures return stable user-facing errors.
- Marketing daily trends are assembled from each production source independently, preventing Eulerity-, Meta Ads-, or organic-only dates from being dropped by the GA4-driven legacy summary view.

---

# Version 3.0

**Release Date:** July 9, 2026

## Overview

Version 3.0 marks the transition of Studio Intelligence from an infrastructure project into a business intelligence platform.

The foundational architecture is complete, the first production data pipeline is operational, and future development is focused on expanding business intelligence domains rather than building core infrastructure.

---

## Added

### Documentation

* Complete documentation redesign
* README.md
* PROJECT_BLUEPRINT.md
* ARCHITECTURE.md
* DATA_MODEL.md
* DEVELOPER_GUIDE.md
* CURRENT_STATUS.md
* ROADMAP.md
* INTEGRATIONS.md
* AI_GUIDE.md

### Architecture

* Intelligence Domain architecture
* Marketing Intelligence domain
* Operations Intelligence domain
* Financial Intelligence domain
* Customer Intelligence domain
* Executive Intelligence domain

### Creative Intelligence

Introduced Creative Intelligence as a first-class subsystem within Marketing Intelligence.

Creative assets are now considered reusable business entities rather than platform-specific content.

---

## Completed

### Platform Foundation

* GitHub repository
* Docker deployment
* Railway deployment
* Express API
* Playwright framework
* n8n orchestration
* Supabase warehouse

### Production Integrations

#### Google Analytics 4

* Warehouse integration
* Daily metrics
* Multi-studio support

#### Eulerity

Completed end-to-end production pipeline.

Capabilities include:

* Authentication
* Session persistence
* Multi-studio processing
* Metrics collection
* Spend collection
* Budget allocation
* Warehouse ingestion
* Spend allocation calculations
* Production ETL

---

## Changed

### Documentation Philosophy

Documentation now separates:

* Vision
* Architecture
* Data Model
* Development Standards
* Integrations
* Current Status

rather than combining them into a few large documents.

### Roadmap

The roadmap is now organized around business capabilities rather than individual integrations.

### Integration Strategy

Integrations are treated as data collection mechanisms that support business intelligence domains.

---

## Current Priorities

* Marketing Reporting Views
* Meta Business Integration
* Creative Intelligence
* Google Business Profile
* Weather Integration

---

## Technical Debt

Remaining work includes:

* Historical import framework
* Integration auditing enhancements
* Expanded reporting views
* Additional warehouse dimensions

No major architectural refactoring is currently planned.

---

# Version 2.x

## Highlights

* Initial warehouse architecture
* Initial documentation
* Railway deployment
* Playwright browser automation
* n8n orchestration
* Eulerity browser automation
* Initial Supabase warehouse

---

# Version 1.x

## Highlights

Project inception.

Established the initial concept of a warehouse-first business intelligence platform for multi-location experiential businesses.

Initial technology decisions included:

* Supabase
* Playwright
* n8n
* Railway
* GitHub

These architectural decisions remain the foundation of Studio Intelligence today.

---

# Future Releases

Future versions will continue documenting significant milestones rather than individual commits.

Examples include:

* Major integrations
* Architectural changes
* Intelligence domains
* Reporting capabilities
* AI features
* Business automation capabilities

The changelog should remain concise and focused on meaningful platform evolution.
