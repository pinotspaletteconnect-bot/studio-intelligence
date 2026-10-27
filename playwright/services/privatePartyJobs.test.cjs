const {test}=require('node:test');const assert=require('node:assert/strict');
const {createPrivatePartyJobs}=require('./privatePartyJobs.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('background jobs return immediately, expose progress, replay safely and return results only when complete',async()=>{
 let finish;let calls=0;
 const jobs=createPrivatePartyJobs({collect:async(input,progress)=>{calls++;progress({phase:'collecting',completed:1,total:2});await new Promise(resolve=>{finish=resolve;});return {body:{rows:[1,2]}};}});
 const input={accountId:1,studioId:3,requestId:'execution-1-studio-3',knownLeads:[]};
 const first=jobs.start(input);assert.equal(first.status,'queued');assert.equal(jobs.start(input).jobId,first.jobId);
 assert.throws(()=>jobs.start({...input,studioId:4}));
 assert.throws(()=>jobs.start({...input,requestId:'another'}));
 await tick();assert.equal(calls,1);assert.equal(jobs.get(first.jobId).progress.completed,1);assert.equal(jobs.result(first.jobId),null);
 finish();await tick();assert.equal(jobs.get(first.jobId).status,'completed');assert.deepEqual(jobs.result(first.jobId),{body:{rows:[1,2]}});
 assert.equal(jobs.start(input).jobId,first.jobId);
});
test('failed or missing jobs never expose a complete snapshot',async()=>{
 const jobs=createPrivatePartyJobs({collect:async()=>{throw Error('failure');}});
 const job=jobs.start({accountId:2,studioId:5,requestId:'failure',knownLeads:[]});await tick();
 assert.equal(jobs.get(job.jobId).status,'failed');assert.equal(jobs.result(job.jobId),null);assert.equal(jobs.get('missing'),null);
});
