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
 const app=express();app.use(express.json());app.use('/eulerity/account1-recovery',createEulerityRecoveryRouter({today:()=> '2026-11-16',...deps}));
 const s=app.listen(0,'127.0.0.1');await new Promise(r=>s.once('listening',r));t.after(()=>new Promise(r=>s.close(r)));
 return async(endpoint,body,auth=true)=>fetch(`http://127.0.0.1:${s.address().port}/eulerity/account1-recovery/${endpoint}`,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
}
const dateBody={accountId:1,fromDate:'2026-11-09',toDate:'2026-11-15'};
const account=()=>({accountId:1,account:{account_id:1,organization_id:1},targets:[1,2,3,4].map(id=>({account_id:1,organization_id:1,studio_id:id,studio_code:'TEST'+id,studio_name:'Test '+id,selector_key:'source-'+id,selector_label:'Studio '+id}))});
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
test('recovery collection verifies all four date slices, holds unsupported costs and cleans temporary files',async t=>{
 const {METRIC_COLUMNS,recoveryRange}=require('../services/eulerityRecoveryDates');const range=recoveryRange(dateBody.fromDate,dateBody.toDate,'2026-11-16');
 const resolved=account();let removed;
 const request=await server(t,{resolveAccount:async()=>resolved,browser:{collectEulerityAccount:async(a,targets,r)=>{assert.equal(a,resolved);assert.equal(targets,resolved.targets);assert.deepEqual(r,range);return {folder:'test-temp',results:targets.map(target=>({target,metricsFile:`${target.studio_id}-metrics`,spendFile:`${target.studio_id}-spend`,sourceEvidence:{selectorKey:target.selector_key,displayName:target.selector_label,metricsRange:range,spendRange:range}}))}}},parser:{
 loadCSV:async file=>range.dates.map(date=>file.endsWith('metrics')?Object.fromEntries(METRIC_COLUMNS.map(c=>[c,c==='Date'?date.replace(/-/g,''):'1'])):{'Business Name':'Business','Campaign Name':'Studio '+file[0],User:'PRIVATE_EMAIL','Date':date.replace(/(\d{4})-(\d{2})-(\d{2})/,'$2/$3/$1'),Spend:'5','Activation Date':'Sep 22, 2024'}),
 parseMetrics:async()=>range.dates.map(report_date=>({report_date,...Object.fromEntries(METRIC_COLUMNS.filter(c=>c!=='Date').map(c=>{const [channel,metric]=c.split(' ');return [`${metric.toLowerCase()}_${channel.toLowerCase()}`,1]}))})),parseSpend:async file=>range.dates.map(report_date=>({report_date,spend:5,campaign_name:'Studio '+file[0],user_email:'PRIVATE_EMAIL'})),parseBudget:()=>{throw Error('current budget must never be parsed')}
 },removeFolder:folder=>{removed=folder}});
 const response=await request('download',{...dateBody,targets:[{account_id:2,studio_id:5}]});assert.equal(response.status,200);const result=await response.json();assert.equal(result.studioCount,4);assert.equal(result.sourceDatesVerified,true);assert.equal(result.warehouseReady,false);assert.equal(result.schemaVersion,2);assert.deepEqual(result.results.map(r=>r.studioId),[1,2,3,4]);for(const row of result.results){assert.equal(row.budget,null);assert.equal(row.historicalChannelSpend,null);assert.equal(row.costAllocationStatus,'unverified');assert.equal(row.metrics.length,7);}assert(!JSON.stringify(result).includes('PRIVATE_EMAIL'));assert.equal(removed,'test-temp');
});
test('invalid or omitted dates fail before credential or browser access',async t=>{
 let calls=0;const request=await server(t,{resolveAccount:async()=>{calls++;throw Error('must not resolve')}});
 for(const body of [{accountId:1},{...dateBody,fromDate:'2026-02-30'},{...dateBody,toDate:'2026-11-16'},{...dateBody,toDate:'2026-11-08'},{...dateBody,fromDate:'2026-09-01'}])assert.equal((await request('download',body)).status,400);
 assert.equal(calls,0);
});
test('recovery refuses cross-account, duplicate, incomplete or outside-scope configured targets',async t=>{
 for(const change of [a=>a.targets.pop(),a=>a.targets[0].account_id=2,a=>a.targets[0].studio_id=5,a=>a.targets[1].selector_key=a.targets[0].selector_key,a=>a.targets[0].selector_key='__single__']){
 let calls=0;const resolved=account();change(resolved);const request=await server(t,{resolveAccount:async()=>resolved,browser:{collectEulerityAccount:()=>{calls++}}});
 assert.equal((await request('download',dateBody)).status,500);assert.equal(calls,0);
 }
});
test('incomplete or duplicated collected studios fail without returning partial results',async t=>{
 for(const mode of ['missing','duplicate']){let removed;const resolved=account();const targets=mode==='missing'?resolved.targets.slice(0,3):[resolved.targets[0],resolved.targets[0],resolved.targets[2],resolved.targets[3]];
 const request=await server(t,{resolveAccount:async()=>resolved,browser:{collectEulerityAccount:async()=>({folder:'test-temp',results:targets.map(target=>({target}))})},removeFolder:f=>{removed=f}});
 const response=await request('download',dateBody);assert.equal(response.status,500);assert.equal((await response.json()).results,undefined);assert.equal(removed,'test-temp');
 }
});
test('legacy module and endpoints retain deployed source and HB single-location behavior',async()=>{
 const files=[['services/eulerityBrowser.js','dc4788bc62fd04ee64c28829c808db4b4d8a7d93548b6969670fe5abf9eb67ea'],['routes/eulerity.js','cdce6d4e902211d9f71dd5b6f05272ecc664ed8d351a9a86683e20124ccc34f6']];
 for(const [file,hash]of files){const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(source).digest('hex'),hash);}
 const filename=path.join(__dirname,'../services/eulerityBrowser.js');const source=fs.readFileSync(filename,'utf8');const legacy={exports:{}};
 vm.runInNewContext(source+'\nmodule.exports.testSelectLocation=selectLocation;', {require:createRequire(filename),module:legacy,__dirname:path.dirname(filename),__filename:filename},{filename});
 const inaccessiblePage=new Proxy({}, {get(){throw Error('Legacy single target must not access a chooser')}});
 await legacy.exports.testSelectLocation(inaccessiblePage,{account_id:2,selector_key:'__single__',selector_label:'HB'});
});

