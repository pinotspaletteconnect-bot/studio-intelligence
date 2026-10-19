-- Independent product audit/lease state. Existing guest/staff state is unchanged.
-- Rollback: disable config.productReservations.enabled and restore the prior
-- creation-helper reference. Preserve product runs and native staff work.
begin;
create table public.seating_chart_product_runs(
 run_id text primary key,target_id uuid not null references public.seating_chart_targets(id),
 status text not null check(status in('claimed','staged','completed')),
 target jsonb not null,source jsonb not null,prior_ledger jsonb not null,
 plan jsonb,result jsonb,lease_until timestamptz not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index seating_product_target_time on public.seating_chart_product_runs(target_id,created_at);
create unique index seating_product_one_unfinished on public.seating_chart_product_runs(target_id)where status<>'completed';
alter table public.seating_chart_product_runs enable row level security;
revoke all on public.seating_chart_product_runs from public,anon,authenticated;
grant all on public.seating_chart_product_runs to service_role;
create function public.claim_seating_product_refresh(p_target_id uuid,p_run_id text,p_source jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.seating_chart_targets;s public.seating_chart_creation_settings;r public.seating_chart_product_runs;m jsonb;prior jsonb;
begin
 select * into strict t from public.seating_chart_targets where id=p_target_id for update;
 select * into strict s from public.seating_chart_creation_settings where studio_id=t.studio_id;
 if not t.enabled or not s.enabled or s.schedule_enabled or s.config->'productReservations'->'enabled' is distinct from 'true'::jsonb
  or t.config->>'studioCode'<>'STM' or t.config->'isPrivate' is distinct from 'false'::jsonb or t.config->>'spreadsheetId'=s.config->>'masterSpreadsheetId'
  or t.config->>'masterSpreadsheetId' is distinct from s.config->>'masterSpreadsheetId'
  or t.config->>'googleAccountEmail' is distinct from s.config->>'googleAccountEmail'
  or t.config->>'accountId' is distinct from s.config->>'accountId'
  or not exists(select 1 from public.studios st join public.pts_integration_accounts a on a.organization_id=st.organization_id where st.id=t.studio_id and a.id=(t.config->>'accountId')::bigint and a.is_active)
 then raise exception 'Unverified manual product target';end if;
 if p_run_id is null or length(p_run_id)not between 8 and 200 then raise exception 'Invalid product run ID';end if;
 select * into r from public.seating_chart_product_runs where run_id=p_run_id;
 if found then
  if r.target_id<>t.id then raise exception 'Wrong product run target';end if;
  if r.status='completed' then return jsonb_build_object('completed',true,'result',r.result);end if;
 else
  if exists(select 1 from public.seating_chart_product_runs where target_id=t.id and status<>'completed')then raise exception 'Recover prior product run before starting another';end if;
  m:=s.config->'productReservations'->'templates'->coalesce(t.config->>'templateSheetId',t.config->>'sheetId');
  if jsonb_typeof(m)is distinct from 'array' or jsonb_array_length(m)<>3 then raise exception 'Unmapped product template';end if;
  if p_source->>'classId' is distinct from t.config->>'classId' or p_source->>'studioCode' is distinct from t.config->>'studioCode'
   or p_source->'complete' is distinct from 'true'::jsonb or p_source->'isPrivate' is distinct from 'false'::jsonb
   or jsonb_typeof(p_source->'rows')is distinct from 'array' or p_source->>'expectedRowCount' is null
   or jsonb_array_length(p_source->'rows')<>(p_source->>'expectedRowCount')::integer
   or p_source->>'retrievedAt' is null or (p_source->>'retrievedAt')::timestamptz<now()-interval '10 minutes' or (p_source->>'retrievedAt')::timestamptz>now()+interval '1 minute'
  then raise exception 'Unverified product source';end if;
  select plan->'lastWritten' into prior from public.seating_chart_product_runs where target_id=t.id and status='completed' order by created_at desc,run_id desc limit 1;
  insert into public.seating_chart_product_runs(run_id,target_id,status,target,source,prior_ledger,lease_until)
   values(p_run_id,t.id,'claimed',t.config||jsonb_build_object('productMapping',m),p_source,coalesce(prior,'{}'::jsonb),now()+interval '10 minutes')returning * into r;
 end if;
 if r.lease_until<now()then raise exception 'Expired product lease requires review';end if;
 return jsonb_build_object('target',r.target,'source',r.source,'ledger',r.prior_ledger,'plan',r.plan,'runId',r.run_id);
end $$;
create function public.stage_seating_product_refresh(p_run_id text,p_plan jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.seating_chart_product_runs;item jsonb;prefix text;suffix text;k text;v jsonb;allowed text[];
begin
 select * into strict r from public.seating_chart_product_runs where run_id=p_run_id for update;
 if r.status not in('claimed','staged')or r.lease_until<now()then raise exception 'Invalid product lease';end if;
 if r.plan is not null and r.plan<>p_plan then raise exception 'Product plan is immutable';end if;
 if p_plan->'request'->>'valueInputOption'is distinct from 'RAW' or jsonb_typeof(p_plan->'request'->'data')is distinct from 'array'
  or jsonb_typeof(p_plan->'expected')is distinct from 'object' or jsonb_typeof(p_plan->'lastWritten')is distinct from 'object'
  or jsonb_typeof(p_plan->'review')is distinct from 'array' or p_plan->>'unitCount' is null or (p_plan->>'unitCount')::integer<>jsonb_array_length(r.source->'rows')
 then raise exception 'Invalid product plan';end if;
 select array_agg(cell)into allowed from(select value->>'namesCell'cell from jsonb_array_elements(r.target->'productMapping')union all select value->>'totalCell' from jsonb_array_elements(r.target->'productMapping'))q;
 if cardinality(allowed)<>6 or(select count(distinct a)from unnest(allowed)a)<>6 or exists(select 1 from unnest(allowed)a where a not in('J19','R19','J20','R20','J21','R21','J23','R23','J24','R24','J25','R25'))then raise exception 'Invalid product cell mapping';end if;
 for k,v in select key,value from jsonb_each(p_plan->'lastWritten')union all select key,value from jsonb_each(p_plan->'expected')loop
  if not(k=any(allowed))or(left(k,1)='J' and(jsonb_typeof(v)<>'string' or length(v#>>'{}')>45000))or(left(k,1)='R' and(jsonb_typeof(v)<>'number' or(v#>>'{}')!~'^[0-9]+$'))then raise exception 'Invalid product ledger cell';end if;
 end loop;
 prefix:=chr(39)||replace(r.target->>'sheetName',chr(39),chr(39)||chr(39))||chr(39)||'!';
 if jsonb_array_length(p_plan->'request'->'data')>6 then raise exception 'Too many product writes';end if;
 for item in select value from jsonb_array_elements(p_plan->'request'->'data')loop
  suffix:=substr(item->>'range',length(prefix)+1);
  if left(item->>'range',length(prefix))is distinct from prefix or not(suffix=any(allowed))or jsonb_typeof(item->'values')is distinct from 'array'or jsonb_typeof(item->'values'->0)is distinct from 'array'or jsonb_array_length(item->'values')is distinct from 1 or jsonb_array_length(item->'values'->0)is distinct from 1
   or p_plan->'expected'->suffix is distinct from item->'values'->0->0 then raise exception 'Protected or mismatched product write';end if;
 end loop;
 update public.seating_chart_product_runs set plan=p_plan,status='staged',updated_at=now()where run_id=p_run_id;
 return jsonb_build_object('staged',true);
end $$;
create function public.complete_seating_product_refresh(p_run_id text,p_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.seating_chart_product_runs;
begin
 select * into strict r from public.seating_chart_product_runs where run_id=p_run_id for update;
 if r.status='completed'then return r.result;end if;
 if r.status<>'staged'or r.lease_until<now()or p_result->'productsVerified'is distinct from 'true'::jsonb or p_result->'protectedCellsUnchanged'is distinct from 'true'::jsonb
  or(p_result->>'unitCount')::integer is distinct from jsonb_array_length(r.source->'rows')then raise exception 'Verified product readback required';end if;
 update public.seating_chart_product_runs set status='completed',result=p_result,updated_at=now()where run_id=p_run_id;
 return p_result;
end $$;
revoke all on function public.claim_seating_product_refresh(uuid,text,jsonb),public.stage_seating_product_refresh(text,jsonb),public.complete_seating_product_refresh(text,jsonb)from public,anon,authenticated;
grant execute on function public.claim_seating_product_refresh(uuid,text,jsonb),public.stage_seating_product_refresh(text,jsonb),public.complete_seating_product_refresh(text,jsonb)to service_role;
notify pgrst,'reload schema';
commit;
