'use strict';
// Read-only reconciliation; emits counts only, never credentials or guest data.
const fs=require('node:fs');const path=require('node:path');
async function main(){
 const root=path.resolve(__dirname,'../..');
 for(const line of fs.readFileSync(path.join(root,'dashboard/.env.local'),'utf8').split(/\r?\n/)){
  const match=line.match(/^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVER_SECRET)=(.*)$/);
  if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
 }
 const key=process.env.SUPABASE_SERVER_SECRET;const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const headers={apikey:key,Authorization:`Bearer ${key}`};
 async function read(query){const result=await fetch(base+'/rest/v1/'+query,{headers});if(!result.ok)throw Error('Warehouse verification failed ('+result.status+')');return result.json();}
 const targets=await read('pts_collection_targets?select=account_id,studio_id&order=studio_id');
 const coverage=await read('pts_private_party_history_coverage?select=*&order=studio_id');
 const cutoff=process.argv.find(value=>value.startsWith('--after='))?.slice(8);
 const result=[];
 for(const target of targets){
  const run=coverage.find(row=>Number(row.studio_id)===Number(target.studio_id)&&Number(row.account_id)===Number(target.account_id));
  if(!run||run.loaded_count!==run.source_count)throw Error('Studio coverage incomplete: '+target.studio_id);
  if(cutoff&&Date.parse(run.completed_at)<Date.parse(cutoff))throw Error('Studio has not refreshed yet: '+target.studio_id);
  const rows=[];
  for(let offset=0;;offset=rows.length){
   const batch=await read(`pts_private_party_leads_reporting?select=source_lead_id,received_date,stage,import_run_id,retrieved_at&studio_id=eq.${target.studio_id}&order=source_lead_id&offset=${offset}&limit=1000`);
   if(!batch.length)break;rows.push(...batch);
  }
  if(rows.length!==run.loaded_count||new Set(rows.map(row=>row.source_lead_id)).size!==rows.length||rows.some(row=>row.import_run_id!==run.import_run_id))throw Error('Studio row reconciliation failed: '+target.studio_id);
  const unknown=rows.filter(row=>!row.received_date).length;
  if(unknown!==run.unknown_date_count)throw Error('Unknown-date count mismatch');
  result.push({studio:Number(target.studio_id),account:Number(target.account_id),rows:rows.length,unknownDates:unknown,completedAt:run.completed_at,
   pipeline:{new:rows.filter(row=>row.stage==='new').length,deposit_requested:rows.filter(row=>row.stage==='deposit_requested').length,booked:rows.filter(row=>row.stage==='booked').length}});
 }
 console.log(JSON.stringify({studios:result,total:result.reduce((n,row)=>n+row.rows,0)},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
