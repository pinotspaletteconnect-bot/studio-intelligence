-- Owner approved St. Matthews manual pilot. Additive only. No schedule.
-- Stores the source before Sheets writes and keeps reservation -> row identity.
begin;

create table public.seating_chart_targets (
  id uuid primary key default gen_random_uuid(),
  studio_id bigint not null references public.studios(id),
  config jsonb not null,
  enabled boolean not null default false,
  ledger jsonb not null default '[]'::jsonb,
  revision bigint not null default 0,
  lease_run_id text,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(config) = 'object'),
  check (config ?& array['studioCode','sheetName','sheetId','isPrivate','spreadsheetId','masterSpreadsheetId','classId','rowLimit','googleAccountEmail','accountId','studioId','sourceLocationLabel','sourceRoomId','allowedClassTypeIds']),
  check (jsonb_typeof(ledger) = 'array'),
  check (config->>'studioCode' = 'STM'),
  check (config->>'sheetName' = 'Seating Chart Main'),
  check (config->>'isPrivate' = 'false'),
  check (config->>'spreadsheetId' <> config->>'masterSpreadsheetId'),
  check (config->>'sheetId' = '0'),
  check ((config->>'rowLimit')::integer between 1 and 1000),
  check ((config->>'studioId')::bigint = studio_id)
);
create unique index seating_chart_target_class on public.seating_chart_targets(studio_id, (config->>'classId'));

