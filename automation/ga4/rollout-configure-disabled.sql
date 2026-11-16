-- Run ONLY after successful additive proposal application and target review.
-- Resolves identities from the existing private active mapping; never guesses.
-- Requires exactly one matching studio/account/property target.
begin;
do $$
begin
  if (select count(*) from public.ga4_collection_targets where property_id='354847068') <> 1 then
    raise exception 'Stop: expected exactly one reviewed active St Matthews property target';
  end if;
end $$;
insert into public.ga4_party_funnel_configs
  (studio_id, account_id, property_id, path_prefix, definition_version, geography, comparable_history_start, enabled)
select studio_id, account_id, property_id, '/louisville/parties', 2, 'US', null, false
from public.ga4_collection_targets where property_id='354847068';
commit;

select studio_id, account_id, property_id, path_prefix, definition_version, geography, enabled
from public.ga4_party_funnel_configs where property_id='354847068';

select relname, relrowsecurity from pg_class
where oid in ('public.ga4_party_funnel_configs'::regclass,'public.ga4_party_funnel_periods'::regclass);
select table_name, grantee, privilege_type from information_schema.table_privileges
where table_schema='public' and table_name in ('ga4_party_funnel_configs','ga4_party_funnel_periods','ga4_party_funnel_reporting')
order by table_name,grantee,privilege_type;
-- Expected: disabled config v2/US; both tables RLS enabled; no PUBLIC/anon/
-- authenticated grants. Do not enable until controlled data reconciliation.
