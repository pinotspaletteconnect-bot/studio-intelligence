-- READ ONLY. Run immediately after approved proposal, before config insertion.
select to_regclass('public.ga4_party_funnel_configs') as configs,
       to_regclass('public.ga4_party_funnel_periods') as periods,
       to_regclass('public.ga4_party_funnel_reporting') as reporting;
select relname, relrowsecurity from pg_class
where oid in ('public.ga4_party_funnel_configs'::regclass,'public.ga4_party_funnel_periods'::regclass);
select role_name, object_name,
  has_table_privilege(role_name, 'public.' || object_name, 'SELECT') as can_select,
  has_table_privilege(role_name, 'public.' || object_name, 'INSERT') as can_insert,
  has_table_privilege(role_name, 'public.' || object_name, 'UPDATE') as can_update,
  has_table_privilege(role_name, 'public.' || object_name, 'DELETE') as can_delete
from (values ('anon'),('authenticated'),('service_role')) roles(role_name)
cross join (values ('ga4_party_funnel_configs'),('ga4_party_funnel_periods'),('ga4_party_funnel_reporting')) objects(object_name)
order by role_name, object_name;
select count(*) as config_rows from public.ga4_party_funnel_configs;
select count(*) as period_rows from public.ga4_party_funnel_periods;
-- Expected: three objects present, both tables RLS=true, config_rows=0,
-- period_rows=0. anon/authenticated all false; service_role config S/I/U only,
-- periods S/I only; reporting S only. PUBLIC grants were explicitly revoked.
