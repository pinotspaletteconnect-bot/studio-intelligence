# Meta Multi-Account OAuth Migration — Phase 1

**Status:** Production cutover complete
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
6. **Complete:** Built workflows `27 - Meta Paid Vault Daily Import` (`z5Mww3blBHS89UYu`) and `28 - Meta Pages Vault Daily Import` (`7OMm5L5fprv3Lh5o`). The collector resolves the selected account through `/api/internal/meta-account`, so n8n passes only the non-secret SASHA account ID.
7. **Complete:** Controlled non-writing tests collected five ad accounts with zero failures and prepared mapped ad records. Page Insights collected 12 accessible Pages and 72 raw records, then prepared 24 records for the four mapped studio Pages. Unrelated assets were excluded by configuration mapping.
8. **Complete:** Controlled warehouse-writing reconciliation persisted exactly 12 ad rows across four mapped ad accounts and 24 Page Insight rows across four mapped Pages. The rows covered all four studios, retained the expected source dates, and introduced no extra records beyond the prepared shadow output.
9. **Complete:** Published both Vault-backed workflows and unpublished the legacy global-token workflows `05 - Meta Paid` (`EE5slmP6uSImQr1M`) and `06 - Meta Pages` (`ilZLXGAZVrpqAk4M`). The legacy workflows remain available for rollback.

## Token Lifecycle

SASHA performs the short-to-long-lived token exchange automatically and records the reported token and data-access expiration times. Meta can still require the owner to reauthorize because of password changes, revoked business access, security events, permission changes, or platform policy. The production health experience must warn before expiration and provide a one-click reconnect path; it must never imply that every Meta credential can be renewed indefinitely without owner participation.

## Production Guardrail

The Vault-backed workflows are now production. The former global-token workflows are retained unpublished for rollback and must not be republished unless the Vault-backed cutover is intentionally reversed.
