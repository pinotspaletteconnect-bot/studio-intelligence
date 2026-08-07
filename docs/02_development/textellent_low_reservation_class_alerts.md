# Textellent Low-Reservation Class Alerts

## Purpose

Warn purchasers when a public PTS class has more than zero and no more than the
configured reservation threshold (two by default). DIY Pop in and Paint,
private parties, mobile parties, and marketing events are excluded.

## Schedule

n8n should run every 10 minutes. For each configured PTS account it calls the
authenticated collector twice:

1. Preview `POST /pts/low-reservation-class-alerts` with `execute: false`.
2. Claim each returned class through `POST /api/internal/class-alert-audit`.
3. Execute only successfully claimed IDs with `execute: true` and
   `approvedClassIds`.
4. Complete each audit row with the privacy-safe collector result.

The due time is the later of class start minus the configured lead time and the
studio-local earliest send time. Defaults are six hours and 8:00 AM.

## Privacy and safety

- The PTS Seating Chart is read only after a live reservation recheck.
- Purchaser phone numbers are normalized and deduplicated in collector memory.
- Phone numbers, names, emails, and message bodies never enter Supabase, n8n
  execution output, or application logs.
- Textellent receives one direct send per unique purchaser number with
  `ignoreQuietHours: false`.
- Live execution is rejected unless n8n supplies database-claimed class IDs.
- The unique `(studio_id, source_class_id)` audit key prevents duplicate sends.
- Automation and all studio settings default to disabled.

## Textellent routing

Textellent accounts are independent reusable connections. A studio assignment
chooses the account and sending number. St. Matthews and Jeffersonville should
both be assigned to the St. Matthews connection. Short North and Gilbert use
their own connections.

## Required deployment configuration

- `20260805190000_pts_vault_credentials.sql` and `20260807190000_textellent_class_alerts.sql` were applied August 7, 2026.
- Set `CLASS_ALERT_CONTEXT_URL` on Railway to the dashboard internal context endpoint.
- Reuse the protected `PTS_SECRET_BROKER_TOKEN` on Railway and the dashboard.
- Add Textellent accounts through SASHA so API auth codes enter Supabase Vault.
- Keep n8n execution payload retention disabled for this workflow as defense in depth.
- Perform preview validation and controlled non-customer test sends before any studio is enabled.
