# Tenant-Isolation Verification

Run these tests in development or staging before inviting production users.

## Test identities

Create accounts through Supabase Auth:

| User | Membership |
| --- | --- |
| User A | `studio_viewer` for Studio A |
| User B | `studio_viewer` for Studio B |
| Organization Admin | `organization_admin` for the organization containing A and B |
| No-access User | Active profile, no membership |
| Disabled User | Studio A membership, `profiles.active = false` |

Use existing non-sensitive development studios or synthetic test studios. Do not copy production user data into a development project.

## Required database/API results

| Test | Expected |
| --- | --- |
| Logged-out request lists studios | No rows / unauthorized |
| User A lists studios | Studio A only |
| User A requests Studio A marketing data | Allowed |
| User A changes `studioId` to Studio B | No rows or HTTP 403 |
| User A requests `"all"` | Only User A’s authorized studios |
| User B requests Studio A | No rows or HTTP 403 |
| Organization Admin lists studios | Studios A and B only |
| No-access User lists studios | No rows |
| Disabled User requests Studio A | No rows |
| Membership is removed during a session | Next authorized request loses access |
| Reporting view queried directly as User A | Studio A rows only |
| Raw base table queried directly as User A | Studio A rows only |
| `studio_integrations` queried as a normal user | Denied |
| `integration_runs` queried as a normal user | Denied |
| Global mapping/reference tables queried | Denied unless separately approved |

## Application tests

1. The login route verifies email status and handles invalid credentials without revealing whether an account exists.
2. Protected pages redirect logged-out users.
3. API routes return `401` when no valid session exists.
4. API routes return `403` for an unauthorized studio identifier.
5. The studio selector is populated from authorized database results.
6. The browser receives no service-role key or server secret.
7. The browser bundle contains only the Supabase URL and publishable/anon key.
8. Server logs do not include tokens, cookies, passwords, or full query results.
9. Password reset, logout, account suspension, and session revocation work.
10. Invite-only behavior is confirmed; open public registration remains disabled.

## Negative regression requirement

For each protected API route, add a test that:

1. Authenticates as User A.
2. Sends Studio B’s valid identifier.
3. Confirms no Studio B data is returned.

The test must use a real valid identifier belonging to another tenant. Testing only missing or malformed identifiers does not prove tenant isolation.

## Release gate

Do not issue production credentials until:

- Every test above passes.
- The dashboard no longer uses the service role for ordinary user requests.
- Reporting views use `security_invoker`.
- The live schema is re-audited after migration.
- A second reviewer inspects the migration and authorization code.
- Rollback has been rehearsed in development or staging.

