'use strict';
// Owner-approved switch only. No template, seat, attendance or credential writes.
const fs=require('node:fs');
const env=Object.fromEntries(fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const enabled=process.argv[3]==='enable';if(!['enable','disable'].includes(process.argv[3]))throw Error('Explicit enable or disable required');
const base=env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/',headers={apikey:env.SUPABASE_SERVER_SECRET,authorization:'Bearer '+env.SUPABASE_SERVER_SECRET,'content-type':'application/json'};
(async()=>{const r=await fetch(base+'seating_chart_creation_settings?studio_id=eq.1&select=enabled,config',{headers});if(!r.ok)throw Error();const rows=await r.json(),s=rows[0];
 if(rows.length!==1||!s.enabled||s.config.studioCode!=='STM'||s.config.googleAccountEmail!=='pinotsstmatthews@gmail.com'||s.config.schedule?.overnightLocalTime!=='02:00'||JSON.stringify(s.config.schedule.refreshMinutesBefore)!=='[1440,360,300,240,180,120,75]')throw Error();
 const u=await fetch(base+'seating_chart_creation_settings?studio_id=eq.1&select=studio_id,schedule_enabled',{method:'PATCH',headers:{...headers,prefer:'return=representation'},body:JSON.stringify({schedule_enabled:enabled})});if(!u.ok)throw Error();const result=await u.json();if(result.length!==1||result[0].schedule_enabled!==enabled)throw Error();console.log(JSON.stringify(result[0]));
})().catch(()=>{console.error('STM schedule switch failed; no credentials or source data logged');process.exitCode=1;});
