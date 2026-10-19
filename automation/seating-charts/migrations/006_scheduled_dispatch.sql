-- Owner authorized STM schedules on October 19. Apply disabled, test, enable last.
-- Rollback: unpublish10 and set schedule_enabled=false. Preserve all run history.
begin;
do $$ declare c record; f regprocedure; before text; after text; begin
 for c in select conname from pg_constraint where conrelid='public.seating_chart_creation_settings'::regclass and contype='c' and pg_get_constraintdef(oid) like '%schedule_enabled%' loop
  execute format('alter table public.seating_chart_creation_settings drop constraint %I',c.conname);
 end loop;
 alter table public.seating_chart_creation_settings add constraint seating_schedule_verified_stm check(not schedule_enabled or (studio_id=1 and config->>'studioCode'='STM' and config->>'timeZone'='America/New_York'));
 foreach f in array array['public.claim_seating_chart_workbook(bigint,text,jsonb,jsonb)'::regprocedure,'public.advance_seating_chart_workbook(uuid,text,text,jsonb)'::regprocedure,'public.claim_seating_product_refresh(uuid,text,jsonb)'::regprocedure] loop
  before:=pg_get_functiondef(f);after:=replace(before,' or s.schedule_enabled','');
  if before=after then raise exception 'Unexpected manual guard definition';end if;
  execute after;
 end loop;
end $$;
create table public.seating_chart_schedule_runs(
 id uuid primary key default gen_random_uuid(),studio_id bigint not null references public.studios(id),
 job_key text not null,kind text not null check(kind in('refresh','discovery')),
 target_id uuid references public.seating_chart_targets(id),start_at timestamptz,due_at timestamptz not null,
 execution_id text not null,status text not null check(status in('running','completed','needs-review')),
 result jsonb,created_at timestamptz not null default now(),completed_at timestamptz,
 unique(studio_id,job_key)
);
create unique index seating_schedule_one_running on public.seating_chart_schedule_runs(studio_id)where status='running';
alter table public.seating_chart_schedule_runs enable row level security;
revoke all on public.seating_chart_schedule_runs from public,anon,authenticated;
grant all on public.seating_chart_schedule_runs to service_role;
update public.seating_chart_creation_settings set config=jsonb_set(config,'{schedule}',
 '{"overnightLocalTime":"02:00","discoveryMinutes":15,"refreshMinutesBefore":[1440,360,300,240,180,120,75],"finalGraceMinutes":5}'::jsonb),updated_at=now()where studio_id=1;

