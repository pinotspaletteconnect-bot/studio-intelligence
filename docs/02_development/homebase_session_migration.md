# Homebase Encrypted Browser Session Migration

## Purpose

Homebase accepts the owner credentials in a normal browser but rejects a fresh
login from Railway's headless browser. The collector will run Chromium under a
virtual display, capture the successful Homebase session, encrypt it in
Supabase Vault, and reuse it for later daily collections.

## Security boundaries

- Only cookies and origins belonging to `joinhomebase.com` are accepted.
- The serialized session is limited to 256 KiB and is never logged or returned
  to dashboard users.
- The session broker requires the existing Homebase broker bearer token.
- Each session update rotates the Vault secret and deletes the superseded one.
- Employee identity remains transient collector data and is not stored.

## Rollout

1. Apply migration `20260813200000_homebase_encrypted_browser_session.sql`.
2. Deploy the dashboard session-broker route.
3. Deploy the collector image with `xvfb-run` and `HOMEBASE_HEADLESS=false`.
4. Run the unpublished Homebase import manually.
5. Verify the session was stored, all four studio/date ranges loaded, and no
   employee-level data entered the warehouse.
6. Publish the daily workflow only after reconciliation succeeds.

## Rollback

1. Keep the daily workflow unpublished or unpublish it.
2. Restore the prior collector deployment, which ignores stored session state.
3. The encrypted session can remain in Vault because the prior collector does
   not use it, or credentials can be cleared with the existing reset operation.
4. No warehouse rollback is required unless a controlled import wrote invalid
   totals; the load route atomically replaces the requested date range.
