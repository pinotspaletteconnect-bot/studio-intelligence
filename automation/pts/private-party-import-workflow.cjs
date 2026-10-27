'use strict';
const fs=require('node:fs');
const path=require('node:path');
const credential={postgres:{id:'cQudCPHn5oTqSxiY',name:'Postgres account'}};
const validate=`const body=$json.body;
if(!body||!Number.isSafeInteger(body.studioId)||!Number.isSafeInteger(body.accountId)||!Array.isArray(body.rows)||body.rows.length!==body.sourceCount||body.rows.length>30000||body.historyFrom!=='2024-01-01')throw Error('Invalid approved import envelope');
const seen=new Set();
const fields=['studio_id','source_lead_id','received_date','received_date_basis','source_status','source_disposition','source_stage','source_class_id','event_date','requested_date','expected_headcount','quoted_price','requested_deposit','is_mobile','source_closed','value_parse_warnings','retrieved_at'];
const rows=body.rows.map(source=>{
 if(source.studio_id!==body.studioId||!Number.isSafeInteger(source.source_lead_id)||seen.has(source.source_lead_id)||(source.received_date!==null&&(!/^\\d{4}-\\d{2}-\\d{2}$/.test(source.received_date)||source.received_date<body.historyFrom&&body.mode!=='daily_refresh'))||source.received_date===null&&source.received_date_basis!=='unavailable'||!source.source_stage||!source.source_disposition||!source.retrieved_at)throw Error('Invalid or duplicate lead');
 seen.add(source.source_lead_id);
 const row=Object.fromEntries(fields.filter(k=>source[k]!==undefined).map(k=>[k,source[k]]));
 if(!row.source_class_id){row.event_date=null;row.requested_date=null;}
 return row;
});
const dates=rows.map(r=>r.received_date).filter(Boolean).sort();
return [{json:{studioId:body.studioId,accountId:body.accountId,sourceCount:rows.length,historyFrom:body.historyFrom,firstDate:dates[0]||null,lastDate:dates.at(-1)||null,rows}}];`;
function build(){
 const nodes=[
 {name:'Approved history import',id:'party-webhook',type:'n8n-nodes-base.webhook',typeVersion:2.1,position:[0,0],webhookId:'pts-private-party-history-20261026',parameters:{httpMethod:'POST',path:'pts-private-party-history-20261026',authentication:'headerAuth',responseMode:'lastNode',options:{}},credentials:{httpHeaderAuth:{id:'li7hEi0wisqrbFlP',name:'Studio Intelligence Collector'}}},
 {name:'Validate minimized history',id:'party-validate',type:'n8n-nodes-base.code',typeVersion:2,position:[240,0],parameters:{jsCode:validate}},
 {name:'Open studio import run',id:'party-begin',type:'n8n-nodes-base.postgres',typeVersion:2.6,position:[480,0],credentials:credential,parameters:{operation:'executeQuery',query:'insert into public.pts_private_party_import_runs(studio_id,account_id,source_count,source_first_date,source_last_date,history_from) select $1::bigint,$2::bigint,$3::integer,$4::date,$5::date,$6::date where exists(select 1 from public.pts_collection_targets where studio_id=$1::bigint and account_id=$2::bigint) returning id;',options:{queryReplacement:'={{ [$json.studioId,$json.accountId,$json.sourceCount,$json.firstDate,$json.lastDate,$json.historyFrom] }}'}}},
 {name:'Create bounded batches',id:'party-batch',type:'n8n-nodes-base.code',typeVersion:2,position:[720,0],parameters:{jsCode:`if($input.all().length!==1||!$json.id)throw Error('Studio account mapping did not produce exactly one run');const runId=$json.id;const rows=$('Validate minimized history').first().json.rows;const batches=[];for(let i=0;i<rows.length;i+=500)batches.push({json:{runId,rows:rows.slice(i,i+500)}});return batches.length?batches:[{json:{runId,rows:[]}}];`}},
 {name:'Store validated lead batches',id:'party-store',type:'n8n-nodes-base.postgres',typeVersion:2.6,position:[960,0],credentials:credential,parameters:{operation:'executeQuery',query:'select public.import_pts_private_party_batch($1::uuid,$2::jsonb) as written, $1::uuid as run_id;',options:{queryBatching:'transaction',queryReplacement:'={{ [$json.runId, JSON.stringify($json.rows)] }}'}}},
 {name:'Verify import acknowledgements',id:'party-ack',type:'n8n-nodes-base.code',typeVersion:2,position:[1200,0],parameters:{jsCode:`const runId=$('Open studio import run').first().json.id;const expected=$('Validate minimized history').first().json.sourceCount;const items=$input.all();if(items.some(i=>i.json.run_id!==runId)||items.reduce((n,i)=>n+Number(i.json.written),0)!==expected)throw Error('Warehouse acknowledgement mismatch');return [{json:{runId}}];`}},
 {name:'Complete reconciled studio import',id:'party-complete',type:'n8n-nodes-base.postgres',typeVersion:2.6,position:[1440,0],credentials:credential,parameters:{operation:'executeQuery',query:"update public.pts_private_party_import_runs set status='completed',completed_at=now() where id=$1::uuid and status='loading' and loaded_count=source_count returning id,studio_id,source_count,loaded_count,completed_at,history_from;",options:{queryReplacement:'={{ [$json.runId] }}'}}},
 ];
 const connections={};for(let i=0;i<nodes.length-1;i++)connections[nodes[i].name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]};
 return {name:'PTS Private Party History — Approved 2024+ Backfill — Authenticated Import',nodes,connections,settings:{executionOrder:'v1'},active:false};
}
module.exports={build,validate};
if(require.main===module)fs.writeFileSync(path.join(__dirname,'private-party-import-workflow.json'),JSON.stringify(build(),null,2));
