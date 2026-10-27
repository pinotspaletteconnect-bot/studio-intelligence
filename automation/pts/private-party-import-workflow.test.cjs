'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {build,validate}=require('./private-party-import-workflow.cjs');
const run=new Function('$json',validate);
const lead={studio_id:1,source_lead_id:42,received_date:'2024-01-01',source_stage:'None',source_status:'Inquiry',source_disposition:'Not Responding',retrieved_at:'2026-10-26T00:00:00Z',source_class_id:null,event_date:'2026-10-26',email:'private@example.test'};
test('ETL drops contact fields and source placeholder event dates',()=>{
 const result=run({body:{studioId:1,accountId:1,sourceCount:1,historyFrom:'2024-01-01',rows:[lead]}})[0].json;
 assert.equal(result.rows[0].email,undefined);assert.equal(result.rows[0].event_date,null);
});
test('ETL rejects wrong studio, duplicates, incomplete payload and old history',()=>{
 for(const rows of [[{...lead,studio_id:2}],[lead,lead],[{...lead,received_date:'2023-12-31'}]])
   assert.throws(()=>run({body:{studioId:1,accountId:1,sourceCount:rows.length,historyFrom:'2024-01-01',rows}}));
 assert.throws(()=>run({body:{studioId:1,accountId:1,sourceCount:2,historyFrom:'2024-01-01',rows:[lead]}}));
});
test('isolated workflow has authenticated ingress, parameterized SQL and no schedule',()=>{
 const flow=build();assert.equal(flow.active,false);
 assert.equal(flow.nodes[0].parameters.authentication,'headerAuth');
 assert.ok(flow.nodes.filter(n=>n.type.endsWith('.postgres')).every(n=>n.parameters.options.queryReplacement));
 assert.ok(!flow.nodes.some(n=>/schedule/i.test(n.type)));
});
