'use strict';
const fs=require('node:fs'),path=require('node:path');
const {groupOverlappingEvents}=require('./planner.cjs'),{creationPlan}=require('./creation.cjs');
const studio=require('./stm-creation-settings.json');
const q=v=>"'"+v.replace(/'/g,"''")+"'";
const j=v=>q(JSON.stringify(v))+'::jsonb';
const sql=fs.readFileSync(path.join(__dirname,'migrations/003_workbook_creation.sql'),'utf8').replace(/commit;\s*$/,'');
const start=Date.now()+86400000;
const event=(id,minutes,isPrivate=false)=>({organizationId:'1',studioId:'1',classId:id,timeZone:studio.timeZone,painting:'Synthetic only',roomLabel:isPrivate?'KLR':'Main',sourceRoomId:isPrivate?'22':'21',classTypeId:isPrivate?'200':'100',isPrivate,startAt:new Date(start+minutes*60000).toISOString(),endAt:new Date(start+(minutes+120)*60000).toISOString()});
function group(events){const g=groupOverlappingEvents(events)[0];g.groupKey='stm-v1-'+g.events.map(e=>e.classId).sort().join('-');g.sourceRetrievedAt=new Date().toISOString();return g;}
const g=group([event('991000001',0),event('991000002',30,true)]),p=creationPlan(g,studio);
const changed=group([...g.events,event('991000003',45)]),changedPlan=creationPlan(changed,studio);
const wrong=structuredClone(p);wrong.structure.requests.push({deleteSheet:{sheetId:0}});
const metadata={id:'synthetic-workbook-no-google-call',mimeType:'application/vnd.google-apps.spreadsheet',capabilities:{canEdit:true},parents:[studio.destinationFolderId],owners:[{emailAddress:studio.googleAccountEmail}],appProperties:{seatingGroupId:null,seatingMasterId:studio.masterSpreadsheetId}};
const values={expected:{[p.tabs[0].sheetId+':R5']:g.events[0].classId},request:{valueInputOption:'RAW',data:[{range:`'${p.tabs[0].sheetName}'!R5`,values:[[g.events[0].classId]]}]},staffLedgers:{},before:{}};
const badValues=structuredClone(values);badValues.request.data[0].range=`'${p.tabs[0].sheetName}'!AB1`;
const claim=(group,plan,run='stm-creation-rollback')=>`select public.claim_seating_chart_workbook(1,${q(run)},${j(group)},${j(plan)})`;
let tests=`
insert into public.seating_chart_creation_settings(studio_id,config,enabled)values(1,${j(studio)},true);
create temporary table seating_creation_prior as select id,revision,ledger,staff_ledger from public.seating_chart_targets;
create function pg_temp.expect_creation_failure(statement text,pattern text)returns void language plpgsql as $$begin
 begin execute statement;exception when others then if sqlerrm not like pattern then raise;end if;return;end;
 raise exception 'Expected guard failure';end $$;
select pg_temp.expect_creation_failure(${q(claim(g,wrong))},'%Only native event%');
do $$declare r jsonb;gid uuid;metadata jsonb:= ${j(metadata)};vp jsonb:=${j(values)};bad jsonb:=${j(badValues)};target uuid;
begin
 if has_table_privilege('anon','public.seating_chart_workbooks','SELECT')or has_table_privilege('authenticated','public.seating_chart_workbook_events','SELECT')then raise exception 'Private state exposed';end if;
 r:=public.claim_seating_chart_workbook(1,'stm-creation-rollback',${j(g)},${j(p)});gid:=(r->>'groupId')::uuid;
 perform pg_temp.expect_creation_failure(${q(claim(g,p,'different-creation-run'))},'%lease held%');
 perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','copy-issued','{}');
 begin perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','copy-issued','{}');raise exception 'Expected duplicate copy guard';exception when others then if sqlerrm not like 'Do not repeat%'then raise;end if;end;
 metadata:=jsonb_set(metadata,'{appProperties,seatingGroupId}',to_jsonb(gid::text));
 begin perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','copied',metadata-'parents');raise exception 'Expected folder guard';exception when others then if sqlerrm not like 'Wrong or ambiguous%'then raise;end if;end;
 perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','copied',metadata);
 perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','structured','{"verified":true}');
 begin perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','values-staged',bad);raise exception 'Expected attendance guard';exception when others then if sqlerrm not like 'Protected or mismatched%'then raise;end if;end;
 perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','values-staged',vp);
 begin perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','completed','{"verified":true}');raise exception 'Expected readback guard';exception when others then if sqlerrm not like 'Verified creation%'then raise;end if;end;
 perform public.advance_seating_chart_workbook(gid,'stm-creation-rollback','completed','{"verified":true,"protectedCellsUnchanged":true}');
 r:=public.claim_seating_chart_workbook(1,'repeat-creation-run',${j(g)},${j(p)});
 if r->'ready' is distinct from 'true'::jsonb or r->>'fileId'<>metadata->>'id' or jsonb_array_length(r->'targets')<>1 then raise exception 'Repeat created duplicate mapping/private seating target';end if;
 target:=(r->'targets'->>0)::uuid;
 if (select config->>'sheetId'from public.seating_chart_targets where id=target)<>${q(String(p.tabs[0].sheetId))}then raise exception 'Wrong numeric event tab';end if;
 perform pg_temp.expect_creation_failure(${q(claim(changed,changedPlan,'changed-membership-run'))},'%Class already mapped%');
 if exists(select 1 from seating_creation_prior before join public.seating_chart_targets after using(id)where before.revision<>after.revision or before.ledger<>after.ledger or before.staff_ledger<>after.staff_ledger)then raise exception 'Prior targets changed';end if;
end $$;
select 'creation_rollback_checks_passed' as result;
rollback;
select to_regclass('public.seating_chart_workbooks')is null as creation_tables_rolled_back,
 (select revision=4 and jsonb_array_length(ledger)=9 and lease_run_id is null from public.seating_chart_targets where id='b338bb62-58b2-4824-b38f-88e677d42fa2')as existing_pilot_unchanged;
`;
fs.writeFileSync(path.join(__dirname,'database-creation-rollback-trial.sql'),sql+tests);
