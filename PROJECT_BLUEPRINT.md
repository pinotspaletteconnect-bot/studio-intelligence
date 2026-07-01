# Studio Intelligence Project Blueprint

## Vision
Build a multi-tenant business intelligence platform for Pinot's Palette and other studios.

## Current Status
- Supabase connected to n8n.
- Google Analytics 4 OAuth connected.
- Successfully retrieved GA4 metrics from one studio.

## Architecture
Data Sources -> n8n -> Supabase -> Dashboard/API

## Phase 1
- GA4 imports
- Supabase schema
- Multi-studio support
- Scheduled daily imports

## Future Sources
- Pinot's Palette reservation system
- Eulerity
- Google Ads
- Meta Ads
- SOCi
- POS

## Principle
Every integration should support multiple studios and multiple customers without redesign.