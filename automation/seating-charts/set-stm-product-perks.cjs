'use strict';
// Owner-approved additive product abbreviations; no schema or credential changes.
const fs=require('node:fs');
const {isDeepStrictEqual}=require('node:util');
const env=Object.fromEntries(fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const desired=require('./stm-creation-settings.json');
async function request(resource,options={}){const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/'+resource,{...options,headers:{apikey:env.SUPABASE_SERVER_SECRET,authorization:'Bearer '+env.SUPABASE_SERVER_SECRET,'Content-Type':'application/json',Prefer:'return=representation'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Private configuration update failed');return r.json();}
(async()=>{
 const [s]=await request('seating_chart_creation_settings?studio_id=eq.1&select=studio_id,config,updated_at,schedule_enabled');
 if(s?.config.studioCode!=='STM'||s.config.googleAccountEmail!==desired.googleAccountEmail||s.config.masterSpreadsheetId!==desired.masterSpreadsheetId)throw Error('Wrong studio configuration');
 const config=structuredClone(s.config);let count=0;
 for(const [id,items]of Object.entries(config.productReservations.templates))for(const m of items){
  const d=desired.productReservations.templates[id]?.find(d=>d.key===m.key);
  if(!d||JSON.stringify(d.sourceNames)!==JSON.stringify(m.sourceNames)||d.namesCell!==m.namesCell||d.totalCell!==m.totalCell)throw Error('Product mapping changed; review first');
  m.perkCode=d.perkCode;m.perkScope=d.perkScope;count++;
 }
 if(count!==6)throw Error('Unexpected product mappings');
 const rows=await request('seating_chart_creation_settings?studio_id=eq.1&updated_at=eq.'+encodeURIComponent(s.updated_at),{method:'PATCH',body:JSON.stringify({config,updated_at:new Date().toISOString()})});
 if(rows.length!==1||rows[0].schedule_enabled!==s.schedule_enabled||!isDeepStrictEqual(rows[0].config,config))throw Error('Configuration readback mismatch');
 console.log(JSON.stringify({studioId:1,mappings:count,perkScope:desired.productReservations.templates['0'][0].perkScope,scheduleFlagUnchanged:true}));
})().catch(()=>{console.error('Product perk configuration did not pass; inspect before retry');process.exitCode=1;});
