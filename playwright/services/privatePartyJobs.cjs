'use strict';
const {randomUUID,createHash}=require('node:crypto');
function createPrivatePartyJobs({collect,now=Date.now}){
 const jobs=new Map();const ttl=2*60*60*1000;
 function metadata(job){return {jobId:job.id,accountId:job.input.accountId,studioId:job.input.studioId,status:job.status,progress:job.progress};}
 function start(input){
  for(const [id,job] of jobs)if(job.finished&&now()-job.finished>ttl)jobs.delete(id);
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const prior=[...jobs.values()].find(job=>job.input.requestId===input.requestId);
  if(prior){if(prior.fingerprint!==fingerprint)throw Error('Request identity mismatch');return metadata(prior);}
  if([...jobs.values()].some(job=>job.input.accountId===input.accountId&&job.input.studioId===input.studioId&&!job.finished))throw Error('Studio collection already running');
  if(jobs.size>=20)throw Error('Collection capacity reached');
  const job={id:randomUUID(),input,fingerprint,status:'queued',progress:{phase:'queued'},finished:null,result:null};jobs.set(job.id,job);
  setImmediate(async()=>{
   job.status='running';
   try{job.result=await collect(input,progress=>{job.progress=progress;});job.status='completed';}
   catch{job.status='failed';job.progress={phase:'failed'};}
   finally{job.finished=now();job.input={accountId:input.accountId,studioId:input.studioId,requestId:input.requestId};}
  });
  return metadata(job);
 }
 return {start,get:id=>jobs.has(id)?metadata(jobs.get(id)):null,result:id=>jobs.get(id)?.status==='completed'?jobs.get(id).result:null};
}
module.exports={createPrivatePartyJobs};
