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
