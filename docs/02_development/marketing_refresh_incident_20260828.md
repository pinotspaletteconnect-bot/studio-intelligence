# Meta and Eulerity morning refresh incident — August 28, 2026

## Verified failure

- Meta workflow `27 - Meta Paid Vault Daily Import`, execution `109972`,
  failed at 04:30 Eastern; August 27 execution `109578` also failed.
- Eulerity workflow `24 - Eulerity Vault Daily Import`, execution `109976`,
  failed at 05:00 Eastern after successful manual recovery on August 27.
- Both collectors reported credential broker HTTP 404. Dashboard Railway logs
  identify `targetCode: PGRST303`; credential and account error codes were absent.
  This is a Supabase JWT-claims validation rejection on the target read, not a
  missing broker route. The broker incorrectly collapsed all upstream errors
  into 404.
- Direct, fresh reads of both collection-target views succeeded, including the
  exact account-1 filters. All four studio mappings remain present. The precise
  upstream reason for the intermittent JWT rejection is not established;
  token expiry, cache behavior, or clock skew must not be stated as proven.
- Before recovery: Meta source data ended August 25; Eulerity ended August 26.
  GA4 refreshed August 28. The legacy `eulerity_daily_spend` table is not present
  in the live REST schema; current dashboard spend uses `eulerity_daily_metrics`.

## Targeted repair

Only the Meta and Eulerity broker routes use a new request-scoped service
client. It preserves the configured server secret and existing broker-token
authorization, disables session persistence/refresh, and explicitly disables
fetch caching. Each read can retry `PGRST303` twice, after 250ms and 750ms.
Retries reconstruct the query; they do not replay warehouse writes or collector
jobs. Other errors are not retried. Exhausted upstream failures return 503
without credentials; genuinely missing account results remain 404.

No credential rotation, schema migration, service/root change, or user-login
change is part of this repair. Other integrations retain their existing clients.

## Verification and rollout

- 19 local regression tests passed: transient and persistent JWT rejection,
  other failures, cache headers, authorization guards, response confidentiality,
  and both route contracts.
- Dashboard lint passed with one existing TanStack/React Compiler warning.
- Production build passed with placeholder configuration; no live sources were
  queried by the build. The initial sandboxed build could not fetch fonts; the
  network-enabled build passed.
- User explicitly approved the targeted production repair and backfill.
- Deploy by fast-forwarding the existing `codex/auth-onboarding` deployment
  branch; preserve Railway configuration. Rollback is a focused Git revert.
- Recovery uses existing n8n loaders, one Meta source date at a time to avoid
  multi-day aggregation. Preserve the published schedules and original draft
  parameters after controlled backfill. Verify warehouse rows and totals per
  studio and source date, not just n8n execution status.
- Deployment and backfill validation are pending until recorded below.

Future scheduled-run success remains unverified until the next morning run.
