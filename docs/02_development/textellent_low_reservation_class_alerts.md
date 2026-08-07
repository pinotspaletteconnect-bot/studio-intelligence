# Textellent Low-Reservation Class Alerts

## Purpose

Warn purchasers when a public PTS class has more than zero and fewer than the
configured minimum reservation threshold (three by default). DIY Pop in and Paint,
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

## Workflow artifact

Import `n8n/workflows/14-textellent-low-reservation-class-alerts.json` as workflow
`14 - Textellent Low Reservation Class Alerts`. Before publishing:

1. Configure `SASHA_DASHBOARD_URL` and `PTS_COLLECTOR_URL` in the n8n runtime.
2. Attach the `SASHA Internal Automation` HTTP Header Auth credential containing
   the shared `PTS_SECRET_BROKER_TOKEN` bearer value.
3. Attach the `Studio Intelligence Collector API` HTTP Header Auth credential
   containing the Railway `COLLECTOR_API_TOKEN` bearer value.
4. Keep success and error execution payload retention disabled.
5. Run the workflow manually with all studio rules disabled and verify it exits
   after account discovery without calling the collector.
6. Enable one studio for a scheduled preview validation. Disable it again before
   publishing unless customer sends have been explicitly approved.

The workflow discovers enabled PTS accounts and their studio time zones from
SASHA, previews each distinct account-local date, claims every class through the
database before execution, and completes the phone-free delivery audit. Preview
requests may retry. Execute requests must not retry automatically because an
ambiguous response after a partial vendor send could duplicate a customer text.
