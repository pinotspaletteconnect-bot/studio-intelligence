'use strict';
const fs=require('node:fs'), path=require('node:path');
const base=fs.readFileSync(path.join(__dirname,'migrations/001_private_refresh_state.sql'),'utf8');
const fn=name=>{
 const start=base.indexOf('create function public.'+name+'('),end=base.indexOf('end $$;',start)+7;
 if(start<0||end<7)throw Error('Missing migration source function');
 return base.slice(start,end).replace('create function','create or replace function');
};
let claim=fn('claim_seating_chart_refresh').replace("'target',t.config,'source',r.source", "'staffLedger',t.staff_ledger,'target',t.config,'source',r.source");
let stage=fn('stage_seating_chart_refresh');
stage=stage.replace("  prefix :=",`  if t.config->'staffUpdatesEnabled'='true'::jsonb then
    if r.source->'assignedStaff'->'complete' is distinct from 'true'::jsonb or
       jsonb_typeof(p_plan->'staff'->'lastWritten') is distinct from 'object' or
       jsonb_typeof(p_plan->'staff'->'expected') is distinct from 'object' then raise exception 'Verified staff plan required'; end if;
    if exists(select 1 from jsonb_each(p_plan->'staff'->'lastWritten') e where e.key not in ('D5','D6','D7','G6','G7') or jsonb_typeof(e.value)<>'string') then raise exception 'Invalid staff ledger'; end if;
  end if;
  prefix :=`);
stage=stage.replace("    else raise exception 'Protected column in write plan'; end if;",`    elsif suffix in ('D5','D6','D7','G6','G7') then
      if t.config->'staffUpdatesEnabled' is distinct from 'true'::jsonb or
         jsonb_array_length(item->'values'->0)<>1 or jsonb_array_length(item->'values')<>1 or
         jsonb_typeof(item->'values'->0->0) is distinct from 'string' or
         (item->'values'->0->>0) is distinct from (p_plan->'staff'->'expected'->>suffix) or
         (item->'values'->0->>0) !~ (case suffix when 'D5' then '^Stage:' when 'D6' then '^Floor 1:' when 'D7' then '^Floor 2:' when 'G6' then '^On-Call 1:' else '^On-Call 2:' end)
      then raise exception 'Invalid staff header write'; end if;
      continue;
    else raise exception 'Protected column in write plan'; end if;`);
let complete=fn('complete_seating_chart_refresh');
complete=complete.replace("  update public.seating_chart_targets set ledger=r.plan->'ledger'",`  if t.config->'staffUpdatesEnabled'='true'::jsonb and p_result->'staffVerified' is distinct from 'true'::jsonb then raise exception 'Staff readback verification required'; end if;
  update public.seating_chart_targets set staff_ledger=case when t.config->'staffUpdatesEnabled'='true'::jsonb then r.plan->'staff'->'lastWritten' else t.staff_ledger end,ledger=r.plan->'ledger'`);
const sql=`-- STM staff mapping extension; manual pilot only, schedules remain OFF.
-- Rollback: disable config.staffUpdatesEnabled and restore the prior manual
-- workflow; preserve the staff ledger and all existing reservation state.
begin;
alter table public.seating_chart_targets add column staff_ledger jsonb not null default '{}'::jsonb check(jsonb_typeof(staff_ledger)='object');
${claim}\n${stage}\n${complete}
notify pgrst, 'reload schema';
commit;
`;
fs.writeFileSync(path.join(__dirname,'migrations/002_staff_headers.sql'),sql);
