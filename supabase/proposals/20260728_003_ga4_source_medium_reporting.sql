-- Reporting layer for the existing marketing_attribution_daily fact table.
-- REVIEW BEFORE APPLYING. This migration is additive and does not load data.

begin;

insert into public.marketing_source_mapping
  (source, medium, vendor, marketing_type, traffic_category, active, priority)
values
  ('eulerity', 'ads', 'Eulerity', 'Paid', 'Paid Multi-Channel', true, 10)
on conflict (source, medium) do update
set vendor = excluded.vendor,
    marketing_type = excluded.marketing_type,
    traffic_category = excluded.traffic_category,
    active = excluded.active,
    priority = excluded.priority,
    updated_at = now();

create or replace view public.ga4_source_medium_performance
with (security_invoker = true)
as
select
  fact.organization_id,
  fact.brand_id,
  fact.studio_id,
  fact.attribution_date as report_date,
  fact.source,
  fact.medium,
  coalesce(mapping.vendor, 'Unmapped') as vendor,
  coalesce(mapping.marketing_type, 'Unmapped') as marketing_type,
  coalesce(mapping.traffic_category, 'Unmapped') as traffic_category,
  fact.users as total_users,
  fact.new_users,
  fact.sessions,
  fact.engaged_sessions,
  fact.page_views,
  fact.engagement_rate,
  fact.average_session_duration,
  fact.key_events,
  fact.session_key_event_rate,
  fact.revenue as total_revenue
from public.marketing_attribution_daily fact
left join public.marketing_source_mapping mapping
  on mapping.active is true
 and lower(mapping.source) = lower(fact.source)
 and lower(mapping.medium) = lower(fact.medium);

revoke all on table public.ga4_source_medium_performance from anon, authenticated;
grant select on table public.ga4_source_medium_performance to service_role;

comment on view public.ga4_source_medium_performance is
  'GA4 daily session source/medium performance enriched by governed marketing classification.';

commit;
