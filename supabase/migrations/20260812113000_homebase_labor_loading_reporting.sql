begin;

alter table public.homebase_shift_labor add column if not exists labor_date date;
create index if not exists homebase_shift_labor_studio_date_idx on public.homebase_shift_labor (studio_id, labor_date);

create or replace function public.replace_homebase_labor_range(
  p_account_id bigint, p_start_date date, p_end_date date, p_daily jsonb, p_shifts jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare target public.homebase_collection_targets%rowtype; daily_count integer; shift_count integer;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date or p_end_date - p_start_date > 62 then raise exception 'Invalid Homebase labor range'; end if;
  if jsonb_typeof(p_daily) <> 'array' or jsonb_typeof(p_shifts) <> 'array' then raise exception 'Homebase labor payloads must be arrays'; end if;
  select * into target from public.homebase_collection_targets where account_id = p_account_id;
  if target.account_id is null or target.location_uuid is null then raise exception 'Validated Homebase target not found'; end if;

  delete from public.homebase_labor_daily where studio_id = target.studio_id and labor_date between p_start_date and p_end_date;
  delete from public.homebase_shift_labor where studio_id = target.studio_id and labor_date between p_start_date and p_end_date;

  insert into public.homebase_labor_daily (organization_id,brand_id,studio_id,labor_date,scheduled_hours,actual_hours,scheduled_cost,actual_cost,regular_hours,overtime_hours,double_overtime_hours,retrieved_at,updated_at)
  select target.organization_id,target.brand_id,target.studio_id,row_data.labor_date,
    coalesce(row_data.scheduled_hours,0),coalesce(row_data.actual_hours,0),coalesce(row_data.scheduled_cost,0),coalesce(row_data.actual_cost,0),
    coalesce(row_data.regular_hours,0),coalesce(row_data.overtime_hours,0),coalesce(row_data.double_overtime_hours,0),coalesce(row_data.retrieved_at,now()),now()
  from jsonb_to_recordset(p_daily) as row_data(labor_date date,scheduled_hours numeric,actual_hours numeric,scheduled_cost numeric,actual_cost numeric,regular_hours numeric,overtime_hours numeric,double_overtime_hours numeric,retrieved_at timestamptz)
  where row_data.labor_date between p_start_date and p_end_date;
  get diagnostics daily_count = row_count;

  insert into public.homebase_shift_labor (organization_id,brand_id,studio_id,source_shift_id,source_timecard_id,role,department,labor_date,scheduled_start,scheduled_end,clock_in,clock_out,scheduled_hours,actual_hours,scheduled_cost,actual_cost,retrieved_at,updated_at)
  select target.organization_id,target.brand_id,target.studio_id,row_data.source_shift_id,row_data.source_timecard_id,row_data.role,row_data.department,row_data.labor_date,
    row_data.scheduled_start,row_data.scheduled_end,row_data.clock_in,row_data.clock_out,coalesce(row_data.scheduled_hours,0),coalesce(row_data.actual_hours,0),coalesce(row_data.scheduled_cost,0),coalesce(row_data.actual_cost,0),coalesce(row_data.retrieved_at,now()),now()
  from jsonb_to_recordset(p_shifts) as row_data(source_shift_id bigint,source_timecard_id bigint,role text,department text,labor_date date,scheduled_start timestamptz,scheduled_end timestamptz,clock_in timestamptz,clock_out timestamptz,scheduled_hours numeric,actual_hours numeric,scheduled_cost numeric,actual_cost numeric,retrieved_at timestamptz)
  where row_data.source_shift_id is not null and row_data.labor_date between p_start_date and p_end_date;
  get diagnostics shift_count = row_count;

  update public.homebase_integration_accounts set last_collected_at=now(),updated_at=now() where id=p_account_id;
  return jsonb_build_object('dailyRows',daily_count,'shiftRows',shift_count);
end; $$;

create or replace view public.homebase_labor_daily_reporting with (security_invoker=true) as
select labor.*, studio.studio_name,
  case when labor.actual_cost > 0 then labor.actual_cost else labor.scheduled_cost end as best_available_cost,
  case when labor.actual_hours > 0 then 'actual' else 'scheduled' end as cost_basis
from public.homebase_labor_daily labor join public.studios studio on studio.id=labor.studio_id;

create or replace view public.homebase_class_labor_reporting with (security_invoker=true) as
with candidates as (
  select class.studio_id,class.source_event_key,class.event_date,class.class_time,class.painting,class.class_sales,class.fee_sales,
    shift.source_shift_id,shift.role,shift.department,shift.actual_cost,shift.scheduled_cost,shift.actual_hours,shift.scheduled_hours,
    count(*) over (partition by shift.studio_id,shift.source_shift_id) as matching_class_count
  from public.pts_class_sales_reporting class
  join public.homebase_shift_labor shift on shift.studio_id=class.studio_id and shift.labor_date=class.event_date
   and coalesce(shift.clock_in,shift.scheduled_start) < class.class_time + interval '3 hours'
   and coalesce(shift.clock_out,shift.scheduled_end) > class.class_time - interval '1 hour'
)
select studio_id,source_event_key,event_date,class_time,painting,max(class_sales+fee_sales) as class_revenue,
  sum(case when actual_cost>0 then actual_cost else scheduled_cost end / nullif(matching_class_count,0)) as allocated_labor_cost,
  sum(case when actual_hours>0 then actual_hours else scheduled_hours end / nullif(matching_class_count,0)) as allocated_labor_hours,
  count(distinct source_shift_id) as contributing_shifts,
  'estimated_time_overlap'::text as allocation_method
from candidates group by studio_id,source_event_key,event_date,class_time,painting;

revoke all on table public.homebase_labor_daily_reporting,public.homebase_class_labor_reporting from public,anon,authenticated;
grant select on table public.homebase_labor_daily_reporting,public.homebase_class_labor_reporting to service_role;
revoke all on function public.replace_homebase_labor_range(bigint,date,date,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.replace_homebase_labor_range(bigint,date,date,jsonb,jsonb) to service_role;

comment on view public.homebase_class_labor_reporting is 'Estimated class labor allocated from overlapping privacy-minimized Homebase shifts; not payroll truth.';
commit;
