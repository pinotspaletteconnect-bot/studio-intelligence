'use strict';
// Read-only operational evidence: never emit customer names, vouchers or contacts.
const fs=require('node:fs');
const env=Object.fromEntries(fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
async function read(path){const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:env.SUPABASE_SERVER_SECRET,authorization:'Bearer '+env.SUPABASE_SERVER_SECRET},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Product audit unavailable');return r.json();}
(async()=>{const [settings,runs,targets,groups]=await Promise.all([
 read('seating_chart_creation_settings?studio_id=eq.1&select=config,schedule_enabled'),
 read('seating_chart_product_runs?select=run_id,target_id,status,result,plan&order=created_at.desc&limit=40'),
 read('seating_chart_targets?studio_id=eq.1&select=id,config,revision,lease_run_id'),
 read('seating_chart_workbooks?studio_id=eq.1&select=id,state,lease_run_id'),
]);
const audit={scheduleEnabled:settings[0]?.schedule_enabled,productsEnabled:settings[0]?.config.productReservations?.enabled,
 workbookCount:groups.length,workbooksReady:groups.length>0&&groups.every(g=>g.state==='ready'&&!g.lease_run_id),
 targets:targets.map(t=>({classId:t.config.classId,revision:t.revision,leaseHeld:!!t.lease_run_id})),
 runs:runs.map(r=>({runId:r.run_id,classId:targets.find(t=>t.id===r.target_id)?.config.classId,status:r.status,result:r.result,review:r.plan?.review,writeRanges:r.plan?.request?.data?.map(d=>d.range),totals:Object.fromEntries(Object.entries(r.plan?.expected??{}).filter(([cell])=>cell.startsWith('R')))}))};
console.log(JSON.stringify(audit,null,2));})().catch(()=>{console.error('Private product audit failed; no source contents or credentials logged');process.exitCode=1;});
