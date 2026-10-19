'use strict';
// Approved all-class eligibility update. Configuration only; no schema change.
// Rollback: restore only creation.classTypes and allowedClassTypeIds from the
// saved before snapshot; retain native files, targets, schedules and run history.
const fs=require('node:fs'),{isDeepStrictEqual}=require('node:util');
const env=Object.fromEntries(fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const desired=require('./stm-creation-settings.json');
async function request(resource,options={}){const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+resource,{...options,headers:{apikey:env.SUPABASE_SERVER_SECRET,authorization:'Bearer '+env.SUPABASE_SERVER_SECRET,'Content-Type':'application/json',Prefer:'return=representation'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Private class configuration request failed');return r.json();}
(async()=>{
 const [s]=await request('seating_chart_creation_settings?studio_id=eq.1&select=studio_id,config,updated_at,schedule_enabled');
 if(s?.config.studioCode!=='STM'||s.config.accountId!==1||s.config.googleAccountEmail!==desired.googleAccountEmail||s.config.masterSpreadsheetId!==desired.masterSpreadsheetId)throw Error('Wrong studio configuration');
 for(const[id,t]of Object.entries(s.config.creation.classTypes))if(!isDeepStrictEqual(t,desired.creation.classTypes[id]))throw Error('Existing class policy changed; inspect before updating');
 const config=structuredClone(s.config);config.creation.classTypes=desired.creation.classTypes;config.allowedClassTypeIds=desired.allowedClassTypeIds;
 const apply=process.argv.includes('--apply');
 if(apply){
  const snapshot=process.argv.find(x=>x.startsWith('--snapshot='))?.slice(11);if(!snapshot)throw Error('Before snapshot path required');
  fs.writeFileSync(snapshot,JSON.stringify({studioId:1,updatedAt:s.updated_at,classTypes:s.config.creation.classTypes,allowedClassTypeIds:s.config.allowedClassTypeIds},null,2),{flag:'wx'});
  const rows=await request('seating_chart_creation_settings?studio_id=eq.1&updated_at=eq.'+encodeURIComponent(s.updated_at),{method:'PATCH',body:JSON.stringify({config,updated_at:new Date().toISOString()})});
  if(rows.length!==1||rows[0].schedule_enabled!==s.schedule_enabled||!isDeepStrictEqual(rows[0].config,config))throw Error('Configuration readback mismatch; inspect snapshot before retry');
 }
 console.log(JSON.stringify({mode:apply?'applied':'preview',classTypes:Object.keys(config.creation.classTypes).length,seatingClassTypes:config.allowedClassTypeIds.length,scheduleFlagUnchanged:true}));
})().catch(()=>{console.error('All-class configuration did not pass; inspect before retry');process.exitCode=1;});
