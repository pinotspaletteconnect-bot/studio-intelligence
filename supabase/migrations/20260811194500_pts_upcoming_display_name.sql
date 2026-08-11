begin;

alter table public.pts_upcoming_class_snapshots
  add column if not exists display_name text;

comment on column public.pts_upcoming_class_snapshots.display_name is
  'PTS class Display Name shown on the calendar; distinct from the selected painting.';

create or replace function public.replace_pts_upcoming_class_snapshot(
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if p_rows is null
     or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) = 0 then
    raise exception 'Upcoming class snapshot rows must be a non-empty JSON array';
  end if;

  delete from public.pts_upcoming_class_snapshots target
  using (
    select distinct studio_id, snapshot_date
    from jsonb_to_recordset(p_rows) as row_data(studio_id bigint, snapshot_date date)
  ) slice
  where target.studio_id = slice.studio_id
    and target.snapshot_date = slice.snapshot_date;

  insert into public.pts_upcoming_class_snapshots (
    organization_id, brand_id, studio_id, pts_location_id, snapshot_date,
    source_event_key, event_date, display_name, painting, class_time, room,
    class_type, seats_sold, capacity, percent_full, lead_time_average,
    class_sales, product_sales, fee_sales, net_sales, retrieved_at, updated_at
  )
  select
    row_data.organization_id, row_data.brand_id, row_data.studio_id,
    row_data.pts_location_id, row_data.snapshot_date, row_data.source_event_key,
    row_data.event_date, row_data.display_name, row_data.painting,
    row_data.class_time, row_data.room, row_data.class_type,
    coalesce(row_data.seats_sold, 0), coalesce(row_data.capacity, 0),
    coalesce(row_data.percent_full, 0), row_data.lead_time_average,
    coalesce(row_data.class_sales, 0), coalesce(row_data.product_sales, 0),
    coalesce(row_data.fee_sales, 0), coalesce(row_data.net_sales, 0),
    row_data.retrieved_at, coalesce(row_data.updated_at, now())
  from jsonb_to_recordset(p_rows) as row_data(
    organization_id bigint, brand_id bigint, studio_id bigint,
    pts_location_id text, snapshot_date date, source_event_key text,
    event_date date, display_name text, painting text, class_time timestamptz,
    room text, class_type text, seats_sold numeric, capacity numeric,
    percent_full numeric, lead_time_average numeric, class_sales numeric,
    product_sales numeric, fee_sales numeric, net_sales numeric,
    retrieved_at timestamptz, updated_at timestamptz
  );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Both reporting views select the snapshot row, so replacing them preserves
-- all existing pickup logic while exposing the new nullable column.
drop view if exists public.pts_upcoming_classes_current;
drop view if exists public.pts_upcoming_class_snapshots_reporting;

create or replace view public.pts_upcoming_class_snapshots_reporting
with (security_invoker = true)
as
with mapped as (
  select
    snapshot.*,
    snapshot.class_type as source_class_type,
    coalesce(mapping.reporting_class_type, 'Unmapped') as reporting_class_type,
    case when mapping.id is null then 'unmapped' else 'mapped' end as mapping_status,
    lag(snapshot.snapshot_date) over event_history as previous_snapshot_date,
    lag(snapshot.seats_sold) over event_history as previous_seats_sold,
    lag(snapshot.class_sales) over event_history as previous_class_sales,
    lag(snapshot.fee_sales) over event_history as previous_fee_sales
  from public.pts_upcoming_class_snapshots snapshot
  left join public.pts_class_type_mappings mapping
    on mapping.organization_id = snapshot.organization_id
   and lower(trim(mapping.source_class_type)) = lower(trim(snapshot.class_type))
   and mapping.is_active
  window event_history as (
    partition by snapshot.studio_id, snapshot.source_event_key
    order by snapshot.snapshot_date
  )
)
select
  mapped.*,
  greatest(mapped.capacity - mapped.seats_sold, 0) as seats_remaining,
  case when mapped.capacity > 0 then mapped.seats_sold / mapped.capacity * 100 else 0 end as capacity_percent,
  case when mapped.previous_snapshot_date = mapped.snapshot_date - 1 then mapped.seats_sold - mapped.previous_seats_sold else null end as seats_pickup,
  case when mapped.previous_snapshot_date = mapped.snapshot_date - 1
    then (mapped.class_sales + mapped.fee_sales) - (mapped.previous_class_sales + mapped.previous_fee_sales)
    else null end as revenue_pickup
from mapped;

create or replace view public.pts_upcoming_classes_current
with (security_invoker = true)
as
with latest_snapshot as (
  select studio_id, max(snapshot_date) as snapshot_date
  from public.pts_upcoming_class_snapshots
  group by studio_id
)
select reporting.*
from public.pts_upcoming_class_snapshots_reporting reporting
join latest_snapshot
  on latest_snapshot.studio_id = reporting.studio_id
 and latest_snapshot.snapshot_date = reporting.snapshot_date
where reporting.event_date >= reporting.snapshot_date;

revoke all on table public.pts_upcoming_class_snapshots_reporting from public, anon, authenticated;
revoke all on table public.pts_upcoming_classes_current from public, anon, authenticated;
grant select on table public.pts_upcoming_class_snapshots_reporting to service_role;
grant select on table public.pts_upcoming_classes_current to service_role;

commit;
