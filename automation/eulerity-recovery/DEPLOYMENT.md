# Account 1 gated collector deployment plan

Status: candidate code only. Keep shared workflow24 paused. No HB discovery, collection, synchronization, mapping edits or shared-template changes are authorized by this plan.

## Isolation boundary

Existing `/eulerity/discover` and `/eulerity/download` still load the exact deployed legacy route/browser source from cf164fb. The repaired module is loaded only through:

- `POST /eulerity/account1-recovery/discover`
- `POST /eulerity/account1-recovery/download`

Both require the existing collector Bearer authentication. Their fixed recovery authorization accepts only numeric1 or string"1" and rejects every other account before resolving credentials. The broker result must identify account1/org1. Download uses only broker-configured account1/org1 targets; request-body targets are ignored. This is an account authorization boundary, not a hardcoded studio mapping. No new environment variables, credential scopes, broker configuration, deployment roots or paid services are introduced.

The new module retains strict discovery and __single__ checks. HB continues on the unchanged legacy implementation. The generic workflow guard snippets must not be installed on HB's path: a literal __single__ baseline is intentionally not treated as a discovered campaign identity or auto-migrated.

## Review and candidate validation

1. Independently review the PR and verify legacy module/route source hashes and account rejection tests. Confirm only one server mount was added, before the existing generic mount.
2. Parent/operator supplies the approved candidate service URL/version. No candidate deployment or Railway configuration changes are performed by this task. The local gated JSON currently uses the original service origin with the NEW recovery paths; it is not executable against old production code. For an isolated candidate host, change only the collector origin on Discover Eulerity Locations (and Railway for metric dry-run), retaining the gated paths and existing auth credential references. Do not point the shared daily template at them.
3. Update only the unpublished manual discovery probe sk0QPKpUhZ6vrp7N or import the new gated probe as a separate unpublished copy. Execute the authenticated discovery-only probe against the approved candidate. It reads verified mappings6–9 directly from studio_integrations and rejects missing or changed configured source keys before any sync. Its graph contains no sync, metric download or warehouse-upsert nodes. Require exactly the four historical account1 identities. Do not execute the old ungated artifact.
4. Independently verify the candidate build/version, probe output and nonaccount1 rejection. A401 indicates auth was not supplied; a403 is the intended authenticated account2 rejection. Never use account2 credentials to test rejection: send accountId2 with the existing collector test request and verify no broker/browser calls in candidate diagnostics.
5. Only after the parent's explicit review/rollout decision may production merge/deployment occur. There is no claim that the live candidate credential/login probe has passed yet.

## Recovery after candidate acceptance

Use only the local GATED recovery copy. It is inactive/manual-only, filters account1/org1 before discovery, preserves original credentials and transformations, keeps dormant nodes disabled, fixes dates to Nov9–15 and disconnects BOTH source sync and metric upsert. Its28-row coverage check requires all four studios across all seven dates. Inactive source mappings can correctly stop this dry-run before collection; restoring them is a separate parent-controlled, verified action. Do not bypass the guard or change mappings through the collector.

Parent controls exact account1 source restoration, source reconciliation, source-sync review, failure alert verification, warehouse-write connection, idempotent rerun and any schedule resumption. Preserve account2/HB, both __single__ records, prior facts and the unchanged shared workflow throughout. No normal shared sync is safe merely because account1 recovery passes.