create table public.seating_chart_refresh_runs (
  run_id text primary key,
  target_id uuid not null references public.seating_chart_targets(id),
  status text not null check (status in ('claimed','staged','completed','needs-review')),
  source jsonb not null,
  prior_ledger jsonb not null,
  target_revision bigint not null,
  plan jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seating_chart_runs_target_time on public.seating_chart_refresh_runs(target_id, created_at);
alter table public.seating_chart_targets enable row level security;
alter table public.seating_chart_refresh_runs enable row level security;
revoke all on public.seating_chart_targets, public.seating_chart_refresh_runs from public, anon, authenticated;
grant all on public.seating_chart_targets, public.seating_chart_refresh_runs to service_role;

create function public.claim_seating_chart_refresh(p_target_id uuid, p_run_id text, p_source jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.seating_chart_targets; r public.seating_chart_refresh_runs;
begin
  select * into strict t from public.seating_chart_targets where id=p_target_id for update;
  if not t.enabled then raise exception 'Target is disabled'; end if;
  if not exists(select 1 from public.studios s join public.pts_integration_accounts a on a.organization_id=s.organization_id
    where s.id=t.studio_id and a.id=(t.config->>'accountId')::bigint and a.is_active) then raise exception 'Studio/source account owner mismatch'; end if;
  if p_run_id is null or length(p_run_id) not between 8 and 200 then raise exception 'Invalid run ID'; end if;
  select * into r from public.seating_chart_refresh_runs where run_id=p_run_id;
  if found then
    if r.target_id<>p_target_id then raise exception 'Run target mismatch'; end if;
    if r.status='completed' then return jsonb_build_object('completed',true,'result',r.result); end if;
    if r.status='needs-review' then raise exception 'Failed run needs review before retry'; end if;
    if r.target_revision<>t.revision then raise exception 'Run revision mismatch'; end if;
  else
    if exists(select 1 from public.seating_chart_refresh_runs where target_id=t.id and status<>'completed') then
      raise exception 'Prior unfinished run must be recovered or reviewed';
    end if;
    if p_source->>'classId' is distinct from t.config->>'classId' or
       p_source->>'studioCode' is distinct from t.config->>'studioCode' or
       p_source->'complete' is distinct from 'true'::jsonb or
       p_source->'isPrivate' is distinct from 'false'::jsonb or
       jsonb_typeof(p_source->'rows') is distinct from 'array' then raise exception 'Source identity or completeness mismatch'; end if;
    if p_source->>'expectedRowCount' is null or jsonb_array_length(p_source->'rows')<>(p_source->>'expectedRowCount')::integer or
       (p_source->>'retrievedAt')::timestamptz < now()-interval '10 minutes' or
       (p_source->>'retrievedAt')::timestamptz > now()+interval '1 minute' or
       p_source->>'retrievedAt' is null then raise exception 'Source count or freshness mismatch'; end if;
    insert into public.seating_chart_refresh_runs(run_id,target_id,status,source,prior_ledger,target_revision)
      values(p_run_id,t.id,'claimed',p_source,t.ledger,t.revision) returning * into r;
  end if;
  if t.lease_run_id is not null and t.lease_until>now() then raise exception 'Refresh lease is already held'; end if;
  update public.seating_chart_targets set lease_run_id=p_run_id,lease_until=now()+interval '10 minutes',updated_at=now() where id=t.id;
  return jsonb_build_object('target',t.config,'source',r.source,'ledger',r.prior_ledger,'plan',r.plan,'runId',p_run_id,'targetId',t.id);
end $$;

create function public.stage_seating_chart_refresh(p_run_id text, p_plan jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.seating_chart_targets; r public.seating_chart_refresh_runs; item jsonb; prefix text; suffix text; row_number integer;
begin
  select * into strict r from public.seating_chart_refresh_runs where run_id=p_run_id;
  select * into strict t from public.seating_chart_targets where id=r.target_id for update;
  select * into strict r from public.seating_chart_refresh_runs where run_id=p_run_id for update;
  if t.lease_run_id is distinct from p_run_id or t.lease_until is null or t.lease_until<now() or r.target_revision<>t.revision or r.status not in ('claimed','staged') then raise exception 'Invalid refresh lease'; end if;
  if r.plan is not null and r.plan<>p_plan then raise exception 'Staged plan is immutable'; end if;
  if p_plan->'request'->>'valueInputOption' is distinct from 'RAW' or jsonb_typeof(p_plan->'ledger') is distinct from 'array' or
     jsonb_typeof(p_plan->'request'->'data') is distinct from 'array' then raise exception 'Invalid raw plan'; end if;
  prefix := chr(39)||replace(t.config->>'sheetName',chr(39),chr(39)||chr(39))||chr(39)||'!';
  for item in select value from jsonb_array_elements(p_plan->'request'->'data') loop
    if jsonb_typeof(item->'values') is distinct from 'array' or jsonb_typeof(item->'values'->0) is distinct from 'array' then raise exception 'Missing reservation values'; end if;
    if left(item->>'range',length(prefix)) is distinct from prefix then raise exception 'Wrong destination tab'; end if;
    suffix := substr(item->>'range',length(prefix)+1);
    if suffix ~ '^V[1-9][0-9]*:AA[1-9][0-9]*$' then
      row_number := substring(suffix from '^V([0-9]+)')::integer;
      if suffix<>'V'||row_number||':AA'||row_number or jsonb_array_length(item->'values'->0)<>6 then raise exception 'Wrong reservation range'; end if;
    elsif suffix ~ '^AC[1-9][0-9]*$' then
      row_number := substring(suffix from '^AC([0-9]+)')::integer;
      if jsonb_array_length(item->'values'->0)<>1 then raise exception 'Wrong comments range'; end if;
    else raise exception 'Protected column in write plan'; end if;
    if row_number>(t.config->>'rowLimit')::integer or jsonb_array_length(item->'values')<>1 then raise exception 'Write outside allowed rows'; end if;
  end loop;
  update public.seating_chart_refresh_runs set plan=p_plan,status='staged',updated_at=now() where run_id=p_run_id;
  return jsonb_build_object('staged',true,'runId',p_run_id);
end $$;

create function public.complete_seating_chart_refresh(p_run_id text, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.seating_chart_targets; r public.seating_chart_refresh_runs;
begin
  select * into strict r from public.seating_chart_refresh_runs where run_id=p_run_id;
  select * into strict t from public.seating_chart_targets where id=r.target_id for update;
  select * into strict r from public.seating_chart_refresh_runs where run_id=p_run_id for update;
  if r.status='completed' then return r.result; end if;
  if r.status<>'staged' or t.lease_run_id is distinct from p_run_id or t.lease_until is null or t.lease_until<now() or r.target_revision<>t.revision then raise exception 'Invalid completion lease'; end if;
  if p_result->'seatingUnchanged' is distinct from 'true'::jsonb or p_result->'attendanceUnchanged' is distinct from 'true'::jsonb or
     p_result->'formulasUnchanged' is distinct from 'true'::jsonb then raise exception 'Readback verification is required'; end if;
  if p_result->>'status' is null or p_result->>'status' not in ('updated','updated-needs-review') or
     p_result->>'activeCount' is null or (p_result->>'activeCount')::integer<>jsonb_array_length(r.source->'rows') then raise exception 'Completion counts/status mismatch'; end if;
  update public.seating_chart_targets set ledger=r.plan->'ledger',revision=revision+1,lease_run_id=null,lease_until=null,updated_at=now() where id=t.id;
  update public.seating_chart_refresh_runs set status='completed',result=p_result,updated_at=now() where run_id=p_run_id;
  return p_result;
end $$;

create function public.fail_seating_chart_refresh(p_run_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  select target_id into strict target from public.seating_chart_refresh_runs where run_id=p_run_id;
  perform 1 from public.seating_chart_targets where id=target for update;
  update public.seating_chart_refresh_runs set status='needs-review',updated_at=now() where run_id=p_run_id and status<>'completed';
  update public.seating_chart_targets set lease_run_id=null,lease_until=null where id=target and lease_run_id=p_run_id;
end $$;

revoke all on function public.claim_seating_chart_refresh(uuid,text,jsonb),public.stage_seating_chart_refresh(text,jsonb),public.complete_seating_chart_refresh(text,jsonb),public.fail_seating_chart_refresh(text) from public, anon, authenticated;
grant execute on function public.claim_seating_chart_refresh(uuid,text,jsonb),public.stage_seating_chart_refresh(text,jsonb),public.complete_seating_chart_refresh(text,jsonb),public.fail_seating_chart_refresh(text) to service_role;
notify pgrst, 'reload schema';
commit;
