-- STM manual workbook creation. Additive private state; schedules remain OFF.
-- Rollback: disable only seating_chart_creation_settings.enabled and leave the
-- manual workflows unpublished. Preserve created files, targets and history.
begin;
create table public.seating_chart_creation_settings(
 studio_id bigint primary key references public.studios(id),
 config jsonb not null check(jsonb_typeof(config)='object'),
 enabled boolean not null default false,
 schedule_enabled boolean not null default false check(schedule_enabled=false),
 updated_at timestamptz not null default now()
);
create table public.seating_chart_workbooks(
 id uuid primary key default gen_random_uuid(),studio_id bigint not null references public.studios(id),
 group_key text not null,source jsonb not null,plan jsonb not null,values_plan jsonb,
 state text not null default 'planned' check(state in('planned','copy-issued','copied','structured','values-staged','ready')),
 file_id text unique,lease_run_id text,lease_until timestamptz,result jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(studio_id,group_key),check(jsonb_typeof(source)='object'),check(jsonb_typeof(plan)='object')
);
create table public.seating_chart_workbook_events(
 studio_id bigint not null references public.studios(id),class_id text not null check(class_id~'^[0-9]+$'),
 workbook_id uuid not null references public.seating_chart_workbooks(id),
 is_private boolean not null,sheet_id bigint not null,sheet_name text not null,
 template_sheet_id bigint not null,start_at timestamptz not null,end_at timestamptz not null,
 primary key(studio_id,class_id),unique(workbook_id,sheet_id),unique(workbook_id,sheet_name),check(end_at>start_at)
);
alter table public.seating_chart_creation_settings enable row level security;
alter table public.seating_chart_workbooks enable row level security;
alter table public.seating_chart_workbook_events enable row level security;
revoke all on public.seating_chart_creation_settings,public.seating_chart_workbooks,public.seating_chart_workbook_events from public,anon,authenticated;
grant all on public.seating_chart_creation_settings,public.seating_chart_workbooks,public.seating_chart_workbook_events to service_role;

-- Keep the original pilot shape valid. New public targets must belong to an
-- explicitly registered creation group and one of the two verified room bases.
alter table public.seating_chart_targets add column workbook_id uuid references public.seating_chart_workbooks(id);
do $$ declare c record; n integer:=0; begin
 for c in select conname from pg_constraint where conrelid='public.seating_chart_targets'::regclass and contype='c'
   and (pg_get_constraintdef(oid) like '%''sheetName''%' or pg_get_constraintdef(oid) like '%''sheetId''%')
   and pg_get_constraintdef(oid) not like '%?&%' loop
  execute format('alter table public.seating_chart_targets drop constraint %I',c.conname);n:=n+1;
 end loop;
 if n<>2 then raise exception 'Unexpected pilot shape constraints';end if;
end $$;
alter table public.seating_chart_targets add constraint seating_target_registered_tab check(
 ((workbook_id is null and config->>'sheetName'='Seating Chart Main' and config->>'sheetId'='0') or
 (workbook_id is not null and config->>'documentGroupId'=workbook_id::text and config->>'templateSheetId' in('0','1955136908')
  and (config->>'sheetId')::bigint=100000000+(config->>'classId')::bigint)) is true
);

