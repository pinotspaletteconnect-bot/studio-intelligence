2026-07-06 Progress
Major Milestone

The first end-to-end Eulerity → Supabase ETL pipeline is operational.

Current flow:

Railway Playwright
        ↓
Downloads Metrics CSV
Downloads Spend CSV
Reads Budget Allocation
        ↓
n8n
        ↓
Split by Studio
        ↓
Expand Daily Metrics
        ↓
Lookup Studio ID
        ↓
Attach Studio ID
        ↓
Upsert Eulerity Daily Metrics
        ↓
Supabase
Completed
✅ Railway-hosted Playwright service operational
✅ Eulerity login automation stable
✅ Metrics CSV download
✅ Spend CSV download
✅ Budget allocation extraction
✅ Studio lookup against studios
✅ Studio code standardization
STM
GIL
JEF
SN
✅ Upsert into eulerity_daily_metrics
✅ Expanded eulerity_daily_metrics schema to support:
Spend
CPC
Budget allocation
(CPM columns planned)
Current Architecture Decision

One normalized table per vendor.

Example:

ga4_daily_metrics

eulerity_daily_metrics

soci_daily_metrics

pos_daily_metrics

Reporting views will combine sources later.

No generic advertising table.

Current Blocker

The workflow currently inserts:

Impressions
Clicks
CTR

The workflow already downloads Spend and Budget Allocation, but those values are not yet merged into each daily record before the Upsert.

Next Task

Replace Expand Daily Metrics with a richer transformation node:

Build Eulerity Daily Records

Responsibilities:

Merge Metrics
Merge Spend
Merge Budget Allocation
Allocate spend by channel
Calculate CPC
Calculate CPM
Output one complete daily record

Then the existing Studio Lookup and Upsert remain unchanged.