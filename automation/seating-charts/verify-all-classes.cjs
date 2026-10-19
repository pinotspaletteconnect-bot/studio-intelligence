'use strict';
// Read-only, bounded rollout evidence; never emit reservation contacts or IDs.
const fs=require('node:fs');
const env=Object.fromEntries(fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
async function read(resource){const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+resource,{headers:{apikey:env.SUPABASE_SERVER_SECRET,authorization:'Bearer '+env.SUPABASE_SERVER_SECRET},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Audit HTTP '+r.status+' '+resource.split('?')[0]);return r.json();}
(async()=>{
 const [settings,targets]=await Promise.all([read('seating_chart_creation_settings?studio_id=eq.1&select=schedule_enabled,config'),read('seating_chart_targets?studio_id=eq.1&config->>classId=eq.931231&select=id,config,revision,lease_run_id')]);
 const policy={scheduleEnabled:settings[0]?.schedule_enabled,classTypes:settings[0]?.config.creation.classTypes};
 if(targets.length!==1){console.log(JSON.stringify({policy,registered:false}));return;}
 const t=targets[0];
 const [groups,guests,products,schedules]=await Promise.all([
  read('seating_chart_workbooks?id=eq.'+t.config.documentGroupId+'&select=id,group_key,state,file_id,lease_run_id'),
  read('seating_chart_refresh_runs?target_id=eq.'+t.id+'&select=run_id,status,plan,result&order=created_at.desc&limit=4'),
  read('seating_chart_product_runs?target_id=eq.'+t.id+'&select=run_id,status,result&order=created_at.desc&limit=4'),
  read('seating_chart_schedule_runs?studio_id=eq.1&select=kind,status,execution_id,result&order=created_at.desc&limit=4')]);
 const completed=guests.filter(r=>r.status==='completed'),rows=r=>JSON.stringify(r.plan.ledger.map(e=>[e.reservationKey,e.row]).sort((a,b)=>a[0].localeCompare(b[0])));
 console.log(JSON.stringify({policy,registered:true,targetId:t.id,classId:t.config.classId,expectedTypes:t.config.allowedClassTypeIds,revision:t.revision,leaseHeld:!!t.lease_run_id,sheetName:t.config.sheetName,sheetId:t.config.sheetId,workbook:groups[0],stableGuestRows:completed.length>=2&&completed.every(r=>rows(r)===rows(completed[0])),guests:guests.map(r=>({runId:r.run_id,status:r.status,result:r.result})),products,schedules},null,2));
})().catch(e=>{console.error(e.message.startsWith('Audit HTTP ')?e.message:'Private all-class audit unavailable; no customer contents logged');process.exitCode=1;});
