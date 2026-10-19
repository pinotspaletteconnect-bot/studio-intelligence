-- Extend only verified private-form anchors. No table changes or schedule changes.
-- Rollback: restore the prior function definition and remove the added config keys;
-- leave existing workbooks, source snapshots, values plans and history intact.
begin;
do $migration$
declare definition text; old_clause text := $old$suffix not in('C3','C4','C5','C8','C12','C15','C22','G2','H2','C7','C19')$old$; new_clause text := $new$suffix not in('C3','C4','C5','C8','C9','C12','C15','C22','C7','C10','C13','H4','C16','C17','C18','C19','C20','C21','C23','G2','H2')$new$;
begin
 definition:=pg_get_functiondef('public.advance_seating_chart_workbook(uuid,text,text,jsonb)'::regprocedure);
 if strpos(definition,new_clause)=0 then
  if strpos(definition,old_clause)=0 or strpos(substr(definition,strpos(definition,old_clause)+length(old_clause)),old_clause)>0 then
   raise exception 'Unexpected private-party creation guard; do not broaden writes';
  end if;
  execute replace(definition,old_clause,new_clause);
 end if;
end $migration$;
update public.seating_chart_creation_settings
set config=jsonb_set(config,'{privatePartyFormMapping,fields}','{"dateAndTime":"C3","hostNameAndPhone":"C4","paintingSummary":"C5","eventName":"C8","depositReceived":"C9","pricePerSeat":"C12","paymentArrangement":"C15","expectedHeadcount":"C22","doorsOpenClose":"C7","applyDeposit":"C10","seatNotes":"C13","minimumNeedsToPay":"H4","music":"C16","food":"C17","barOrdered":"C18","barCharge":"C19","barPayment":"C20","extraTime":"C21","otherNotes":"C23"}'::jsonb),updated_at=now()
where studio_id=1 and config->>'studioCode'='STM' and schedule_enabled=false;
notify pgrst,'reload schema';
commit;
