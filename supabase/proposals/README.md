# Studio Intelligence Authentication and Tenant-Isolation Proposal

**Status:** Proposed only. Nothing in this package has been applied to Supabase.

This package is based on the metadata export generated on July 28, 2026. The live inventory showed:

- 17 public tables with Row Level Security enabled
- No RLS policies
- No grants to `anon` or `authenticated`
- Three reporting views owned by `postgres` without `security_invoker`
- No user, organization-membership, or studio-membership model

The current database is therefore closed to ordinary users, but it cannot yet grant safe studio-specific access.

## Proposed model

```text
auth.users
  └─ public.profiles

public.organizations
  └─ public.organization_memberships

public.studios
  └─ public.studio_memberships

private.platform_admins
```

Roles:

| Scope | Role | Intended access |
| --- | --- | --- |
| Platform | `platform_admin` | All organizations and studios; internal use only |
| Organization | `organization_admin` | All studios in one organization |
| Organization | `organization_viewer` | Read-only access to all studios in one organization |
| Studio | `studio_manager` | Read access to one studio; future limited management |
| Studio | `studio_viewer` | Read-only access to one studio |

No authenticated role receives write access to business facts in this first slice. ETL continues using the service role. Account and membership administration should initially use a tightly controlled server-side administrative service.

## Package contents

- `20260728_001_membership_foundation.sql` — identities, memberships, private authorization helpers, and hierarchy policies
- `20260728_002_marketing_read_access.sql` — studio-scoped marketing policies, secure reporting views, and minimum read grants
- `ROLLBACK.md` — rollback order and recovery considerations
- `TENANT_ISOLATION_TESTS.md` — required pre-login verification

## Required review before applying

1. Confirm a backup/restoration point.
2. Confirm `auth.users` is the intended identity source.
3. Confirm the role names and whether organization-wide viewers are needed.
4. Confirm studio `organization_id` and `brand_id` are populated consistently.
5. Confirm the dashboard will move from `SUPABASE_SERVER_SECRET` to a user-scoped SSR client at the same release gate.
6. Test both migrations in a development or staging Supabase project.
7. Run the tenant-isolation test matrix with two studios and at least three test users.
8. Review the three reporting views after setting `security_invoker`.

## Deployment order

1. Apply migration 001 in development/staging.
2. Create test users through Supabase Auth.
3. Add test memberships using a trusted administrative path.
4. Apply migration 002.
5. Run the isolation tests.
6. Update the Next.js dashboard to use Supabase SSR and the user session.
7. Repeat the full test matrix.
8. Obtain explicit production approval.
9. Apply migrations in production.
10. Invite the first real user only after verification succeeds.

## Important boundaries

- These migrations do not enable open sign-up.
- These migrations do not create real users.
- These migrations do not alter or delete business rows.
- These migrations do not grant users access to integration configuration, integration runs, global mapping tables, or raw operational administration.
- The service role continues to bypass RLS and must remain restricted to trusted backend processes.

