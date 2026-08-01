begin;

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
    from jsonb_to_recordset(p_rows) as row_data(
      studio_id bigint,
      snapshot_date date
    )
  ) slice
  where target.studio_id = slice.studio_id
    and target.snapshot_date = slice.snapshot_date;

  insert into public.pts_upcoming_class_snapshots (
    organization_id,
    brand_id,
    studio_id,
    pts_location_id,
    snapshot_date,
    source_event_key,
    event_date,
    painting,
    class_time,
    room,
    class_type,
    seats_sold,
    capacity,
    percent_full,
    lead_time_average,
    class_sales,
    product_sales,
    fee_sales,
    net_sales,
    retrieved_at,
    updated_at
  )
  select
    row_data.organization_id,
    row_data.brand_id,
    row_data.studio_id,
    row_data.pts_location_id,
    row_data.snapshot_date,
    row_data.source_event_key,
    row_data.event_date,
    row_data.painting,
    row_data.class_time,
    row_data.room,
    row_data.class_type,
    coalesce(row_data.seats_sold, 0),
    coalesce(row_data.capacity, 0),
    coalesce(row_data.percent_full, 0),
    row_data.lead_time_average,
    coalesce(row_data.class_sales, 0),
    coalesce(row_data.product_sales, 0),
    coalesce(row_data.fee_sales, 0),
    coalesce(row_data.net_sales, 0),
    row_data.retrieved_at,
    coalesce(row_data.updated_at, now())
  from jsonb_to_recordset(p_rows) as row_data(
    organization_id bigint,
    brand_id bigint,
    studio_id bigint,
    pts_location_id text,
    snapshot_date date,
    source_event_key text,
    event_date date,
    painting text,
    class_time timestamptz,
    room text,
    class_type text,
    seats_sold numeric,
    capacity numeric,
    percent_full numeric,
    lead_time_average numeric,
    class_sales numeric,
    product_sales numeric,
    fee_sales numeric,
    net_sales numeric,
    retrieved_at timestamptz,
    updated_at timestamptz
  );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.replace_pts_upcoming_class_snapshot(jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_pts_upcoming_class_snapshot(jsonb)
  to service_role;

comment on function public.replace_pts_upcoming_class_snapshot(jsonb) is
  'Atomically replaces validated studio/snapshot-date slices for the PTS Upcoming Classes workflow.';

commit;