create function public.claim_seating_schedule(p_execution_id text,p_preview boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.seating_chart_creation_settings;r public.seating_chart_schedule_runs;c record;key text;at timestamptz:=now();d timestamptz;known jsonb;
begin
 select * into strict s from public.seating_chart_creation_settings where studio_id=1 for update;
 if not s.enabled or not s.schedule_enabled then return jsonb_build_object('idle',true,'reason','disabled');end if;
 if p_execution_id is null or length(p_execution_id)not between 1 and 200 then raise exception 'Execution identity required';end if;
 if s.config->'schedule'->'refreshMinutesBefore' is distinct from '[1440,360,300,240,180,120,75]'::jsonb or s.config->'schedule'->>'overnightLocalTime'<>'02:00' then raise exception 'Unverified schedule policy';end if;
 if exists(select 1 from public.seating_chart_schedule_runs where studio_id=1 and status='running')then return jsonb_build_object('idle',true,'reason','running-or-recovery-required');end if;
 -- One latest overdue update per class. Never replay an old burst or touch a
 -- finished class. Start times are registered actual event instants, not titles.
 with events as(
  select t.id,e.start_at from public.seating_chart_targets t join public.seating_chart_workbook_events e on e.studio_id=t.studio_id and e.class_id=t.config->>'classId'
   join public.seating_chart_workbooks w on w.id=e.workbook_id
  where t.studio_id=1 and t.enabled and not e.is_private and w.state='ready' and e.start_at between at+interval '70 minutes' and at+interval '7 days'
 ), candidates as(
  select e.*,q.due from events e cross join lateral(
   select max(x.due)due from(
    select e.start_at-m.make_interval as due from unnest(array[1440,360,300,240,180,120,75])n cross join lateral(select make_interval(mins=>n))m
    union all
    select ((timezone(s.config->>'timeZone',at)::date-1 +time '02:00')at time zone(s.config->>'timeZone'))
    union all
    select ((timezone(s.config->>'timeZone',at)::date +time '02:00')at time zone(s.config->>'timeZone'))
   )x where x.due<=at and x.due>=e.start_at-interval '7 days' and x.due<=e.start_at-interval '75 minutes'
  )q
 )select * into c from candidates x where x.due is not null and not exists(select 1 from public.seating_chart_schedule_runs seen where seen.studio_id=1 and seen.job_key=x.id::text||':'||extract(epoch from x.start_at)::text||':'||extract(epoch from x.due)::text)order by x.start_at,x.due limit 1;
 if found then
  key:=c.id::text||':'||extract(epoch from c.start_at)::text||':'||extract(epoch from c.due)::text;
  if not p_preview then insert into public.seating_chart_schedule_runs(studio_id,job_key,kind,target_id,start_at,due_at,execution_id,status)values(1,key,'refresh',c.id,c.start_at,c.due,p_execution_id,'running')returning * into r;end if;
  return jsonb_build_object('kind','refresh','jobId',r.id,'targetId',c.id,'scheduledStartAt',c.start_at,'dueAt',c.due,'preview',p_preview);
 end if;
 -- Avoid placing a whole-studio discovery in front of an imminent milestone.
 if exists(select 1 from public.seating_chart_workbook_events e cross join unnest(array[1440,360,300,240,180,120,75])n where e.studio_id=1 and not e.is_private and e.start_at-make_interval(mins=>n)between at and at+interval '5 minutes')then return jsonb_build_object('idle',true,'reason','milestone-soon');end if;
 d:=to_timestamp(floor(extract(epoch from at)/900)*900);key:='discovery:'||extract(epoch from d)::text;
 if exists(select 1 from public.seating_chart_schedule_runs where studio_id=1 and job_key=key)then return jsonb_build_object('idle',true,'reason','up-to-date');end if;
 select coalesce(jsonb_agg(jsonb_build_object('groupKey',group_key,'plan',plan,'state',state)),'[]'::jsonb)into known from public.seating_chart_workbooks where studio_id=1;
 if not p_preview then insert into public.seating_chart_schedule_runs(studio_id,job_key,kind,due_at,execution_id,status)values(1,key,'discovery',d,p_execution_id,'running')returning * into r;end if;
 return jsonb_build_object('kind','discovery','jobId',r.id,'config',s.config,'knownWorkbooks',known,
  'fromDate',to_char(timezone(s.config->>'timeZone',at)::date-1,'YYYY-MM-DD'),'toDate',to_char(timezone(s.config->>'timeZone',at)::date+9,'YYYY-MM-DD'),'preview',p_preview);
end $$;
create function public.complete_seating_schedule(p_job_id uuid,p_execution_id text,p_result jsonb,p_failed boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.seating_chart_schedule_runs;
begin
 select * into strict r from public.seating_chart_schedule_runs where id=p_job_id for update;
 if r.execution_id<>p_execution_id or r.status<>'running' then raise exception 'Wrong scheduled execution';end if;
 if not p_failed and r.kind='refresh' and(p_result->'reservations'->'seatingUnchanged' is distinct from 'true'::jsonb or p_result->'reservations'->'attendanceUnchanged'is distinct from 'true'::jsonb or p_result->'reservations'->'formulasUnchanged'is distinct from 'true'::jsonb or p_result->'products'->'protectedCellsUnchanged'is distinct from 'true'::jsonb)then raise exception 'Protected readback required';end if;
 update public.seating_chart_schedule_runs set status=case when p_failed then 'needs-review'else 'completed'end,result=p_result,completed_at=now()where id=r.id;
 return jsonb_build_object('status',case when p_failed then 'needs-review'else 'completed'end,'kind',r.kind);
end $$;
revoke all on function public.claim_seating_schedule(text,boolean),public.complete_seating_schedule(uuid,text,jsonb,boolean)from public,anon,authenticated;
grant execute on function public.claim_seating_schedule(text,boolean),public.complete_seating_schedule(uuid,text,jsonb,boolean)to service_role;
notify pgrst,'reload schema';
commit;
