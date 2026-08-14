begin;

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
  select organization_id, brand_id, studio_id, labor_date, role_name,
    scheduled_hours, actual_hours, scheduled_cost, actual_cost
  from public.homebase_labor_role_daily
  union all
  select daily.organization_id, daily.brand_id, daily.studio_id,
    daily.labor_date, ''::text as role_name,
    daily.scheduled_hours, daily.actual_hours,
    daily.scheduled_cost, daily.actual_cost
  from public.homebase_labor_daily daily
  where not exists (
    select 1 from public.homebase_labor_role_daily role
    where role.studio_id = daily.studio_id
      and role.labor_date = daily.labor_date
  )
)
select labor.organization_id, labor.brand_id, labor.studio_id,
  studio.studio_name, labor.labor_date, labor.role_name,
  coalesce(mapping.labor_category, 'unmapped') as labor_category,
  labor.scheduled_hours, labor.actual_hours,
  labor.scheduled_cost, labor.actual_cost, sales.total_sales,
  case when sales.total_sales > 0
    then labor.actual_cost / sales.total_sales * 100
  end as actual_labor_percent
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

comment on view public.homebase_labor_role_reporting is
  'Privacy-minimized daily Homebase role labor, including zero-role studio-days, joined to current PTS sales with historical fallback.';

commit;