create function public.claim_seating_chart_workbook(p_studio_id bigint,p_run_id text,p_group jsonb,p_plan jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.seating_chart_creation_settings;w public.seating_chart_workbooks;e jsonb;t jsonb;k text;prior_end timestamptz;first_start timestamptz;allowed_structure jsonb;
begin
 select * into strict s from public.seating_chart_creation_settings where studio_id=p_studio_id;
 if not s.enabled or s.schedule_enabled or s.config->>'studioCode'<>'STM' then raise exception 'Manual STM creation is disabled';end if;
 if not exists(select 1 from public.studios st join public.pts_integration_accounts a on a.organization_id=st.organization_id
  where st.id=p_studio_id and st.organization_id=(s.config->>'organizationId')::bigint and a.id=(s.config->>'accountId')::bigint and a.is_active) then raise exception 'Source owner mismatch';end if;
 if length(p_run_id) not between 8 and 200 or p_run_id is null or p_group->>'studioId' is distinct from p_studio_id::text
  or p_group->>'organizationId' is distinct from s.config->>'organizationId' or jsonb_typeof(p_group->'events') is distinct from 'array'
  or jsonb_array_length(p_group->'events') not between 1 and 8 or p_group->>'sourceRetrievedAt' is null
  or (p_group->>'sourceRetrievedAt')::timestamptz<now()-interval '10 minutes' or (p_group->>'sourceRetrievedAt')::timestamptz>now()+interval '1 minute'
 then raise exception 'Invalid creation source';end if;
 select 'stm-v1-'||string_agg(value->>'classId','-' order by value->>'classId') into k from jsonb_array_elements(p_group->'events');
 if p_group->>'groupKey' is distinct from k or p_plan->>'groupKey' is distinct from k or p_plan->>'title' is distinct from p_group->>'title'
  or jsonb_array_length(p_plan->'tabs')<>jsonb_array_length(p_group->'events') then raise exception 'Group plan mismatch';end if;
 for e in select value from jsonb_array_elements(p_group->'events') order by (value->>'startAt')::timestamptz,value->>'classId' loop
  if e->>'classId'!~'^[0-9]+$' or e->>'studioId' is distinct from p_studio_id::text or e->>'organizationId' is distinct from s.config->>'organizationId'
   or e->>'timeZone' is distinct from s.config->>'timeZone' or (e->>'endAt')::timestamptz<=(e->>'startAt')::timestamptz
   or (e->>'endAt')::timestamptz>(e->>'startAt')::timestamptz+interval '12 hours'
   or s.config->'creation'->'rooms'->(e->>'sourceRoomId') is null
   or s.config->'creation'->'classTypes'->(e->>'classTypeId')->'isPrivate' is distinct from e->'isPrivate'
  then raise exception 'Unverified event ownership/type/time';end if;
  if prior_end is not null and (e->>'startAt')::timestamptz>=prior_end then raise exception 'Disconnected overlap group';end if;
  prior_end:=greatest(prior_end,(e->>'endAt')::timestamptz);first_start:=least(first_start,(e->>'startAt')::timestamptz);
  select value into strict t from jsonb_array_elements(p_plan->'tabs') where value->>'classId'=e->>'classId';
  if t->'isPrivate' is distinct from e->'isPrivate' or t->>'startAt' is distinct from e->>'startAt' or t->>'endAt' is distinct from e->>'endAt'
   or t->>'sourceRoomId' is distinct from e->>'sourceRoomId' or t->>'classTypeId' is distinct from e->>'classTypeId'
   or (t->>'sheetId')::bigint<>100000000+(e->>'classId')::bigint or length(t->>'sheetName') not between 1 and 100
   or t->>'templateSheetId' is distinct from (case when e->'isPrivate'='true'::jsonb then s.config->'privatePartyFormMapping'->>'sheetId' else s.config->'creation'->'rooms'->(e->>'sourceRoomId')->>'templateSheetId' end)
  then raise exception 'Invalid event tab plan';end if;
 end loop;
 select jsonb_agg(jsonb_build_object('duplicateSheet',jsonb_build_object('sourceSheetId',(planned_tab->>'templateSheetId')::bigint,'newSheetId',(planned_tab->>'sheetId')::bigint,'newSheetName',planned_tab->>'sheetName')) order by ord)into allowed_structure from jsonb_array_elements(p_plan->'tabs')with ordinality x(planned_tab,ord);
 allowed_structure:=allowed_structure||jsonb_build_array(
  jsonb_build_object('updateSheetProperties',jsonb_build_object('properties',jsonb_build_object('sheetId',0,'hidden',true),'fields','hidden')),
  jsonb_build_object('updateSheetProperties',jsonb_build_object('properties',jsonb_build_object('sheetId',1955136908,'hidden',true),'fields','hidden')),
  jsonb_build_object('updateSheetProperties',jsonb_build_object('properties',jsonb_build_object('sheetId',(s.config->'privatePartyFormMapping'->>'sheetId')::bigint,'hidden',true),'fields','hidden')));
 if p_plan->'structure'->'requests' is distinct from allowed_structure then raise exception 'Only native event duplication and base hiding allowed';end if;
 if first_start>now()+interval '7 days' or prior_end<=now() then raise exception 'Group is outside creation window';end if;
 perform pg_advisory_xact_lock(728915,p_studio_id::integer);
 select * into w from public.seating_chart_workbooks where studio_id=p_studio_id and group_key=k for update;
 if found then
  if w.plan<>p_plan then raise exception 'Existing workbook membership/time/title changed; review instead of moving staff work';end if;
  if w.state='ready' then return jsonb_build_object('groupId',w.id,'ready',true,'fileId',w.file_id,'plan',w.plan,
    'targets',coalesce((select jsonb_agg(id) from public.seating_chart_targets where workbook_id=w.id),'[]'::jsonb));end if;
  if w.lease_run_id is not null and w.lease_until>now() then raise exception 'Creation lease held; do not duplicate files';end if;
 else
  if exists(select 1 from jsonb_array_elements(p_group->'events') existing_event where exists(select 1 from public.seating_chart_workbook_events d where d.studio_id=p_studio_id and d.class_id=existing_event->>'classId')
   or exists(select 1 from public.seating_chart_targets target_row where target_row.studio_id=p_studio_id and target_row.config->>'classId'=existing_event->>'classId')) then raise exception 'Class already mapped; changed overlap needs review';end if;
  insert into public.seating_chart_workbooks(studio_id,group_key,source,plan)values(p_studio_id,k,p_group,p_plan)returning * into w;
  insert into public.seating_chart_workbook_events(studio_id,class_id,workbook_id,is_private,sheet_id,sheet_name,template_sheet_id,start_at,end_at)
   select p_studio_id,doc_tab->>'classId',w.id,(doc_tab->>'isPrivate')::boolean,(doc_tab->>'sheetId')::bigint,doc_tab->>'sheetName',(doc_tab->>'templateSheetId')::bigint,(doc_tab->>'startAt')::timestamptz,(doc_tab->>'endAt')::timestamptz from jsonb_array_elements(p_plan->'tabs')doc_tab;
 end if;
 update public.seating_chart_workbooks set lease_run_id=p_run_id,lease_until=now()+interval '15 minutes',updated_at=now()where id=w.id;
 return jsonb_build_object('groupId',w.id,'ready',false,'state',w.state,'fileId',w.file_id,'source',w.source,'plan',w.plan,'valuesPlan',w.values_plan,'config',s.config);
end $$;

create function public.advance_seating_chart_workbook(p_group_id uuid,p_run_id text,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.seating_chart_workbooks;s public.seating_chart_creation_settings;t jsonb;e jsonb;target_config jsonb;item jsonb;prefix text;suffix text;
begin
 select * into strict w from public.seating_chart_workbooks where id=p_group_id for update;
 select * into strict s from public.seating_chart_creation_settings where studio_id=w.studio_id;
 if not s.enabled or s.schedule_enabled or w.lease_run_id is distinct from p_run_id or w.lease_until<now() or w.lease_until is null then raise exception 'Invalid creation lease';end if;
 if p_action='copy-issued' then
  if w.state<>'planned' then raise exception 'Do not repeat a copy request';end if;
  update public.seating_chart_workbooks set state='copy-issued' where id=w.id;
 elsif p_action='copied' then
  if w.state not in('planned','copy-issued','copied','structured','values-staged') or p_data->>'id' is null or p_data->>'id'=s.config->>'masterSpreadsheetId'
   or p_data->>'mimeType' is distinct from 'application/vnd.google-apps.spreadsheet' or p_data->'capabilities'->'canEdit' is distinct from 'true'::jsonb
   or (p_data->'parents' ? (s.config->>'destinationFolderId')) is distinct from true or not exists(select 1 from jsonb_array_elements(p_data->'owners')o where o->>'emailAddress'=s.config->>'googleAccountEmail')
   or p_data->'appProperties'->>'seatingGroupId' is distinct from w.id::text or p_data->'appProperties'->>'seatingMasterId' is distinct from s.config->>'masterSpreadsheetId'
   or w.file_id is not null and w.file_id<>p_data->>'id' then raise exception 'Wrong or ambiguous copied workbook';end if;
  update public.seating_chart_workbooks set file_id=p_data->>'id',state=case when state in('planned','copy-issued')then 'copied'else state end where id=w.id;
 elsif p_action='structured' then
  if w.state not in('copied','structured','values-staged') or p_data->'verified' is distinct from 'true'::jsonb then raise exception 'Structure readback required';end if;
  update public.seating_chart_workbooks set state=case when state='copied'then 'structured'else state end where id=w.id;
 elsif p_action='values-staged' then
  if w.state not in('structured','values-staged') or jsonb_typeof(p_data->'expected') is distinct from 'object' or p_data->'request'->>'valueInputOption' is distinct from 'RAW'
   or jsonb_typeof(p_data->'request'->'data') is distinct from 'array' then raise exception 'Invalid initial value plan';end if;
  if w.values_plan is not null and w.values_plan<>p_data then raise exception 'Initial plan is immutable';end if;
  for item in select value from jsonb_array_elements(p_data->'request'->'data') loop
   if jsonb_array_length(item->'values')<>1 or jsonb_array_length(item->'values'->0)<>1 then raise exception 'Only single creation header cells allowed';end if;
   select value into t from jsonb_array_elements(w.plan->'tabs')tt where left(item->>'range',length(chr(39)||replace(tt->>'sheetName',chr(39),chr(39)||chr(39))||chr(39)||'!'))=chr(39)||replace(tt->>'sheetName',chr(39),chr(39)||chr(39))||chr(39)||'!';
   if t is null then raise exception 'Wrong creation tab';end if;
   prefix:=chr(39)||replace(t->>'sheetName',chr(39),chr(39)||chr(39))||chr(39)||'!';suffix:=substr(item->>'range',length(prefix)+1);
   if (t->'isPrivate'='false'::jsonb and suffix not in('A3','D3','J3','P3','R5','C6','C7','D5','D6','D7','G6','G7'))
    or (t->'isPrivate'='true'::jsonb and suffix not in('C3','C4','C5','C8','C12','C15','C22','G2','H2','C7','C19'))
    or p_data->'expected'->((t->>'sheetId')||':'||suffix) is distinct from item->'values'->0->0 then raise exception 'Protected or mismatched creation cell';end if;
  end loop;
  update public.seating_chart_workbooks set values_plan=p_data,state='values-staged' where id=w.id;
 elsif p_action='completed' then
  if w.state<>'values-staged' or p_data->'verified' is distinct from 'true'::jsonb or p_data->'protectedCellsUnchanged' is distinct from 'true'::jsonb then raise exception 'Verified creation readback required';end if;
  for t in select value from jsonb_array_elements(w.plan->'tabs')where value->'isPrivate'='false'::jsonb loop
   select value into strict e from jsonb_array_elements(w.source->'events')where value->>'classId'=t->>'classId';
   target_config:=jsonb_build_object('studioCode','STM','studioId',w.studio_id,'accountId',(s.config->>'accountId')::bigint,'isPrivate',false,
    'classId',t->>'classId','spreadsheetId',w.file_id,'masterSpreadsheetId',s.config->>'masterSpreadsheetId','googleAccountEmail',s.config->>'googleAccountEmail',
    'sheetId',(t->>'sheetId')::bigint,'sheetName',t->>'sheetName','rowLimit',1000,'allowPilotAdoption',false,'sourceLocationLabel',s.config->>'sourceLocationLabel',
    'sourceRoomId',t->>'sourceRoomId','allowedClassTypeIds',jsonb_build_array(t->>'classTypeId'),'staffUpdatesEnabled',true,'templateSheetId',(t->>'templateSheetId')::bigint,'documentGroupId',w.id);
   insert into public.seating_chart_targets(studio_id,config,enabled,workbook_id,staff_ledger)values(w.studio_id,target_config,true,w.id,coalesce(w.values_plan->'staffLedgers'->(t->>'classId'),'{}'::jsonb));
  end loop;
  update public.seating_chart_workbooks set state='ready',result=p_data,lease_run_id=null,lease_until=null where id=w.id;
 else raise exception 'Unknown creation step';end if;
 update public.seating_chart_workbooks set updated_at=now()where id=w.id;
 return jsonb_build_object('groupId',w.id,'fileId',(select file_id from public.seating_chart_workbooks where id=w.id),'advanced',p_action,'targets',coalesce((select jsonb_agg(id)from public.seating_chart_targets where workbook_id=w.id),'[]'::jsonb));
end $$;
revoke all on function public.claim_seating_chart_workbook(bigint,text,jsonb,jsonb),public.advance_seating_chart_workbook(uuid,text,text,jsonb)from public,anon,authenticated;
grant execute on function public.claim_seating_chart_workbook(bigint,text,jsonb,jsonb),public.advance_seating_chart_workbook(uuid,text,text,jsonb)to service_role;
notify pgrst,'reload schema';
insert into public.seating_chart_creation_settings(studio_id,config,enabled) values(1, '{"studioCode":"STM","timeZone":"America/New_York","organizationId":1,"studioId":1,"googleAccountEmail":"pinotsstmatthews@gmail.com","sourceLocationLabel":"Matthews","sourceRoomId":"21","allowedClassTypeIds":["100"],"n8nGoogleCredentialRef":"Fmbjd7IWMJeb4vZQ","destinationFolderId":"1-WqB2lVbK6e1j6Y0mCojZjPoCvmaJ4L7","masterSpreadsheetId":"1ktf-zV74f--JWaaPlrrtYgmbLVGI6ZJI9JdArrYootA","rooms":{"Main Studio":{"label":"Main","templateSheetId":0},"King Louie Private Room":{"label":"KLR","templateSheetId":1955136908}},"importStartCell":"V1","importHasHeader":false,"fieldMapping":{"perks":"V","guest":"W","guestEmail":"X","purchaser":"Y","purchaserEmail":"Z","purchaserPhone":"AA","comments":"AC"},"preserveColumns":{"T":"manual seat numbers","U":"guest label formulas","AB":"attendance / Checked In"},"privatePartyFormMapping":{"sheetId":1452226892,"sheetName":"Private Party","fields":{"dateAndTime":"C3","hostNameAndPhone":"C4","paintingSummary":"C5","eventName":"C8","pricePerSeat":"C12","paymentArrangement":"C15","expectedHeadcount":"C22"},"preserveStaffEdits":true,"unverifiedDetails":"review-without-guessing"},"staffHeaderMapping":{"stage":"D5","floor":["D6","D7"],"onCall":["G6","G7"]},"accountId":1,"creation":{"rooms":{"21":{"label":"Main","templateSheetId":0},"22":{"label":"KLR","templateSheetId":1955136908}},"classTypes":{"100":{"label":"Regular","isPrivate":false},"200":{"label":"Private Party","isPrivate":true}}}}'::jsonb,false);
update public.seating_chart_creation_settings set enabled=true where studio_id=1 and schedule_enabled=false;
commit;
select studio_id,enabled,schedule_enabled,not has_table_privilege('anon','public.seating_chart_workbooks','SELECT')as browser_access_denied from public.seating_chart_creation_settings;
