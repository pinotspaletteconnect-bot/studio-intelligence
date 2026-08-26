begin;

create table public.homebase_labor_reconciliations (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  studio_id bigint not null references public.studios(id) on delete cascade,
  labor_date date not null,
  resolution text not null check (resolution in ('cogs', 'overhead', 'exclude')),
  corrected_actual_hours numeric(10,2) not null default 0 check (corrected_actual_hours >= 0),
  corrected_actual_cost numeric(14,2) not null default 0 check (corrected_actual_cost >= 0),
  note text not null check (length(trim(note)) between 1 and 500),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, studio_id, labor_date)
);

alter table public.homebase_labor_reconciliations enable row level security;
revoke all on table public.homebase_labor_reconciliations from public, anon, authenticated;
grant select, insert, update on table public.homebase_labor_reconciliations to service_role;

create or replace view public.homebase_labor_role_reporting
with (security_invoker = true)
as
with current_sales as (
  select organization_id, brand_id, studio_id, report_date,
    class_reported_net_sales as total_sales
  from public.pts_daily_operations_reporting
),
combined_sales as (
  select organization_id, brand_id, studio_id, report_date, total_sales
  from current_sales
  union all
  select historical.organization_id, historical.brand_id,
    historical.studio_id, historical.report_date, historical.total_sales
  from public.pts_operations_daily historical
  where not exists (
    select 1 from current_sales current
    where current.studio_id = historical.studio_id
      and current.report_date = historical.report_date
  )
),
role_labor as (
  select labor.organization_id, labor.brand_id, labor.studio_id,
    labor.labor_date, labor.role_name, labor.scheduled_hours,
    labor.actual_hours, labor.scheduled_cost, labor.actual_cost,
    false as is_daily_fallback, null::text as reconciliation_note,
    null::text as reconciliation_resolution
  from public.homebase_labor_role_daily labor
  union all
  select daily.organization_id, daily.brand_id, daily.studio_id,
    daily.labor_date, ''::text as role_name,
    daily.scheduled_hours,
    (case when reconciliation.resolution in ('cogs', 'overhead')
      then reconciliation.corrected_actual_hours else daily.actual_hours end)::numeric(12,4),
    daily.scheduled_cost,
    (case when reconciliation.resolution in ('cogs', 'overhead')
      then reconciliation.corrected_actual_cost else daily.actual_cost end)::numeric(14,2),
    true, reconciliation.note, reconciliation.resolution
  from public.homebase_labor_daily daily
  left join public.homebase_labor_reconciliations reconciliation
    on reconciliation.organization_id = daily.organization_id
    and reconciliation.studio_id = daily.studio_id
    and reconciliation.labor_date = daily.labor_date
  where not exists (
    select 1 from public.homebase_labor_role_daily role
    where role.studio_id = daily.studio_id
      and role.labor_date = daily.labor_date
  )
  and coalesce(reconciliation.resolution, '') <> 'exclude'
)
select labor.organization_id, labor.brand_id, labor.studio_id,
  studio.studio_name, labor.labor_date, labor.role_name,
  coalesce(labor.reconciliation_resolution, mapping.labor_category, 'unmapped') as labor_category,
  labor.scheduled_hours, labor.actual_hours,
  labor.scheduled_cost, labor.actual_cost, sales.total_sales,
  case when sales.total_sales > 0
    then labor.actual_cost / sales.total_sales * 100
  end as actual_labor_percent,
  labor.is_daily_fallback,
  labor.reconciliation_note,
  labor.reconciliation_resolution
from role_labor labor
join public.studios studio on studio.id = labor.studio_id
left join public.homebase_role_mappings mapping
  on mapping.organization_id = labor.organization_id
  and lower(mapping.role_name) = lower(labor.role_name)
left join combined_sales sales
  on sales.studio_id = labor.studio_id
  and sales.report_date = labor.labor_date;

revoke all on table public.homebase_labor_role_reporting from public, anon, authenticated;
grant select on table public.homebase_labor_role_reporting to service_role;

insert into public.homebase_labor_reconciliations
  (organization_id, studio_id, labor_date, resolution,
   corrected_actual_hours, corrected_actual_cost, note)
select organization_id, studio_id, labor_date, 'exclude', 0, 0,
  'Confirmed duplicate of the prior day detailed-role total during August 2026 reconciliation.'
from public.homebase_labor_daily
where studio_id = 4 and labor_date in ('2026-08-05', '2026-08-17', '2026-08-24')
on conflict (organization_id, studio_id, labor_date) do update
set resolution = excluded.resolution,
    corrected_actual_hours = excluded.corrected_actual_hours,
    corrected_actual_cost = excluded.corrected_actual_cost,
    note = excluded.note,
    updated_at = now();

commit;
