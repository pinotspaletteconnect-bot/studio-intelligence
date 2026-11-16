const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const {createEulerityRecoveryRouter} = require('../routes/eulerityRecovery');
const token='local-recovery-test-not-a-credential';
let originalToken;
test.before(()=>{originalToken=process.env.COLLECTOR_API_TOKEN;process.env.COLLECTOR_API_TOKEN=token;});
test.after(()=>{if(originalToken===undefined)delete process.env.COLLECTOR_API_TOKEN;else process.env.COLLECTOR_API_TOKEN=originalToken;});
async function server(t, deps) {
 const app=express();app.use(express.json());app.use('/eulerity/account1-recovery',createEulerityRecoveryRouter(deps));
 const s=app.listen(0,'127.0.0.1');await new Promise(r=>s.once('listening',r));t.after(()=>new Promise(r=>s.close(r)));
 return async(endpoint,body,auth=true)=>fetch(`http://127.0.0.1:${s.address().port}/eulerity/account1-recovery/${endpoint}`,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
}
const account=()=>({accountId:1,account:{account_id:1,organization_id:1},targets:[{account_id:1,organization_id:1,studio_id:1,studio_code:'TEST',studio_name:'Test'}]});
test('recovery rejects HB and invalid account IDs before broker or browser access',async t=>{
 let calls=0;const fail=()=>{calls++;throw Error('must not run')};
 const request=await server(t,{resolveAccount:fail,browser:{discoverEulerityAccount:fail,collectEulerityAccount:fail}});
 for(const endpoint of ['discover','download']){
  assert.equal((await request(endpoint,{accountId:1},false)).status,401);
  for(const accountId of [2,'2',null,undefined,'01','1.0',true,{},[1],0])assert.equal((await request(endpoint,{accountId})).status,403);
 }
 assert.equal(calls,0);
});
test('recovery discovery uses only verified account1 broker credentials',async t=>{
 let called=0;const resolved=account();
 const request=await server(t,{resolveAccount:async id=>{assert.equal(id,1);return resolved},browser:{discoverEulerityAccount:async a=>{assert.equal(a,resolved);called++;return [{sourceKey:'configured',displayName:'Campaign'}]}}});
 const response=await request('discover',{accountId:'1'});assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true,accountId:1,locations:[{sourceKey:'configured',displayName:'Campaign'}]});assert.equal(called,1);
});
test('recovery rejects broker identity mismatch before browser access',async t=>{
 let calls=0;const request=await server(t,{resolveAccount:async()=>({...account(),account:{account_id:2,organization_id:3}}),browser:{discoverEulerityAccount:()=>{calls++}}});
 assert.equal((await request('discover',{accountId:1})).status,500);assert.equal(calls,0);
});
test('recovery collection ignores caller targets and cleans its temporary files',async t=>{
 const resolved=account();let removed;
 const request=await server(t,{resolveAccount:async()=>resolved,browser:{collectEulerityAccount:async(a,targets)=>{assert.equal(a,resolved);assert.equal(targets,resolved.targets);return {folder:'test-temp',results:[{target:targets[0],metricsFile:'metrics',spendFile:'spend',budget:{}}]}}},parser:{parseMetrics:async()=>[{report_date:'2026-11-09'}],parseSpend:async()=>[{report_date:'2026-11-09',spend:5}],parseBudget:()=>[]},removeFolder:folder=>{removed=folder}});
 const response=await request('download',{accountId:1,targets:[{account_id:2,studio_id:5}]});assert.equal(response.status,200);assert.equal((await response.json()).results[0].studioId,1);assert.equal(removed,'test-temp');
});
test('recovery refuses cross-account configured targets',async t=>{
 let calls=0;const request=await server(t,{resolveAccount:async()=>({...account(),targets:[{account_id:2,organization_id:3,studio_id:5}]}),browser:{collectEulerityAccount:()=>{calls++}}});
 assert.equal((await request('download',{accountId:1})).status,500);assert.equal(calls,0);
});
test('legacy module and endpoints retain deployed source and HB single-location behavior',async()=>{
 const files=[['services/eulerityBrowser.js','dc4788bc62fd04ee64c28829c808db4b4d8a7d93548b6969670fe5abf9eb67ea'],['routes/eulerity.js','cdce6d4e902211d9f71dd5b6f05272ecc664ed8d351a9a86683e20124ccc34f6']];
 for(const [file,hash]of files){const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(source).digest('hex'),hash);}
 const filename=path.join(__dirname,'../services/eulerityBrowser.js');const source=fs.readFileSync(filename,'utf8');const legacy={exports:{}};
 vm.runInNewContext(source+'\nmodule.exports.testSelectLocation=selectLocation;', {require:createRequire(filename),module:legacy,__dirname:path.dirname(filename),__filename:filename},{filename});
 const inaccessiblePage=new Proxy({}, {get(){throw Error('Legacy single target must not access a chooser')}});
 await legacy.exports.testSelectLocation(inaccessiblePage,{account_id:2,selector_key:'__single__',selector_label:'HB'});
});
