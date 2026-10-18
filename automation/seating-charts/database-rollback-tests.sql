-- Append this inside the migration transaction IN PLACE OF its final COMMIT.
-- Every synthetic record and every new object disappears at ROLLBACK.
do $$
declare target uuid; run text; v jsonb; config jsonb; source jsonb; plan jsonb; result jsonb; blocked boolean;
begin
  if has_table_privilege('anon','public.seating_chart_targets','select') or
     has_table_privilege('authenticated','public.seating_chart_refresh_runs','select') or
     has_function_privilege('anon','public.claim_seating_chart_refresh(uuid,text,jsonb)','execute') or
     has_function_privilege('authenticated','public.stage_seating_chart_refresh(text,jsonb)','execute') then raise exception 'Browser roles can access private state'; end if;
  if not has_table_privilege('service_role','public.seating_chart_targets','select') or
     not has_function_privilege('service_role','public.complete_seating_chart_refresh(text,jsonb)','execute') then raise exception 'Missing service access'; end if;
  if exists(select 1 from pg_class where oid in ('public.seating_chart_targets'::regclass,'public.seating_chart_refresh_runs'::regclass) and not relrowsecurity) then raise exception 'RLS missing'; end if;

  -- Live preflight must establish studio 1/account 1 as the same STM owner.
  config:=jsonb_build_object('studioCode','STM','studioId',1,'accountId',1,'isPrivate',false,'classId','9999999999',
    'sheetId',0,'sheetName','Seating Chart Main','rowLimit',6,'spreadsheetId','synthetic-test-copy','masterSpreadsheetId','synthetic-test-master',
    'googleAccountEmail','synthetic@example.invalid','sourceLocationLabel','Matthews','sourceRoomId','21','allowedClassTypeIds',jsonb_build_array('100'));
  insert into public.seating_chart_targets(studio_id,config,enabled) values(1,config,true) returning id into target;
  run:='seating-rollback-'||target;
  source:=jsonb_build_object('studioCode','STM','classId','9999999999','complete',true,'isPrivate',false,
    'retrievedAt',now(),'expectedRowCount',1,'rows',jsonb_build_array(jsonb_build_object('reservationKey','1','guest','Synthetic Guest')));
  blocked:=false;
  begin perform public.claim_seating_chart_refresh(target,run||'-wrong',source||jsonb_build_object('studioCode','GIL'));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Wrong studio was accepted'; end if;
  v:=public.claim_seating_chart_refresh(target,run,source);
  if v->>'targetId'<>target::text then raise exception 'Claim target mismatch'; end if;
  blocked:=false;
  begin perform public.claim_seating_chart_refresh(target,run||'-duplicate',source);
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Concurrent duplicate was accepted'; end if;

  plan:=jsonb_build_object('request',jsonb_build_object('valueInputOption','RAW','data',jsonb_build_array(
      jsonb_build_object('range',chr(39)||'Seating Chart Main'||chr(39)||'!V1:AA1','values','[["","Synthetic Guest","","Synthetic Buyer","",""]]'::jsonb),
      jsonb_build_object('range',chr(39)||'Seating Chart Main'||chr(39)||'!AC1','values','[[""]]'::jsonb))),
    'ledger','[{"reservationKey":"1","row":1,"lastWritten":["","Synthetic Guest","","Synthetic Buyer","","",""],"status":"active"}]'::jsonb,
    'review','[]'::jsonb,'activeCount',1,'changedCount',1);
  blocked:=false;
  begin perform public.stage_seating_chart_refresh(run,jsonb_set(plan,'{request,data,0,range}',to_jsonb(chr(39)||'Seating Chart Main'||chr(39)||'!T1')));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Protected seating write was accepted'; end if;
  blocked:=false;
  begin perform public.stage_seating_chart_refresh(run,jsonb_set(plan,'{request,data,0,range}',to_jsonb(chr(39)||'Seating Chart Main'||chr(39)||'!AB1')));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Attendance write was accepted'; end if;
  perform public.stage_seating_chart_refresh(run,plan);
  blocked:=false;
  begin perform public.stage_seating_chart_refresh(run,plan||jsonb_build_object('changedCount',2));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Immutable plan was changed'; end if;

  result:='{"status":"updated","activeCount":1,"changedCount":1,"reviewCount":0,"seatingUnchanged":true,"attendanceUnchanged":true,"formulasUnchanged":true}'::jsonb;
  blocked:=false;
  begin perform public.complete_seating_chart_refresh(run,result||jsonb_build_object('attendanceUnchanged',false));
  exception when others then blocked:=true; end;
  if not blocked then raise exception 'Unverified attendance completion was accepted'; end if;
  perform public.complete_seating_chart_refresh(run,result);
  v:=public.claim_seating_chart_refresh(target,run,source);
  if v->'completed' is distinct from 'true'::jsonb then raise exception 'Completed replay did not return completion'; end if;
  if (select revision from public.seating_chart_targets where id=target)<>1 then raise exception 'Replay advanced revision'; end if;
end $$;
select 'rollback_checks_passed' as status;
rollback;
select to_regclass('public.seating_chart_targets') is null as targets_rolled_back,
       to_regclass('public.seating_chart_refresh_runs') is null as runs_rolled_back;
