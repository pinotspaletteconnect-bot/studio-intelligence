'use strict';
// Read-only operational evidence; never logs reservation or party contact data.
const fs=require('node:fs'),path=require('node:path');
const envFile=process.argv[2]??path.resolve(__dirname,'../../dashboard/.env.local');
const env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
async function read(resource){const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+resource,{headers:{apikey:env.SUPABASE_SERVER_SECRET,authorization:'Bearer '+env.SUPABASE_SERVER_SECRET},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Audit read failed');return r.json();}
(async()=>{const [settings,groups,events,targets]=await Promise.all([
 read('seating_chart_creation_settings?studio_id=eq.1&select=enabled,schedule_enabled'),
 read('seating_chart_workbooks?studio_id=eq.1&select=id,group_key,state,file_id,lease_run_id,result'),
 read('seating_chart_workbook_events?studio_id=eq.1&select=class_id,workbook_id,is_private,sheet_id,sheet_name,template_sheet_id'),
 read('seating_chart_targets?studio_id=eq.1&select=id,workbook_id,revision,lease_run_id,ledger,config'),
 ]);const createdTargets=targets.filter(t=>t.workbook_id);
 const runs=createdTargets.length?await read('seating_chart_refresh_runs?target_id=in.('+createdTargets.map(t=>t.id).join(',')+')&select=run_id,target_id,status,source,plan,result&order=created_at.asc'):[];
 const rowMap=ledger=>JSON.stringify((ledger??[]).map(r=>[r.reservationKey,r.row]).sort((a,b)=>a[0].localeCompare(b[0])));
 const summary={manualEnabled:settings[0]?.enabled===true,scheduleEnabled:settings[0]?.schedule_enabled===true,groupCount:groups.length,uniqueClassMappings:new Set(events.map(e=>e.class_id)).size===events.length,
 legacyTargets:targets.filter(t=>!t.workbook_id).map(t=>({classId:t.config.classId,revision:t.revision,guestCount:t.ledger.length,leaseHeld:!!t.lease_run_id})),
 groups:groups.map(g=>({groupId:g.id,groupKey:g.group_key,fileId:g.file_id,state:g.state,leaseHeld:!!g.lease_run_id,result:g.result,events:events.filter(e=>e.workbook_id===g.id),targets:targets.filter(t=>t.workbook_id===g.id).map(t=>{
 const completed=runs.filter(r=>r.target_id===t.id&&r.status==='completed');
 return {id:t.id,classId:t.config.classId,revision:t.revision,leaseHeld:!!t.lease_run_id,guestCount:t.ledger.length,rowMap:t.ledger.map(r=>({reservationKey:r.reservationKey,row:r.row,status:r.status})),
 stableRowsAcrossRuns:completed.length>=2&&completed.every(r=>rowMap(r.plan?.ledger)===rowMap(t.ledger)),
 runs:runs.filter(r=>r.target_id===t.id).map(r=>({runId:r.run_id,status:r.status,sourceCount:r.source.rows?.length,writeRangeCount:r.plan?.request?.data?.length,result:r.result}))};
 })}))};console.log(JSON.stringify(summary,null,2));})().catch(()=>{console.error('Creation audit failed; no credentials or contact details logged');process.exitCode=1;});
