-- Additive GA4 reporting facts filtered to North American traffic upstream.
-- Existing global GA4 facts remain unchanged.

begin;

create table public.ga4_north_america_daily_metrics (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  brand_id bigint not null references public.brands(id) on delete cascade,
  studio_id bigint not null references public.studios(id) on delete cascade,
  report_date date not null,
  active_users bigint not null default 0,
  total_users bigint not null default 0,
  new_users bigint not null default 0,
  sessions bigint not null default 0,
  engaged_sessions bigint not null default 0,
  page_views bigint not null default 0,
  engagement_rate numeric(12, 6) not null default 0,
  average_session_duration numeric(16, 4) not null default 0,
  key_events numeric(16, 4) not null default 0,
  ecommerce_purchases numeric(16, 4) not null default 0,
  purchase_revenue numeric(16, 2) not null default 0,
  retrieved_at timestamptz not null default now(),
  primary key (studio_id, report_date),
  check (active_users >= 0 and total_users >= 0 and new_users >= 0 and sessions >= 0),
  check (engaged_sessions >= 0 and page_views >= 0 and key_events >= 0),
  check (ecommerce_purchases >= 0 and purchase_revenue >= 0)
);

create table public.ga4_north_america_breakdown_daily (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  brand_id bigint not null references public.brands(id) on delete cascade,
  studio_id bigint not null references public.studios(id) on delete cascade,
  report_date date not null,
  breakdown_type text not null check (breakdown_type in (
    'country', 'city', 'device_category', 'operating_system', 'source_medium'
  )),
  dimension_value text not null,
  dimension_secondary text not null default '',
  sessions bigint not null default 0,
  active_users bigint not null default 0,
  new_users bigint not null default 0,
  key_events numeric(16, 4) not null default 0,
  total_revenue numeric(16, 2) not null default 0,
  retrieved_at timestamptz not null default now(),
  primary key (
    studio_id, report_date, breakdown_type, dimension_value, dimension_secondary
  ),
  check (char_length(dimension_value) between 1 and 500),
  check (sessions >= 0 and active_users >= 0 and new_users >= 0 and key_events >= 0)
);

create table public.ga4_north_america_content_daily (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  brand_id bigint not null references public.brands(id) on delete cascade,
  studio_id bigint not null references public.studios(id) on delete cascade,
  report_date date not null,
  page_path text not null,
  page_views bigint not null default 0,
  active_users bigint not null default 0,
  key_events numeric(16, 4) not null default 0,
  total_revenue numeric(16, 2) not null default 0,
  retrieved_at timestamptz not null default now(),
  primary key (studio_id, report_date, page_path),
  check (char_length(page_path) between 1 and 2000),
  check (page_views >= 0 and active_users >= 0 and key_events >= 0)
);

create table public.ga4_north_america_event_daily (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  brand_id bigint not null references public.brands(id) on delete cascade,
  studio_id bigint not null references public.studios(id) on delete cascade,
  report_date date not null,
  event_name text not null,
  event_count bigint not null default 0,
  active_users bigint not null default 0,
  total_revenue numeric(16, 2) not null default 0,
  retrieved_at timestamptz not null default now(),
  primary key (studio_id, report_date, event_name),
  check (char_length(event_name) between 1 and 500),
  check (event_count >= 0 and active_users >= 0)
);

create index ga4_na_daily_scope_date_idx
  on public.ga4_north_america_daily_metrics (organization_id, report_date, studio_id);
create index ga4_na_breakdown_scope_date_idx
  on public.ga4_north_america_breakdown_daily
  (organization_id, breakdown_type, report_date, studio_id);
create index ga4_na_content_scope_date_idx
  on public.ga4_north_america_content_daily (organization_id, report_date, studio_id);
create index ga4_na_event_scope_date_idx
  on public.ga4_north_america_event_daily (organization_id, report_date, studio_id);

alter table public.ga4_north_america_daily_metrics enable row level security;
alter table public.ga4_north_america_breakdown_daily enable row level security;
alter table public.ga4_north_america_content_daily enable row level security;
alter table public.ga4_north_america_event_daily enable row level security;

revoke all on table public.ga4_north_america_daily_metrics,
  public.ga4_north_america_breakdown_daily,
  public.ga4_north_america_content_daily,
  public.ga4_north_america_event_daily from anon, authenticated;
grant select, insert, update, delete on table public.ga4_north_america_daily_metrics,
  public.ga4_north_america_breakdown_daily,
  public.ga4_north_america_content_daily,
  public.ga4_north_america_event_daily to service_role;

comment on table public.ga4_north_america_daily_metrics is
  'One GA4 aggregate per studio and date, collected with a North America continent filter.';
comment on table public.ga4_north_america_breakdown_daily is
  'North America-filtered GA4 country, city, technology, and source/medium daily breakdowns; breakdown types remain separate grains.';
comment on table public.ga4_north_america_content_daily is
  'North America-filtered GA4 page-path performance by studio and date.';
comment on table public.ga4_north_america_event_daily is
  'North America-filtered GA4 event performance by studio and date.';

commit;
