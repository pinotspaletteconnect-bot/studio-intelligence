'use strict';
// Append recovery evidence; preserve original failure status, result and times.
// Deliberately bounded to the owner-approved October 19 STM repair window.
const fs=require('node:fs');
const env=Object.fromEntries(fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const classes=new Set(['931956','931957','931961','931962','927728','931964','931965','931960','931977','931967','931969']);
async function request(resource,options={}){const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+resource,{...options,headers:{apikey:env.SUPABASE_SERVER_SECRET,authorization:'Bearer '+env.SUPABASE_SERVER_SECRET,'Content-Type':'application/json',Prefer:'return=representation'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Repair audit request unavailable');return r.json();}
(async()=>{
 const [targets,guests,products,runs]=await Promise.all([
  request('seating_chart_targets?studio_id=eq.1&select=id,enabled,config,lease_run_id'),
  request('seating_chart_refresh_runs?status=eq.completed&created_at=gte.2026-10-19T20:00:00Z&select=run_id,target_id,result,created_at&order=created_at.desc&limit=100'),
  request('seating_chart_product_runs?status=eq.completed&created_at=gte.2026-10-19T20:00:00Z&select=run_id,target_id,result,created_at&order=created_at.desc&limit=100'),
  request('seating_chart_schedule_runs?studio_id=eq.1&created_at=gte.2026-10-19T00:00:00Z&select=id,target_id,kind,status,result,created_at,execution_id&order=created_at.desc&limit=100')]);
 const verified=new Map();
 for(const t of targets.filter(t=>classes.has(t.config.classId))){
  const g=guests.find(r=>r.target_id===t.id),p=products.find(r=>r.target_id===t.id);
  if(!t.enabled||t.lease_run_id||g?.result.seatingUnchanged!==true||g.result.attendanceUnchanged!==true||g.result.formulasUnchanged!==true||g.result.staffVerified!==true||p?.result.protectedCellsUnchanged!==true||p.result.productsVerified!==true)throw Error('Repair verification incomplete');
  verified.set(t.id,{reservationRunId:g.run_id,productRunId:p.run_id});
 }
 if(verified.size!==classes.size)throw Error('Missing registered repair class');
 const discovery=runs.find(r=>r.kind==='discovery'&&r.status==='completed'&&r.created_at>'2026-10-19T20:20:00Z');
 if(!discovery||discovery.result.createdGroups!==0||discovery.result.review?.some(r=>r.reason!=='unsupported-room-or-event-type'||r.classId!=='931231'))throw Error('Fresh scheduled discovery verification required');
 const patches=runs.filter(r=>r.status==='needs-review'&&!r.result?.resolution&&r.created_at<'2026-10-19T20:20:00Z'&&(r.kind==='discovery'||verified.has(r.target_id))).map(r=>({id:r.id,result:{...r.result,resolution:{kind:'verified-subsequent-repair',verifiedAt:new Date().toISOString(),...(r.kind==='refresh'?verified.get(r.target_id):{discoveryExecutionId:discovery.execution_id,discoveryJobId:discovery.id})}}}));
 if(process.argv.includes('--apply'))for(const p of patches){const rows=await request('seating_chart_schedule_runs?id=eq.'+p.id+'&studio_id=eq.1&status=eq.needs-review&'+encodeURIComponent('result->resolution')+'=is.null',{method:'PATCH',body:JSON.stringify({result:p.result})});if(rows.length!==1||rows[0].status!=='needs-review'||rows[0].result.resolution.kind!=='verified-subsequent-repair')throw Error('Audit resolution readback mismatch');}
 console.log(JSON.stringify({mode:process.argv.includes('--apply')?'applied':'preview',verifiedClasses:verified.size,historicalFailuresAnnotated:patches.length,scheduledDiscoveryVerified:true}));
})().catch(()=>{console.error('Repair audit prerequisites not satisfied; inspect before applying');process.exitCode=1;});
