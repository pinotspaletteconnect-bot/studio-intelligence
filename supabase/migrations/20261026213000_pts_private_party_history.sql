begin;

create table if not exists public.pts_private_party_import_runs (
  id uuid primary key default gen_random_uuid(),
  studio_id bigint not null references public.studios(id),
  account_id bigint not null references public.pts_integration_accounts(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  source_count integer not null check (source_count >= 0),
  loaded_count integer not null default 0 check (loaded_count >= 0),
  unknown_date_count integer not null default 0,
  source_first_date date,
  source_last_date date,
  status text not null default 'loading' check (status in ('loading','completed','failed')),
  history_scope text not null default 'received_since_2024',
  history_from date not null default '2024-01-01',
  transition_history_available boolean not null default false,
  unique(id, studio_id)
);
alter table public.pts_private_party_import_runs add column if not exists history_from date not null default '2024-01-01';
alter table public.pts_private_party_import_runs add column if not exists unknown_date_count integer not null default 0;
alter table public.pts_private_party_import_runs alter column history_scope set default 'received_since_2024';

create table if not exists public.pts_private_party_leads (
  studio_id bigint not null references public.studios(id),
  source_lead_id bigint not null,
  received_date date,
  received_date_basis text not null default 'legacy_report',
  source_status text not null,
  source_disposition text not null,
  source_stage text not null,
  source_class_id text,
  event_date date,
  requested_date date,
  expected_headcount numeric,
  quoted_price numeric,
  requested_deposit numeric,
  is_mobile boolean,
  source_closed boolean,
  value_parse_warnings text[] not null default '{}',
  ever_booked boolean not null default false,
  first_booked_date date,
  first_observed_at timestamptz not null default now(),
  retrieved_at timestamptz not null,
  import_run_id uuid not null,
  primary key (studio_id, source_lead_id),
  foreign key (import_run_id, studio_id) references public.pts_private_party_import_runs(id, studio_id),
  check (expected_headcount is null or expected_headcount >= 0),
  check (quoted_price is null or quoted_price >= 0)
);
alter table public.pts_private_party_leads alter column received_date drop not null;
alter table public.pts_private_party_leads add column if not exists received_date_basis text not null default 'legacy_report';

-- These are observed changes, not invented historical transition timestamps.
create table if not exists public.pts_private_party_stage_observations (
  studio_id bigint not null,
  source_lead_id bigint not null,
  observed_at timestamptz not null,
  source_stage text not null,
  source_disposition text not null,
  source_changed_at timestamptz,
  observation_key text not null,
  primary key (studio_id, source_lead_id, observation_key),
  foreign key (studio_id, source_lead_id) references public.pts_private_party_leads(studio_id, source_lead_id)
);

create index if not exists pts_private_party_received_idx on public.pts_private_party_leads(studio_id, received_date);
create index if not exists pts_private_party_class_idx on public.pts_private_party_leads(studio_id, source_class_id);

alter table public.pts_private_party_import_runs enable row level security;
alter table public.pts_private_party_leads enable row level security;
alter table public.pts_private_party_stage_observations enable row level security;
revoke all on public.pts_private_party_import_runs, public.pts_private_party_leads,
  public.pts_private_party_stage_observations from public, anon, authenticated;
grant select, insert, update on public.pts_private_party_import_runs, public.pts_private_party_leads,
  public.pts_private_party_stage_observations to service_role;

create or replace view public.pts_private_party_leads_reporting with (security_invoker = true) as
select l.studio_id,l.source_lead_id,l.received_date,l.source_status,l.source_disposition,
  l.source_stage,l.source_class_id,l.event_date,l.requested_date,l.expected_headcount,
  l.quoted_price,l.requested_deposit,l.is_mobile,l.source_closed,l.value_parse_warnings,
  l.ever_booked,l.first_booked_date,l.first_observed_at,l.retrieved_at,l.import_run_id,
  s.organization_id, s.brand_id,
  case
    when l.source_disposition <> 'Active' or l.source_stage = 'Dispositioned' then 'lost'
    when l.source_stage in ('Party Closed','Close Party') then 'completed'
    when l.source_stage = 'Manage Party' then 'booked'
    when l.source_stage = 'Date Approved' then 'deposit_requested'
    when l.source_stage in ('Inquiry','Date Requested') then 'new'
    else 'unknown'
  end as stage,
  (l.ever_booked or l.source_status='Confirmed' or l.source_disposition='Active' and l.source_stage in ('Manage Party','Close Party','Party Closed')) as converted,
  case when l.expected_headcount > 0 and l.quoted_price is not null
    then l.expected_headcount * l.quoted_price end as estimated_value,
  l.received_date_basis
from public.pts_private_party_leads l join public.studios s on s.id=l.studio_id;

create or replace view public.pts_private_party_history_coverage with (security_invoker = true) as
select distinct on (studio_id) studio_id, account_id, id as import_run_id, source_count,
  loaded_count, source_first_date, source_last_date, completed_at, transition_history_available, history_from, unknown_date_count
from public.pts_private_party_import_runs r where status='completed' and loaded_count=source_count
  and loaded_count=(select count(*) from public.pts_private_party_leads l where l.import_run_id=r.id)
order by studio_id, completed_at desc;

revoke all on public.pts_private_party_leads_reporting, public.pts_private_party_history_coverage from public, anon, authenticated;
grant select on public.pts_private_party_leads_reporting, public.pts_private_party_history_coverage to service_role;

-- Atomic, tenant-validated batch ingestion. n8n calls this with minimized collector rows.
create or replace function public.import_pts_private_party_batch(p_run_id uuid, p_rows jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare v_run public.pts_private_party_import_runs; v_count integer;
begin
  select * into strict v_run from public.pts_private_party_import_runs where id=p_run_id for update;
  if v_run.status <> 'loading' then raise exception 'Import run is not loading'; end if;
  if not exists(select 1 from public.pts_collection_targets t where t.studio_id=v_run.studio_id and t.account_id=v_run.account_id)
    then raise exception 'Account/studio mapping mismatch'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows)>500 then raise exception 'Invalid import batch'; end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'studio_id')::bigint is distinct from v_run.studio_id
      or r->>'source_lead_id' is null
      or nullif(r->>'source_stage','') is null or nullif(r->>'source_disposition','') is null)
    then raise exception 'Invalid lead identity or studio'; end if;
  insert into public.pts_private_party_leads(studio_id, source_lead_id, received_date, received_date_basis, source_status,
    source_disposition, source_stage, source_class_id, event_date, requested_date, expected_headcount,
    quoted_price, requested_deposit, is_mobile, source_closed, value_parse_warnings, ever_booked, retrieved_at, import_run_id)
  select v_run.studio_id, r.source_lead_id, r.received_date, coalesce(r.received_date_basis,'legacy_report'), r.source_status, r.source_disposition,
    r.source_stage, r.source_class_id, r.event_date, r.requested_date, r.expected_headcount,
    r.quoted_price, r.requested_deposit, r.is_mobile, r.source_closed, coalesce(r.value_parse_warnings,'{}'),
    r.source_status='Confirmed' or r.source_disposition='Active' and r.source_stage in ('Manage Party','Close Party','Party Closed'), r.retrieved_at, p_run_id
  from jsonb_to_recordset(p_rows) r(source_lead_id bigint, received_date date, received_date_basis text, source_status text,
    source_disposition text, source_stage text, source_class_id text, event_date date, requested_date date,
    expected_headcount numeric, quoted_price numeric, requested_deposit numeric, is_mobile boolean,
    source_closed boolean, value_parse_warnings text[], retrieved_at timestamptz)
  on conflict(studio_id,source_lead_id) do update set received_date=excluded.received_date,
    received_date_basis=excluded.received_date_basis,
    source_status=excluded.source_status, source_disposition=excluded.source_disposition,
    source_stage=excluded.source_stage, source_class_id=excluded.source_class_id,
    event_date=excluded.event_date, requested_date=excluded.requested_date,
    expected_headcount=excluded.expected_headcount, quoted_price=excluded.quoted_price,
    requested_deposit=excluded.requested_deposit, is_mobile=excluded.is_mobile,
    source_closed=excluded.source_closed, ever_booked=pts_private_party_leads.ever_booked or excluded.ever_booked,
    value_parse_warnings=excluded.value_parse_warnings,
    retrieved_at=excluded.retrieved_at, import_run_id=excluded.import_run_id
  where excluded.retrieved_at >= pts_private_party_leads.retrieved_at;
  get diagnostics v_count=row_count;
  insert into public.pts_private_party_stage_observations(studio_id,source_lead_id,observed_at,source_stage,source_disposition,observation_key)
  select studio_id, source_lead_id, retrieved_at, source_stage, source_disposition,
    md5(p_run_id::text||'|'||source_stage||'|'||source_disposition||'|'||coalesce(source_class_id,''))
  from public.pts_private_party_leads where import_run_id=p_run_id
  on conflict do nothing;
  update public.pts_private_party_import_runs set loaded_count=(select count(*) from public.pts_private_party_leads where import_run_id=p_run_id),
    unknown_date_count=(select count(*) from public.pts_private_party_leads where import_run_id=p_run_id and received_date is null) where id=p_run_id;
  return v_count;
end $$;
revoke all on function public.import_pts_private_party_batch(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.import_pts_private_party_batch(uuid,jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
