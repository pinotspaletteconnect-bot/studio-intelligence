# Rollback Guidance

These scripts are intended to be tested before production. Rollback should be executed only after identifying affected users and preserving incident/audit evidence.

## Roll back migration 002

Run in a transaction:

```sql
begin;

revoke select on public.marketing_daily_summary from authenticated;
revoke select on public.ga4_daily_metrics from authenticated;
revoke select on public.meta_ads_daily from authenticated;
revoke select on public.eulerity_daily_metrics from authenticated;

drop policy if exists ga4_daily_metrics_select_authorized on public.ga4_daily_metrics;
drop policy if exists meta_ads_daily_select_authorized on public.meta_ads_daily;
drop policy if exists eulerity_daily_metrics_select_authorized on public.eulerity_daily_metrics;

alter view public.marketing_daily_summary reset (security_invoker);
alter view public.meta_ads_daily_summary reset (security_invoker);
alter view public.vw_meta_ads_daily reset (security_invoker);

commit;
```

Resetting `security_invoker` restores the current view behavior. Because authenticated view grants are revoked first, ordinary users should not be able to reach the views after rollback.

## Roll back migration 001

Only roll back migration 001 after migration 002 has been rolled back.

```sql
begin;

revoke select on public.profiles from authenticated;
revoke select on public.organization_memberships from authenticated;
revoke select on public.studio_memberships from authenticated;
revoke select on public.organizations from authenticated;
revoke select on public.brands from authenticated;
revoke select on public.studios from authenticated;

grant execute on function public.update_updated_at_column() to public;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists organization_memberships_select_own on public.organization_memberships;
drop policy if exists studio_memberships_select_own on public.studio_memberships;
drop policy if exists organizations_select_authorized on public.organizations;
drop policy if exists brands_select_authorized on public.brands;
drop policy if exists studios_select_authorized on public.studios;

revoke execute on function private.is_active_user() from authenticated;
revoke execute on function private.is_platform_admin() from authenticated;
revoke execute on function private.can_access_organization(bigint) from authenticated;
revoke execute on function private.can_access_studio(bigint) from authenticated;
revoke usage on schema private from authenticated;

drop function if exists private.can_access_studio(bigint);
drop function if exists private.can_access_organization(bigint);
drop function if exists private.is_platform_admin();
drop function if exists private.is_active_user();

drop table if exists private.platform_admins;
drop table if exists public.studio_memberships;
drop table if exists public.organization_memberships;
drop table if exists public.profiles;

commit;
```

Do not drop the `private` schema automatically; another secure database feature may be using it by the time rollback is needed.

## Recovery checks

After rollback:

1. Confirm `anon` and `authenticated` still have no broad warehouse grants.
2. Confirm the service-role dashboard/ETL path still works.
3. Confirm no ordinary authenticated user can query business data.
4. Confirm account invitations are disabled or paused.
5. Record why rollback occurred and what must be corrected before retrying.
