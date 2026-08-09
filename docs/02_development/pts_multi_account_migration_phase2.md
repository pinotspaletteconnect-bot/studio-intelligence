# PTS Multi-Account Migration — Phase 2 Shadow Dispatcher

**Built:** August 9, 2026

**Production behavior:** Unchanged

**Workflow:** `15 - PTS Multi-Account Shadow Dispatcher` (`m9v7NXpkX9SDulqa`)

## Purpose

The dispatcher converts the service-only `pts_collection_targets` view into one validated job per active PTS account. It is an orchestration boundary only: it does not retrieve credentials, call PTS, write warehouse data, or contain a schedule.

## Input source

`pts_collection_targets` supplies active account-to-studio configuration. The workflow requests only:

- organization, account, brand, and studio identifiers;
- studio code, name, and timezone;
- PTS location identifier;
- non-secret report configuration.

The view is restricted to the Supabase service role. The workflow uses the existing encrypted n8n `Supabase account` credential. No secret value or Vault reference is returned in workflow output.

## Output contract

Each output item has this structure:

```json
{
  "dispatcherVersion": 1,
  "organizationId": 1,
  "accountId": 1,
  "studioCount": 2,
  "studioTargets": [
    {
      "studioId": 1,
      "brandId": 1,
      "studioCode": "GIL",
      "studioName": "Gilbert",
      "timezone": "America/Phoenix",
      "ptsLocationId": "source-location-id",
      "reports": {}
    }
  ]
}
```

`accountId` is an opaque internal identifier used by the collector credential broker. It is not a username, password, token, Vault UUID, or external PTS credential.

## Fail-closed validation

The dispatcher stops before producing jobs when:

- no active targets are returned;
- a required account, organization, brand, studio, timezone, or PTS location field is missing;
- an identifier is not a safe integer;
- one studio is assigned to multiple active PTS accounts;
- an account crosses organization boundaries.

Studios and account jobs are sorted deterministically to make parity output easy to compare.

## Safety characteristics

- No schedule trigger.
- No PTS collector request.
- No warehouse write.
- No credential retrieval or logging.
- No changes to workflows 05, 06, 07, 12, or 13.
- Supports both manual validation and invocation by later unpublished shadow workflows.

## Phase 2 gates

- [x] Configuration-driven source identified.
- [x] One job emitted per active PTS account.
- [x] Allowed studios included explicitly.
- [x] Secret material excluded from input and output.
- [x] Incomplete and cross-tenant mappings rejected.
- [x] Workflow has no schedule and cannot change warehouse data.
- [x] Live manual execution confirms the production `pts_collection_targets` view is deployed and returns the expected current-account job.

The August 9, 2026 manual execution read four active studio targets and emitted
one validated account job. The workflow remained unpublished after the test.
This confirms that the production view is deployed for the current four-studio
account without calling PTS or writing warehouse data.
