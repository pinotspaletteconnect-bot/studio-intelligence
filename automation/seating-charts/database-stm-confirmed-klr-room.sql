-- One owner-confirmed room correction, after native backup and protected readback.
-- APPLIED October 19, 2026 after explicit approval, backup and native readback.
-- Historical evidence only: DO NOT REPLAY this one-time correction.
begin;
do $$
declare t public.seating_chart_targets;w public.seating_chart_workbooks;s public.seating_chart_creation_settings;
 old_event jsonb;new_source jsonb;new_plan jsonb;label text;new_name text;new_title text;template bigint;
begin
 select * into strict t from public.seating_chart_targets where studio_id=1 and config->>'classId'='931961' for update;
 if t.enabled or t.lease_run_id is not null or t.config->>'sourceRoomId'<>'21' or jsonb_array_length(t.ledger)<>0 or t.config->>'spreadsheetId'<>'1RTRvFZ8FO4a2ndWxpT0KCytd6YHAMoXHZSKin0QMY6o' then raise exception 'Pause and verify the empty original target first';end if;
 select * into strict w from public.seating_chart_workbooks where id=t.workbook_id for update;
 select * into strict s from public.seating_chart_creation_settings where studio_id=1;
 if w.state<>'ready' or w.lease_run_id is not null then raise exception 'Workbook requires recovery';end if;
 label:=s.config->'creation'->'rooms'->'22'->>'label';template:=(s.config->'creation'->'rooms'->'22'->>'templateSheetId')::bigint;
 if label<>'KLR' or template<>1955136908 then raise exception 'Unverified room template';end if;
 select value into strict old_event from jsonb_array_elements(w.source->'events')where value->>'classId'='931961';
 new_name:=regexp_replace(t.config->>'sheetName','^Main ','KLR ');
 new_title:=replace(w.plan->>'title',(old_event->>'painting')||' (Main)',(old_event->>'painting')||' (KLR)');
 select jsonb_set(w.source,'{events}',jsonb_agg(case when value->>'classId'='931961' then value||jsonb_build_object('sourceRoomId','22','roomLabel',label,'details',(value->'details')||jsonb_build_object('roomId','22','roomLabel','King Louie Private Room'))else value end order by ord))into new_source from jsonb_array_elements(w.source->'events')with ordinality a(value,ord);
 new_source:=jsonb_set(new_source,'{title}',to_jsonb(new_title));
 select jsonb_set(w.plan,'{tabs}',jsonb_agg(case when value->>'classId'='931961' then value||jsonb_build_object('sourceRoomId','22','templateSheetId',template,'sheetName',new_name)else value end order by ord))into new_plan from jsonb_array_elements(w.plan->'tabs')with ordinality a(value,ord);
 new_plan:=jsonb_set(new_plan,'{title}',to_jsonb(new_title));
 select jsonb_set(new_plan,'{structure,requests}',jsonb_agg(case when value->'duplicateSheet'->>'newSheetId'=t.config->>'sheetId' then jsonb_build_object('duplicateSheet',(value->'duplicateSheet')||jsonb_build_object('sourceSheetId',template,'newSheetName',new_name))else value end order by ord))into new_plan from jsonb_array_elements(new_plan->'structure'->'requests')with ordinality a(value,ord);
 update public.seating_chart_workbooks set source=new_source,plan=new_plan,result=coalesce(result,'{}'::jsonb)||jsonb_build_object('roomCorrections',coalesce(result->'roomCorrections','[]'::jsonb)||jsonb_build_array(jsonb_build_object('classId','931961','reason','owner-confirmed KLR; blank chart layout approval','beforeSource',w.source,'beforePlan',w.plan,'beforeTarget',t.config,'backupSheetId',200931961,'protectedCellsUnchanged',true,'correctedAt',now()))),updated_at=now()where id=w.id;
 update public.seating_chart_workbook_events set sheet_name=new_name,template_sheet_id=template where studio_id=1 and class_id='931961';
 update public.seating_chart_targets set config=config||jsonb_build_object('sourceRoomId','22','templateSheetId',template,'sheetName',new_name),enabled=true,updated_at=now()where id=t.id;
 update public.seating_chart_schedule_runs set result=result||jsonb_build_object('resolution','owner-confirmed room mapping corrected; original chart preserved as hidden backup','reviewResolvedAt',now())where id='11acfa49-f32d-4723-8b08-7ae1e9e4e875' and status='needs-review';
end $$;
commit;
select config->>'classId'as class_id,config->>'sourceRoomId'as room_id,config->>'sheetName'as tab,enabled,lease_run_id is null as no_lease from public.seating_chart_targets where studio_id=1 and config->>'classId'='931961';
