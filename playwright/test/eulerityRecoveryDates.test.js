const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const parser = require('../services/eulerityParser');
const {METRIC_COLUMNS,SPEND_COLUMNS,recoveryRange,sourceDate,exactCoverage,validatedRecoveryReports}=require('../services/eulerityRecoveryDates');
const range=recoveryRange('2026-11-09','2026-11-15','2026-11-16');
function reports(){return {metrics:range.dates.map((date,i)=>Object.fromEntries(METRIC_COLUMNS.map(c=>[c,c==='Date'?date.replace(/-/g,''):String(i+10)]))),spend:range.dates.map((date,i)=>({'Business Name':'Business','Campaign Name':'Studio Alpha',User:'private@example.test',Date:date.replace(/(\d{4})-(\d{2})-(\d{2})/,'$2/$3/$1'),Spend:String((i+1)*3.25),'Activation Date':'Sep 22, 2024'}))};}
function files(t,rows){const folder=fs.mkdtempSync(path.join(os.tmpdir(),'eulerity-dates-test-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const metricsFile=path.join(folder,'metrics.csv'),spendFile=path.join(folder,'spend.csv');const write=(file,cols,records)=>fs.writeFileSync(file,[cols,...records.map(row=>cols.map(col=>row[col]??''))].map(row=>row.map(value=>JSON.stringify(value)).join(',')).join('\n'));write(metricsFile,METRIC_COLUMNS,rows.metrics);write(spendFile,SPEND_COLUMNS,rows.spend);return {metricsFile,spendFile,sourceEvidence:{selectorKey:'source-alpha',displayName:'Studio Alpha',metricsRange:{fromDate:range.fromDate,toDate:range.toDate},spendRange:{fromDate:range.fromDate,toDate:range.toDate}}};}
const target={selector_key:'source-alpha'};
test('validates bounded completed calendar dates without timezone shifts',()=>{
 assert.deepEqual(range.dates,['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15']);
 assert.equal(recoveryRange('2024-02-28','2024-03-01','2026-11-16').dates.length,3);
 assert.equal(recoveryRange('2026-01-01','2026-01-31','2026-11-16').dates.length,31);
 for(const args of [[undefined,'2026-11-15'],['2026-11-09',undefined],['2026-02-30','2026-03-01'],['2026-11-15','2026-11-09'],['2026-11-09','2026-11-16'],['2026-01-01','2026-02-01'],['11/9/2026','2026-11-15']])assert.throws(()=>recoveryRange(...args,'2026-11-16'));
 assert.equal(sourceDate('20261109'),'2026-11-09');assert.equal(sourceDate('11/9/2026'),'2026-11-09');assert.throws(()=>sourceDate('20260230'));
});
test('actual parsers retain every CSV source date and value; historical allocations stay null',async t=>{
 const rows=reports();rows.spend.reverse();const result=await validatedRecoveryReports(files(t,rows),target,range,{...parser,parseBudget:()=>{throw Error('must never use current budget')}});
 assert.deepEqual(result.metrics.map(r=>r.report_date),range.dates);assert.deepEqual(result.metrics.map(r=>r.impressions_total),[10,11,12,13,14,15,16]);assert.deepEqual(result.spend.map(r=>r.spend),[22.75,19.5,16.25,13,9.75,6.5,3.25]);assert.equal(result.budget,null);assert.equal(result.historicalChannelSpend,null);assert.equal(result.costAllocationStatus,'unverified');assert.equal(result.sourceEvidence.sourceDatesVerified,true);assert(!JSON.stringify(result).includes('private@example.test'));
});
test('rejects missing, duplicate, extra or wrong dates in either raw CSV',async t=>{
 for(const change of [r=>r.metrics.pop(),r=>r.spend.pop(),r=>r.metrics[0].Date=r.metrics[1].Date,r=>r.spend[0].Date='11/8/2026',r=>r.metrics.push({...r.metrics[0],Date:'20261116'}),r=>r.spend[0].Date='Sep 22, 2024']){const rows=reports();change(rows);await assert.rejects(validatedRecoveryReports(files(t,rows),target,range,parser),/Eulerity/);}
});
test('rejects absent numeric columns/values and wrong campaign before returning data',async t=>{
 for(const change of [r=>r.metrics[0]['Display Impressions']='',r=>r.metrics[0]['Total Clicks']='NaN',r=>r.metrics[0]['Total Impressions']='1.2',r=>r.spend[0].Spend='-5',r=>r.spend[0]['Campaign Name']='Another Studio']){const rows=reports();change(rows);await assert.rejects(validatedRecoveryReports(files(t,rows),target,range,parser),/Eulerity/);}
 const rows=reports(),item=files(t,rows);const broken={...parser,loadCSV:async file=>{const parsed=await parser.loadCSV(file);if(file===item.metricsFile)delete parsed[0]['Display Impressions'];return parsed;}};await assert.rejects(validatedRecoveryReports(item,target,range,broken),/columns/);
});
test('rejects missing or changed UI evidence and any parser date relabeling',async t=>{
 for(const change of [i=>delete i.sourceEvidence,i=>i.sourceEvidence.selectorKey='other',i=>i.sourceEvidence.metricsRange.toDate='2026-11-16',i=>i.sourceEvidence.spendRange.fromDate='2026-11-08']){const item=files(t,reports());change(item);await assert.rejects(validatedRecoveryReports(item,target,range,parser),/verification/);}
 const item=files(t,reports());await assert.rejects(validatedRecoveryReports(item,target,range,{...parser,parseMetrics:async file=>(await parser.parseMetrics(file)).reverse()}),/changed a source report date/);
});
test('coverage check rejects duplicate dates even when row count matches',()=>{
 assert.throws(()=>exactCoverage(range.dates.map((date,i)=>({report_date:i?date:range.dates[1]})),range,'report_date'),/duplicate/);
});

 test('refuses parsed values that do not match raw source cells', async t => {
  const item = files(t, reports());
  await assert.rejects(validatedRecoveryReports(item, target, range, { ...parser, parseMetrics: async file => (await parser.parseMetrics(file)).map(row => ({...row, impressions_total: 9999})) }), /changed a source metric value/);
  await assert.rejects(validatedRecoveryReports(item, target, range, { ...parser, parseSpend: async file => (await parser.parseSpend(file)).map(row => ({...row, spend: 9999})) }), /changed source spend/);
});
