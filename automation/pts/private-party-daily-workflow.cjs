'use strict';
const fs=require('node:fs');const path=require('node:path');
const {build:base,validate}=require('./private-party-import-workflow.cjs');
const postgres={postgres:{id:'cQudCPHn5oTqSxiY',name:'Postgres account'}};
function build(){
 const flow=base();flow.name='PTS Private Parties — Daily lead history and current pipeline';
 flow.nodes.shift();delete flow.connections['Approved history import'];
 const nodes=[
  {id:'daily-party-schedule',name:'Daily at 5 AM Eastern',type:'n8n-nodes-base.scheduleTrigger',typeVersion:1.2,position:[-960,0],parameters:{rule:{interval:[{field:'cronExpression',expression:'0 0 5 * * *'}]}}},
  {id:'daily-party-manual',name:'Verify refresh now',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[-960,200],parameters:{}},
  {id:'daily-party-targets',name:'Configured studios and known identities',type:'n8n-nodes-base.postgres',typeVersion:2.6,position:[-720,0],credentials:postgres,parameters:{operation:'executeQuery',query:"select t.account_id,t.studio_id,coalesce((select jsonb_agg(jsonb_build_object('source_lead_id',l.source_lead_id,'received_date',l.received_date,'received_date_basis',l.received_date_basis) order by l.source_lead_id) from public.pts_private_party_leads l where l.studio_id=t.studio_id),'[]'::jsonb) as known_leads from public.pts_collection_targets t order by t.account_id,t.studio_id;",options:{}}},
  {id:'daily-party-source',name:'Collect fresh private-party snapshots',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[-480,0],retryOnFail:true,maxTries:2,waitBetweenTries:60000,credentials:{httpHeaderAuth:{id:'li7hEi0wisqrbFlP',name:'Studio Intelligence Collector'}},parameters:{method:'POST',url:'https://studio-intelligence-production.up.railway.app/pts/private-party-leads',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:'={{ { accountId: Number($json.account_id), studioId: Number($json.studio_id), knownLeads: $json.known_leads } }}',options:{timeout:1800000,batching:{batch:{batchSize:1,batchInterval:1000}}}}},
 ];
 flow.nodes.unshift(...nodes);
 const connect=(a,b)=>{flow.connections[a]={main:[[{node:b,type:'main',index:0}]]};};
 connect(nodes[0].name,nodes[2].name);connect(nodes[1].name,nodes[2].name);connect(nodes[2].name,nodes[3].name);connect(nodes[3].name,'Validate minimized history');
 const validation=`const items=$input.all();const targets=$('Configured studios and known identities').all().map(i=>i.json);if(items.length!==targets.length||!targets.length)throw Error('Incomplete studio collection');const seenStudios=new Set();return items.flatMap(item=>{const $json=item.json;const body=$json.body;const target=targets.find(t=>Number(t.studio_id)===body?.studioId&&Number(t.account_id)===body?.accountId);if(!target||body.mode!=='daily_refresh'||seenStudios.has(body.studioId))throw Error('Studio identity mismatch');seenStudios.add(body.studioId);if(target.known_leads.some(known=>!body.rows.some(row=>row.source_lead_id===Number(known.source_lead_id))))throw Error('Known lead coverage incomplete');return (()=>{${validate}})();});`;
 flow.nodes.find(n=>n.name==='Validate minimized history').parameters.jsCode=validation;
 const begin=flow.nodes.find(n=>n.name==='Open studio import run');begin.parameters.query=begin.parameters.query.replace('returning id;','returning id,studio_id,account_id;');begin.parameters.options.queryBatching='transaction';
 flow.nodes.find(n=>n.name==='Create bounded batches').parameters.jsCode=`const sources=$('Validate minimized history').all().map(i=>i.json);const runs=$input.all().map(i=>i.json);if(runs.length!==sources.length)throw Error('Missing studio run');const seen=new Set();return runs.flatMap(run=>{const source=sources.find(s=>s.studioId===Number(run.studio_id)&&s.accountId===Number(run.account_id));if(!source||!run.id||seen.has(run.studio_id))throw Error('Account/studio run mismatch');seen.add(run.studio_id);const out=[];for(let i=0;i<source.rows.length;i+=500)out.push({json:{runId:run.id,rows:source.rows.slice(i,i+500)}});return out.length?out:[{json:{runId:run.id,rows:[]}}];});`;
 flow.nodes.find(n=>n.name==='Verify import acknowledgements').parameters.jsCode=`const runs=$('Open studio import run').all().map(i=>i.json);const sources=$('Validate minimized history').all().map(i=>i.json);const written=$input.all().map(i=>i.json);if(written.some(w=>!runs.some(r=>r.id===w.run_id)))throw Error('Unknown acknowledgement');return runs.map(run=>{const source=sources.find(s=>s.studioId===Number(run.studio_id)&&s.accountId===Number(run.account_id));const count=written.filter(w=>w.run_id===run.id).reduce((n,w)=>n+Number(w.written),0);if(!source||count!==source.sourceCount)throw Error('Studio count mismatch');return {json:{runId:run.id}};});`;
 flow.nodes.find(n=>n.name==='Complete reconciled studio import').parameters.query=flow.nodes.find(n=>n.name==='Complete reconciled studio import').parameters.query.replace('completed_at,history_from;','completed_at,history_from,unknown_date_count;');
 flow.settings={executionOrder:'v1',timezone:'America/New_York',executionTimeout:10800,saveExecutionProgress:true,saveDataErrorExecution:'all',saveDataSuccessExecution:'all'};
 return flow;
}
module.exports={build};
if(require.main===module)fs.writeFileSync(path.join(__dirname,'private-party-daily-workflow.json'),JSON.stringify(build(),null,2));
