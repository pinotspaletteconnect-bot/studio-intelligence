-- STM staff mapping extension; manual pilot only, schedules remain OFF.
-- Rollback: disable config.staffUpdatesEnabled and restore the prior manual
-- workflow; preserve the staff ledger and all existing reservation state.
begin;
alter table public.seating_chart_targets add column staff_ledger jsonb not null default '{}'::jsonb check(jsonb_typeof(staff_ledger)='object');
create or replace function public.claim_seating_chart_refresh(p_target_id uuid, p_run_id text, p_source jsonb)
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
  return jsonb_build_object('staffLedger',t.staff_ledger,'target',t.config,'source',r.source,'ledger',r.prior_ledger,'plan',r.plan,'runId',p_run_id,'targetId',t.id);
end $$;
create or replace function public.stage_seating_chart_refresh(p_run_id text, p_plan jsonb)
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
  if t.config->'staffUpdatesEnabled'='true'::jsonb then
    if r.source->'assignedStaff'->'complete' is distinct from 'true'::jsonb or
       jsonb_typeof(p_plan->'staff'->'lastWritten') is distinct from 'object' or
       jsonb_typeof(p_plan->'staff'->'expected') is distinct from 'object' then raise exception 'Verified staff plan required'; end if;
    if exists(select 1 from jsonb_each(p_plan->'staff'->'lastWritten') e where e.key not in ('D5','D6','D7','G6','G7') or jsonb_typeof(e.value)<>'string') then raise exception 'Invalid staff ledger'; end if;
  end if;
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
    elsif suffix in ('D5','D6','D7','G6','G7') then
      if t.config->'staffUpdatesEnabled' is distinct from 'true'::jsonb or
         jsonb_array_length(item->'values'->0)<>1 or jsonb_array_length(item->'values')<>1 or
         jsonb_typeof(item->'values'->0->0) is distinct from 'string' or
         (item->'values'->0->>0) is distinct from (p_plan->'staff'->'expected'->>suffix) or
         (item->'values'->0->>0) !~ (case suffix when 'D5' then '^Stage:' when 'D6' then '^Floor 1:' when 'D7' then '^Floor 2:' when 'G6' then '^On-Call 1:' else '^On-Call 2:' end)
      then raise exception 'Invalid staff header write'; end if;
      continue;
    else raise exception 'Protected column in write plan'; end if;
    if row_number>(t.config->>'rowLimit')::integer or jsonb_array_length(item->'values')<>1 then raise exception 'Write outside allowed rows'; end if;
  end loop;
  update public.seating_chart_refresh_runs set plan=p_plan,status='staged',updated_at=now() where run_id=p_run_id;
  return jsonb_build_object('staged',true,'runId',p_run_id);
end $$;
create or replace function public.complete_seating_chart_refresh(p_run_id text, p_result jsonb)
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
  if t.config->'staffUpdatesEnabled'='true'::jsonb and p_result->'staffVerified' is distinct from 'true'::jsonb then raise exception 'Staff readback verification required'; end if;
  update public.seating_chart_targets set staff_ledger=case when t.config->'staffUpdatesEnabled'='true'::jsonb then r.plan->'staff'->'lastWritten' else t.staff_ledger end,ledger=r.plan->'ledger',revision=revision+1,lease_run_id=null,lease_until=null,updated_at=now() where id=t.id;
  update public.seating_chart_refresh_runs set status='completed',result=p_result,updated_at=now() where run_id=p_run_id;
  return p_result;
end $$;
notify pgrst, 'reload schema';
do $$
declare target uuid; cfg jsonb; src jsonb; plan jsonb; result jsonb; run text; blocked boolean;
begin
  if has_column_privilege('authenticated','public.seating_chart_targets','staff_ledger','select') then raise exception 'Staff state exposed to browser role'; end if;
  select config into strict cfg from public.seating_chart_targets where id='b338bb62-58b2-4824-b38f-88e677d42fa2';
  cfg:=cfg||'{"classId":"9999999998","spreadsheetId":"synthetic-staff-copy","staffUpdatesEnabled":true}'::jsonb;
  insert into public.seating_chart_targets(studio_id,config,enabled) values(1,cfg,true) returning id into target;
  run:='staff-rollback-'||target;
  src:=jsonb_build_object('classId','9999999998','studioCode','STM','complete',true,'isPrivate',false,'expectedRowCount',1,'retrievedAt',now(),
    'rows','[{"reservationKey":"1"}]'::jsonb,'assignedStaff','{"complete":true,"expectedRowCount":1,"rows":[{"assignmentId":"1","name":"Synthetic Instructor","role":"Instructor","status":"Scheduled"}]}'::jsonb);
  perform public.claim_seating_chart_refresh(target,run,src);
  plan:='{"request":{"valueInputOption":"RAW","data":[{"range":"''Seating Chart Main''!D5","values":[["Stage: Synthetic"]]}]},"ledger":[],"staff":{"expected":{"D5":"Stage: Synthetic"},"lastWritten":{"D5":"Stage: Synthetic"}}}'::jsonb;
  blocked:=false;
  begin perform public.stage_seating_chart_refresh(run,jsonb_set(plan,'{request,data,0,range}','"''Seating Chart Main''!AB1"'::jsonb));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Attendance write accepted'; end if;
  blocked:=false;
  begin perform public.stage_seating_chart_refresh(run,jsonb_set(plan,'{request,data,0,range}','"''Seating Chart Main''!D8"'::jsonb));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Unmapped header write accepted'; end if;
  blocked:=false;
  begin perform public.stage_seating_chart_refresh(run,jsonb_set(plan,'{request,data,0,values}','[["Floor 1: Wrong"]]'::jsonb));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Unverified staff value accepted'; end if;
  perform public.stage_seating_chart_refresh(run,plan);
  result:='{"status":"updated","activeCount":1,"changedCount":0,"reviewCount":0,"seatingUnchanged":true,"attendanceUnchanged":true,"formulasUnchanged":true,"staffVerified":false}'::jsonb;
  blocked:=false;
  begin perform public.complete_seating_chart_refresh(run,result);
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Staff completion without readback accepted'; end if;
  perform public.complete_seating_chart_refresh(run,result||'{"staffVerified":true}'::jsonb);
  if (select staff_ledger->>'D5' from public.seating_chart_targets where id=target)<>'Stage: Synthetic' then raise exception 'Staff ledger missing'; end if;
end $$;
select 'staff_rollback_checks_passed' as status;
rollback;
select not exists(select 1 from information_schema.columns where table_schema='public' and table_name='seating_chart_targets' and column_name='staff_ledger') as staff_column_rolled_back,
 (select revision=2 and jsonb_array_length(ledger)=9 from public.seating_chart_targets where id='b338bb62-58b2-4824-b38f-88e677d42fa2') as reservation_pilot_unchanged;
