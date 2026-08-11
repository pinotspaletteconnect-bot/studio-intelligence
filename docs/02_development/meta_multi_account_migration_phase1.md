# Meta Multi-Account OAuth Migration — Phase 1

**Status:** Foundation deployed; owner connection and four-studio asset mapping verified; shadow workflows pending
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
- The production authorization request uses only the permissions accepted by Facebook Login for Business: `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement`, and `read_insights`. Linked Instagram professional accounts are discovered through accessible Page assets rather than requesting the incompatible `instagram_basic` permission.

## Required Production Configuration

- `META_APP_ID`
- `META_APP_SECRET`
- `META_OAUTH_STATE_SECRET`
- Optional `META_GRAPH_VERSION` (defaults to `v25.0`)
- `META_SECRET_BROKER_TOKEN` or an approved shared broker-token fallback
- Meta Valid OAuth Redirect URI: `https://<sasha-domain>/api/integrations/meta/callback`

## Controlled Cutover Sequence

1. **Complete:** Deployed migrations `20260811200000_meta_multi_account_oauth.sql` and `20260811210000_fix_meta_asset_mapping_selection.sql`.
2. **Complete:** Configured dashboard environment variables and the exact redirect URI in the Meta developer application.
3. **Complete:** Deployed the dashboard and confirmed the Meta Settings section without affecting existing production collectors.
4. **Complete:** Connected the current owner account, stored its credential in Vault, and discovered 22 accessible assets.
5. **Complete:** Mapped the intended ad account and Facebook Page for Gilbert, Jeffersonville, Short North, and St. Matthews. Unrelated discovered assets remain unmapped.
6. **Next:** Build unpublished Meta Ads and Page Insights shadow workflows that resolve one account through `/api/internal/meta-account` and pass its credential only to the collector request.
7. Execute controlled, non-writing discovery tests, followed by warehouse-writing reconciliation tests.
8. Publish the Vault-backed workflows only after counts and metrics reconcile; retain unpublished legacy backups for rollback.

## Token Lifecycle

SASHA performs the short-to-long-lived token exchange automatically and records the reported token and data-access expiration times. Meta can still require the owner to reauthorize because of password changes, revoked business access, security events, permission changes, or platform policy. The production health experience must warn before expiration and provide a one-click reconnect path; it must never imply that every Meta credential can be renewed indefinitely without owner participation.

## Production Guardrail

The migration, dashboard environment changes, Meta application changes, and n8n workflow changes each require explicit approval. The existing global-token workflows remain production until the controlled reconciliation is complete.
