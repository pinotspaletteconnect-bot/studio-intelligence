-- Activate only the requested five staff headers for the existing manual STM pilot.
begin;
do $$
begin
  if exists(select 1 from public.seating_chart_refresh_runs where target_id='b338bb62-58b2-4824-b38f-88e677d42fa2' and status<>'completed') then raise exception 'Unfinished pilot run requires review'; end if;
  update public.seating_chart_targets set config=config||'{"staffUpdatesEnabled":true}'::jsonb,updated_at=now()
    where id='b338bb62-58b2-4824-b38f-88e677d42fa2' and studio_id=1
      and config->>'classId'='931955' and config->>'spreadsheetId'='1h0X3zNWCxkG3p7x71LPeFBE-FbC5dLLVj0swto8KwiQ'
      and lease_run_id is null;
  if not found then raise exception 'Verified manual pilot target unavailable'; end if;
end $$;
select id,config->'staffUpdatesEnabled' as staff_enabled,revision,jsonb_array_length(ledger) as reservation_rows,staff_ledger from public.seating_chart_targets where id='b338bb62-58b2-4824-b38f-88e677d42fa2';
commit;
