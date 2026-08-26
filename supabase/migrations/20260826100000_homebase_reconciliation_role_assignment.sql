begin;

alter table public.homebase_labor_reconciliations
  add column corrected_role_name text;

alter table public.homebase_labor_reconciliations
  drop constraint homebase_labor_reconciliations_resolution_check;

alter table public.homebase_labor_reconciliations
  add constraint homebase_labor_reconciliations_resolution_check
  check (resolution in ('assign_role', 'cogs', 'overhead', 'exclude'));

alter table public.homebase_labor_reconciliations
  add constraint homebase_labor_reconciliations_corrected_role_check
  check (
    (resolution = 'assign_role' and length(trim(corrected_role_name)) between 1 and 300)
    or (resolution <> 'assign_role' and corrected_role_name is null)
  );

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
    daily.labor_date,
    case when reconciliation.resolution = 'assign_role'
      then trim(reconciliation.corrected_role_name) else ''::text end,
    daily.scheduled_hours,
    (case when reconciliation.resolution in ('assign_role', 'cogs', 'overhead')
      then reconciliation.corrected_actual_hours else daily.actual_hours end)::numeric(12,4),
    daily.scheduled_cost,
    (case when reconciliation.resolution in ('assign_role', 'cogs', 'overhead')
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
  coalesce(
    case when labor.reconciliation_resolution in ('cogs', 'overhead')
      then labor.reconciliation_resolution end,
    mapping.labor_category,
    'unmapped'
  ) as labor_category,
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

commit;
