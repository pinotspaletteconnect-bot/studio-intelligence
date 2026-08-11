# Meta Multi-Account OAuth Migration — Phase 1

**Status:** Implemented locally; not deployed
**Date:** August 11, 2026

## Objective

Replace the single global Meta token with owner-authorized, tenant-scoped OAuth connections without changing the working Meta Ads or Page Insights production workflows during foundation work.

## Implemented Foundation

- Owner/admin **Continue with Meta** flow in SASHA Settings.
- Automatic authorization-code and long-lived-user-token exchange.
- Vault-only storage of the resulting credential; Facebook passwords and Page access tokens are not persisted by SASHA.
- Discovery of accessible business portfolios, ad accounts, Facebook Pages, and linked Instagram professional accounts.
- Explicit mapping of reporting assets to SASHA studios.
- Service-only collection account/target views and an authenticated internal secret broker for future n8n shadow workflows.
- Collector support for a per-request Meta credential while preserving the existing environment-token behavior for production rollback.
- Expiration and data-access-expiration fields for connection-health monitoring and reconnect warnings.

## Required Production Configuration

- `META_APP_ID`
- `META_APP_SECRET`
- `META_OAUTH_STATE_SECRET`
- Optional `META_GRAPH_VERSION` (defaults to `v25.0`)
- `META_SECRET_BROKER_TOKEN` or an approved shared broker-token fallback
- Meta Valid OAuth Redirect URI: `https://<sasha-domain>/api/integrations/meta/callback`

## Controlled Cutover Sequence

1. Review and deploy migration `20260811200000_meta_multi_account_oauth.sql`.
2. Configure dashboard environment variables and the exact redirect URI in the Meta developer application.
3. Deploy the dashboard and confirm the Meta Settings section renders with no effect on existing production collectors.
4. Connect the current owner account and verify discovered assets without changing existing mappings.
5. Build unpublished Meta Ads and Page Insights shadow workflows that resolve one account through `/api/internal/meta-account` and pass its credential only to the collector request.
6. Map the four current studios and execute controlled, non-writing discovery tests, followed by warehouse-writing reconciliation tests.
7. Publish the Vault-backed workflows only after counts and metrics reconcile; retain unpublished legacy backups for rollback.

## Token Lifecycle

SASHA performs the short-to-long-lived token exchange automatically and records the reported token and data-access expiration times. Meta can still require the owner to reauthorize because of password changes, revoked business access, security events, permission changes, or platform policy. The production health experience must warn before expiration and provide a one-click reconnect path; it must never imply that every Meta credential can be renewed indefinitely without owner participation.

## Production Guardrail

The migration, dashboard environment changes, Meta application changes, and n8n workflow changes each require explicit approval. The existing global-token workflows remain production until the controlled reconciliation is complete.
