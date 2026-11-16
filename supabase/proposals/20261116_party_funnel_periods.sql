-- UNAPPLIED PROPOSAL. Requires owner approval, backup and migration review.
-- No seed assumes an internal studio/account identity from a property number.
begin;
create table public.ga4_party_funnel_configs (
  studio_id bigint primary key references public.studios(id),
  account_id bigint not null,
  property_id text not null check (property_id ~ '^[0-9]+$'),
  path_prefix text not null check (path_prefix ~ '^/[a-z0-9-]+/parties$'),
  definition_version integer not null default 2 check (definition_version = 2),
  geography text not null default 'US' check (geography = 'US'),
  comparable_history_start date,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.ga4_party_funnel_periods (
  studio_id bigint not null references public.ga4_party_funnel_configs(studio_id),
  property_id text not null,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  definition_version integer not null check (definition_version = 2),
  geography text not null check (geography = 'US'),
  retrieved_at timestamptz not null,
  report jsonb not null check (jsonb_typeof(report) = 'object'),
  source_quality jsonb not null,
  primary key(studio_id, property_id, period_start, period_end, definition_version, geography, retrieved_at),
  check (report->>'studioId' = studio_id::text),
  check (report->'period'->>'startDate' = period_start::text),
  check (report->'period'->>'endDate' = period_end::text),
  check (report->>'availability' = 'verified'),
  check (report->>'geography' = 'US'),
  check (report->>'definitionVersion' = '2')
);
create index on public.ga4_party_funnel_periods(studio_id, period_start, period_end, retrieved_at desc);
alter table public.ga4_party_funnel_configs enable row level security;
alter table public.ga4_party_funnel_periods enable row level security;
revoke all on public.ga4_party_funnel_configs, public.ga4_party_funnel_periods from public, anon, authenticated, service_role;
grant select, insert, update on public.ga4_party_funnel_configs to service_role;
grant select, insert on public.ga4_party_funnel_periods to service_role;
create view public.ga4_party_funnel_reporting with (security_invoker = true) as
select distinct on (p.studio_id, p.period_start, p.period_end, p.definition_version, p.geography)
 p.studio_id, p.period_start, p.period_end, p.definition_version, p.geography, p.report, p.retrieved_at
from public.ga4_party_funnel_periods p join public.ga4_party_funnel_configs c
on c.studio_id=p.studio_id and c.property_id=p.property_id and c.definition_version=p.definition_version and c.geography=p.geography
where c.enabled and p.definition_version=2 and p.geography='US'
order by p.studio_id, p.period_start, p.period_end, p.definition_version, p.geography, p.retrieved_at desc;
revoke all on public.ga4_party_funnel_reporting from public, anon, authenticated, service_role;
grant select on public.ga4_party_funnel_reporting to service_role;
commit;
-- Rollback: disable configs first; restore prior application. Preserve period
-- history for audit. Drop the additive view/tables only after separate approval.
