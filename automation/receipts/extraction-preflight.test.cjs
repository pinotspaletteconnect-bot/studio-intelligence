const test=require('node:test'),assert=require('node:assert/strict');
const {requireBoundedTokenCount:guard}=require('./extraction-preflight.cjs');
const request={model:'gpt-4o-mini-2024-07-18',max_output_tokens:8192,truncation:'disabled'};
test('preflight reserves worst output and rejects uncounted or oversized paid requests',()=>{
 assert.equal(guard(request,{object:'response.input_tokens',input_tokens:4277},30000).maximumMicrousd,5557);
 for(const count of [{},{object:'response.input_tokens',input_tokens:337695},{object:'response.input_tokens',input_tokens:-1}])assert.throws(()=>guard(request,count,30000));
 assert.throws(()=>guard(request,{object:'response.input_tokens',input_tokens:10000},1000));
 assert.throws(()=>guard({...request,model:'different'}, {object:'response.input_tokens',input_tokens:100},30000));
});
test('generated workflow checks cost before claiming and uses existing credential without retries',()=>{
 const fs=require('node:fs');
 const w=require('./build-mailbox-routing.cjs').draftHelpers(JSON.parse(fs.readFileSync('C:/Projects/studio-intelligence/tmp/multistudio-live-backup-paths.json'))).extraction;
 const next=n=>w.connections[n].main[0][0].node;
 assert.equal(next('Backlog - Build Bounded Requests'),'Backlog - Count Input Before Spending');
 assert.equal(next('Backlog - Count Input Before Spending'),'Backlog - Verify Reserved Cost');
 assert.equal(next('Backlog - Verify Reserved Cost'),'Backlog - Consume One Allowance');
 const count=w.nodes.find(n=>n.name==='Backlog - Count Input Before Spending'),paid=w.nodes.find(n=>n.name==='Backlog - Extract Once with OpenAI');
 assert.deepEqual(count.credentials,paid.credentials);assert.equal(count.retryOnFail,false);assert.equal(paid.retryOnFail,false);
 assert.match(count.parameters.jsonBody,/request.text/);
});
