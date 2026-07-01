# Architecture

## Pipeline
GA4 / Google Ads / Meta / Eulerity / Reservation System / POS
        ↓
       n8n
        ↓
    Supabase
        ↓
 Dashboards / AI / APIs

## Multi-tenant Model
Company
  -> Studio
      -> Data Source
          -> Daily Metrics

Every integration should identify the company and studio so the platform scales to many businesses.