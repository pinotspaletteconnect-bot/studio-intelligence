const {test}=require('node:test');const assert=require('node:assert/strict');
const {build}=require('./private-party-daily-workflow.cjs');
const workflow=build();const code=name=>workflow.nodes.find(n=>n.name===name).parameters.jsCode;
const target={studio_id:3,account_id:1,known_leads:[{source_lead_id:42}]};
const row={studio_id:3,source_lead_id:42,received_date:'2023-01-01',received_date_basis:'legacy_report',source_status:'Party Planner',source_stage:'Manage Party',source_disposition:'Active',retrieved_at:'2026-10-26T00:00:00Z'};
const body={mode:'daily_refresh',studioId:3,accountId:1,sourceCount:1,historyFrom:'2024-01-01',rows:[row]};
function validate(bodies,targets=[target]){return new Function('$input','$',code('Validate minimized history'))({all:()=>bodies.map(body=>({json:{body}}))},()=>({all:()=>targets.map(json=>({json}))}));}
test('daily schedule stays server-side, authenticated, sequential and in Eastern time',()=>{
 assert.equal(workflow.settings.timezone,'America/New_York');
 assert.equal(workflow.nodes[0].parameters.rule.interval[0].expression,'0 0 5 * * *');
 const http=workflow.nodes.find(n=>n.type.endsWith('.httpRequest'));
 assert.equal(http.parameters.authentication,'genericCredentialType');
 assert.equal(http.parameters.options.batching.batch.batchSize,1);
 assert.ok(!workflow.nodes.some(n=>n.type.endsWith('.webhook')));
});
test('daily ETL retains previously known older active leads, strips contacts and rejects incomplete account/studio collections',()=>{
 assert.equal(validate([{...body,rows:[{...row,email:'private@example.test'}]}])[0].json.rows[0].email,undefined);
 for(const bodies of [[],[body,body],[{...body,accountId:2}],[{...body,rows:[],sourceCount:0}]]) assert.throws(()=>validate(bodies));
});
