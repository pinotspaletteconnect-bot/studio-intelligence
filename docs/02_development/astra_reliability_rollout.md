# Reporting reliability rollout — September 6, 2026

## Release source

Railway runs `codex/auth-onboarding`, not `main`. The pre-release revision is
`983bf6d` (Fix no-class comparison sales); the dashboard deployment is
`a5c73b9e-a550-4cc0-944a-6cf1c010f8c4`. This release is prepared on
`codex/astra-production-reliability`, based on that live branch.

The initial Astra review used the older root checkout at `d614a74`. Its proposed
replacement login/app-metadata grant model is **superseded and must not be
deployed**. Production already uses Supabase Auth, organization memberships,
roles, per-user studio grants, onboarding, and legal acceptance. Preserve that
system, the SASHA interface, and all production integrations. No account grant,
database migration, credential rotation, or infrastructure change is required.

## Changes

- Complete pagination with stable ordering for marketing, operations, product
  and class drill-downs, upcoming classes, reservations, studios, and operations'
  Homebase labor inputs. Errors and overlarge results reject partial totals.
- Reuse Eulerity daily rows for channel totals and class rows for lead-time
  totals. Preserve Meta's separate date contracts. No shared cache or claimed
  production latency improvement.
- Preserve current/historical precedence, no-class totals, third-party credits,
  labor reconciliation, display names, and placeholder filtering.
- Consistent completed Eastern calendar dates, including week/month presets,
  with invalid/reversed range rejection.
- Add service-level studio checks to existing API membership checks. Missing
  service scope defaults to no studios. API responses are private/no-store.
- Require the existing collector bearer credential for Meta/Eulerity collection
  and discovery; preserve public liveness. PTS uses the shared strict bearer
  check. Legacy collector Meta OAuth gains browser-bound one-use state and a
  configured redirect; production dashboard Vault-backed OAuth is preserved.
- Bundle existing Geist fonts locally and fix focused mobile/table lint issues.
  The existing locked Next.js 16.3.0 release is retained.

## Rollout and rollback

Production rollout was authorized by the user on September 6.

1. Preserve current Railway deployment and n8n published versions.
2. Bind encrypted `Studio Intelligence Collector` Header Auth to Meta Ads
   workflow `z5Mww3blBHS89UYu` and Meta Pages `7OMm5L5fprv3Lh5o`. Prior published
   Meta Ads version: `7cb06ac1-28e3-4280-8880-2292cedb7f21`. Verify the active
   Eulerity workflow uses this credential before releasing the collector.
3. Merge a verified PR into `codex/auth-onboarding` for Railway deployment.
   Do not deploy the older root checkout or change service roots.
4. Check both deployments, unauthenticated rejection, controlled Meta/Eulerity
   imports, and warehouse dates/counts.

Unpublished legacy backups remain unpublished. Bind the collector credential
before reactivating a backup. Do not remove guards to repair an import. Keep
the n8n header bindings on rollback; the previous collector accepts them.

Existing Vault-backed Meta connections need no reconnection. The old collector
OAuth entry point fails closed unless `META_REDIRECT_URI` is explicitly set to
the registered callback. No redirect setting or account access is changed here.

## Validation

- Dashboard: 30 regression tests, clean lint, and production build.
- Collector: 41 integration, queue, parser, bearer, and OAuth state tests.
- Read-only live 30/90-day reports: attribution counts match exact database
  counts; marketing spend and operations sales reconcile with independent
  source queries; upcoming-class output stays within the selected portfolio.
  The September 5 end date returned 1,803 and 4,241 attribution rows respectively.
- The live test is opt-in with `SI_VERIFY_LIVE=1` and existing dashboard
  environment configuration. Ordinary `npm test` skips it.
- Real-user sign-in/refresh/revocation was not retested; production session and
  membership flows are preserved. API/service tests cover authentication,
  denied cross-studio requests, and scoped portfolio/studio results.

## Deployment record

PR [#64](https://github.com/pinotspaletteconnect-bot/studio-intelligence/pull/64)
was merged into `codex/auth-onboarding` at
`3bbdf7c50a60cbd68e93f19f5a0b0fe27c51dedc`. Both Railway services report
**Active / Deployment successful** for this release:

- Dashboard: `cbee3b8e-c94f-4115-acc9-782e6c91dc6b`.
- Collector: `13e1aaf2-acf3-40a1-9b30-dac11502cf1f`.

The Meta Ads and Meta Pages workflows were published with the existing
`Studio Intelligence Collector` credential already selected by the active
Eulerity workflow `P3tQUsAYYpL3eEcD`. Final published version prefixes are
`777338ef` (Ads) and `0c03f71f` (Pages); the version name is
`Verified collector credential — September 6`.

Post-deployment read-only checks confirmed:

- Dashboard login responds successfully; unsigned studios, marketing, and
  operations API requests redirect to login with private/no-store headers.
- Collector liveness responds successfully. Unsigned Meta configuration and
  Meta/Eulerity collection requests return 401. Invalid legacy OAuth callbacks
  return 400.
- Anonymous requests to three reporting views return 401 without rows.

The root checkout's local collector diagnostic token returned 401; it has not
been established to match the production credential. No token was rotated.
Authenticated import validation must use the existing production credential.

Controlled post-release imports remain pending. Automatic approval review
rejected execution because it would write production warehouse records and
requires explicit approval beyond the general deployment request. No test
import ran. The prior Meta Pages execution `113025` succeeded before this
release; it does not validate the new collector guard.
