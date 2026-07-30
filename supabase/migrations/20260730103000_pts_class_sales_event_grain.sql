alter table public.pts_class_sales_daily
  add column if not exists event_date date,
  add column if not exists source_event_key text,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now();

update public.pts_class_sales_daily
set
  event_date = coalesce(event_date, report_date),
  source_event_key = coalesce(source_event_key, source_row_hash)
where event_date is null
   or source_event_key is null;

alter table public.pts_class_sales_daily
  alter column event_date set not null,
  alter column source_event_key set not null;

alter table public.pts_class_sales_daily
  drop constraint if exists pts_class_sales_daily_studio_id_report_date_source_row_hash_key;

alter table public.pts_class_sales_daily
  add constraint pts_class_sales_daily_studio_event_key_key
  unique (studio_id, source_event_key);

drop index if exists public.pts_class_sales_studio_date_idx;

create index if not exists pts_class_sales_studio_event_date_idx
  on public.pts_class_sales_daily (studio_id, event_date desc);

create index if not exists pts_class_sales_type_event_date_idx
  on public.pts_class_sales_daily (class_type, event_date desc);
