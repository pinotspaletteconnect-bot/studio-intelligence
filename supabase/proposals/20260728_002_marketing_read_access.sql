-- Studio Intelligence studio-scoped marketing read access
-- PROPOSAL ONLY: apply after 20260728_001_membership_foundation.sql.

begin;

drop policy if exists ga4_daily_metrics_select_authorized on public.ga4_daily_metrics;
create policy ga4_daily_metrics_select_authorized
  on public.ga4_daily_metrics
  for select
  to authenticated
  using (private.can_access_studio(studio_id::bigint));

drop policy if exists meta_ads_daily_select_authorized on public.meta_ads_daily;
create policy meta_ads_daily_select_authorized
  on public.meta_ads_daily
  for select
  to authenticated
  using (private.can_access_studio(studio_id::bigint));

drop policy if exists eulerity_daily_metrics_select_authorized on public.eulerity_daily_metrics;
create policy eulerity_daily_metrics_select_authorized
  on public.eulerity_daily_metrics
  for select
  to authenticated
  using (private.can_access_studio(studio_id::bigint));

-- Defense in depth for all existing public reporting views.
alter view public.marketing_daily_summary set (security_invoker = true);
alter view public.meta_ads_daily_summary set (security_invoker = true);
alter view public.vw_meta_ads_daily set (security_invoker = true);

-- A security-invoker view requires the caller to have access to its base tables.
-- Grant only the tables required by the current marketing view.
grant select on public.ga4_daily_metrics to authenticated;
grant select on public.meta_ads_daily to authenticated;
grant select on public.eulerity_daily_metrics to authenticated;

-- Grant the current dashboard view. Other views stay closed until needed.
grant select on public.marketing_daily_summary to authenticated;

commit;