test('a missing date in the fourth studio rejects the entire collection and cleans files',async t=>{
 const {METRIC_COLUMNS,recoveryRange}=require('../services/eulerityRecoveryDates');const range=recoveryRange(dateBody.fromDate,dateBody.toDate,'2026-11-16');const resolved=account();let removed;
 const metrics=()=>range.dates.map(report_date=>({report_date,...Object.fromEntries(METRIC_COLUMNS.filter(c=>c!=='Date').map(c=>{const [channel,metric]=c.split(' ');return [`${metric.toLowerCase()}_${channel.toLowerCase()}`,1]}))}));
 const request=await server(t,{resolveAccount:async()=>resolved,browser:{collectEulerityAccount:async()=>({folder:'test-temp',results:resolved.targets.map(target=>({target,metricsFile:`${target.studio_id}-metrics`,spendFile:`${target.studio_id}-spend`,sourceEvidence:{selectorKey:target.selector_key,displayName:target.selector_label,metricsRange:range,spendRange:range}}))})},parser:{loadCSV:async file=>range.dates.slice(0,file==='4-spend'?6:7).map(date=>file.endsWith('metrics')?Object.fromEntries(METRIC_COLUMNS.map(c=>[c,c==='Date'?date.replace(/-/g,''):'1'])):{'Business Name':'Business','Campaign Name':'Studio '+file[0],User:'private@example.test',Date:date.replace(/(\d{4})-(\d{2})-(\d{2})/,'$2/$3/$1'),Spend:'5','Activation Date':'Sep 22, 2024'}),parseMetrics:async()=>metrics(),parseSpend:async file=>range.dates.map(report_date=>({report_date,spend:5,campaign_name:'Studio '+file[0]}))},removeFolder:f=>{removed=f}});
 const response=await request('download',dateBody);assert.equal(response.status,500);assert.equal((await response.json()).results,undefined);assert.equal(removed,'test-temp');
});
