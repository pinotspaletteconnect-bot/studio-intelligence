# Studio Intelligence Changelog

## 2026-07-01

### Added
- Created GitHub repository for Studio Intelligence.
- Added project blueprint, architecture, roadmap, and current status documentation.
- Connected n8n to Google Analytics 4 using OAuth.
- Enabled the Google Analytics Data API.
- Configured Google OAuth redirect URI and test user.
- Verified successful GA4 API access from n8n.
- Created Supabase `studios` and `studio_integrations` tables.
- Registered all four Pinot's Palette studios.
- Mapped all four GA4 Property IDs to their respective studios.
- Replaced the GA4 node with direct Google Analytics Data API HTTP requests.
- Built a reusable dynamic ETL pipeline that loops through every active studio.
- Added UPSERT support into `ga4_daily_metrics` using `(studio_id, date)`.
- Added daily warehouse metrics: total users, new users, sessions, page views, engaged sessions, engagement rate, average session duration, key events, session key event rate, and total revenue.

### Changed
- Architecture changed from a single hard-coded GA4 property to a configuration-driven multi-studio design.
- Studio configuration is now stored in Supabase instead of n8n workflow settings.
- Production workflow now uses the Google Analytics Data API directly instead of the built-in GA4 node due to node limitations with dynamic properties and metrics.

### Current State
- Workflow 02 returns active integrations from Supabase.
- Workflow 03 dynamically imports GA4 metrics for any configured studio.
- Daily metrics are normalized and written into Supabase.
- Foundation is complete for adding additional integrations using the same ETL pattern.

### Next Session
1. Build Google Ads ETL.
2. Reuse the same loop/API/normalize/upsert architecture.
3. Schedule automated daily imports.
4. Build reporting dashboards.
5. Expand to Meta Ads, Eulerity, reservation system, and additional data sources.

v0.3.0 – Eulerity Playwright Complete

Multi-studio browser automation complete
Metrics download complete
Spend download complete
Budget extraction complete
Metrics parser complete
Spend parser complete
Budget parser complete
Express API returns normalized JSON
Ready for n8n ETL

Output one complete daily record

Then the existing Studio Lookup and Upsert remain unchanged.

CHANGELOG.md
2026-07-06
Added
Railway-hosted Playwright integration
Eulerity Metrics import
Eulerity Spend import
Budget Allocation extraction
Studio lookup in n8n
Successful UPSERT into Supabase
Expanded Eulerity warehouse schema
Changed

Architectural decision:

Old:

advertising_daily_channel_metrics

New:

eulerity_daily_metrics

Each provider maintains its own normalized warehouse table.