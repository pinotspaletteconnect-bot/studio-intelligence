# Studio Intelligence Integrations

**Version 3.1**

**Last Updated:** July 14, 2026

---

# Purpose

This document defines every external system integrated with Studio Intelligence.

Integrations are organized by **business capability** rather than software vendor.

Each integration follows the standard Studio Intelligence lifecycle:

Authenticate

↓

Collect

↓

Return Structured Data

↓

ETL

↓

Warehouse

↓

Reporting Views

↓

Dashboards / AI

No integration should bypass this workflow.

---

# Marketing Intelligence

Marketing Intelligence combines multiple capabilities into a unified view of marketing performance.

---

## Paid Advertising

| Integration | Collection | Status |
|------------|------------|--------|
| Eulerity | Playwright | ✅ Production |
| Meta Ads | Graph API | 🚧 Active Development |
| Google Ads | REST API | Planned |
| Microsoft Ads | REST API | Planned |

---

### Eulerity

Purpose

Collect paid advertising metrics, spend, and budget allocation.

Warehouse

- eulerity_daily_metrics
- eulerity_daily_spend
- eulerity_daily_budget_allocation

Reporting

- marketing_daily_summary

Status

✅ Production

---

### Meta Ads

Purpose

Collect paid advertising performance directly from Meta Marketing API.

Planned Data

- Campaigns
- Ad Sets
- Ads
- Daily Insights
- Spend
- Reach
- Impressions
- Clicks
- CTR
- CPC
- CPM
- Conversions
- ROAS

Warehouse

- meta_ads_daily_metrics
- meta_campaigns
- meta_adsets
- meta_ads

Reporting

- marketing_daily_summary
- paid_advertising_summary

Development Progress

| Stage | Status |
|--------|--------|
| Developer App | ✅ Complete |
| Authentication | ✅ Complete |
| Ad Account Discovery | ✅ Complete |
| Collection Service | 🚧 Next |
| ETL | Planned |
| Warehouse | Planned |
| Reporting Views | Planned |
| AI | Planned |

---

## Organic Social

| Integration | Collection | Status |
|------------|------------|--------|
| Meta Social | Graph API | Planned |
| Instagram Business | Graph API | Planned |
| SOCi | API | Planned |

Purpose

Measure organic audience growth and engagement.

Planned Data

- Followers
- Reach
- Engagement
- Posts
- Stories
- Reels
- Comments
- Shares
- Creative Performance

Warehouse

- meta_posts
- meta_post_metrics
- meta_story_metrics
- meta_reels

Reporting

- creative_summary
- marketing_daily_summary

---

## Web Analytics

| Integration | Collection | Status |
|------------|------------|--------|
| Google Analytics 4 | REST API | ✅ Production |

Warehouse

- ga4_daily_metrics

---

## Local Presence

| Integration | Collection | Status |
|------------|------------|--------|
| Google Business Profile | API | Planned |

---

## Contextual Data

| Integration | Collection | Status |
|------------|------------|--------|
| Weather | API | ✅ Production |
| Holidays | Planned | Planned |
| School Calendars | Planned | Planned |
| Community Events | Planned | Planned |

---

# Operations Intelligence

## Planned Integrations

- Reservations
- POS
- Labor
- Inventory

---

# Financial Intelligence

## Planned Integrations

- QuickBooks Online
- Xero
- Stripe

---

# Customer Intelligence

## Planned Integrations

- CRM
- HubSpot
- Salesforce
- Mailchimp

---

# Integration Standards

Every integration must:

- Authenticate securely
- Return structured JSON
- Avoid business logic
- Preserve historical data
- Support configuration over code
- Populate the warehouse
- Expose reporting views
- Be consumable by AI