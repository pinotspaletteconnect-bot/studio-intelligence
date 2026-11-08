const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {facts,prepareSupportingDocument,supportingFact}=require('./reviewed-supporting-documents.cjs');
const {draftHelpers}=require('./build-mailbox-routing.cjs');
const drafts=draftHelpers(JSON.parse(fs.readFileSync('C:/Projects/studio-intelligence/tmp/multistudio-live-backup-paths.json')));
const A=Object.getPrototypeOf(async function(){}).constructor;
const fact=facts[0],scope={mailbox:fact.mailbox,scopeId:fact.companyId,studio:'Short North',useSharedCoa:true};
const cache={source:{mailbox:fact.mailbox,sourceMessageId:fact.sourceMessageId,attachments:[{filename:fact.filename,mimeType:fact.mimeType,size:fact.size}]},receipt:{vendor:fact.vendor,reference:fact.reference,date:fact.date,totalCents:fact.totalCents}};
const get=n=>({first:()=>({json:{mailboxContext:scope}})});
function record(){return prepareSupportingDocument({id:fact.sourceMessageId},cache,scope,facts).json;}
test('reviewed deposit keeps exact evidence and never invents an expense category',()=>{
 const r=record();assert.equal(r.allocationLines.length,0);assert.equal(r.postingAllowed,false);assert.ok(supportingFact(r,facts));
 for(const delta of [{totalCents:1},{companyId:'other'},{reference:'other'},{allocationLines:[{accountId:'131',amountCents:58600}]}])assert.equal(supportingFact({...r,...delta},facts),undefined);
 assert.equal(prepareSupportingDocument({id:fact.sourceMessageId},cache,{...scope,mailbox:'other'},facts),null);
});
test('supporting PDF summary explicitly states no expense split and archive guard stays exact',async()=>{
 let js=drafts.documents.nodes.find(n=>n.name==='Batch - Prepare Current Summary Content').parameters.jsCode;
 let prefix=js.slice(0,js.indexOf('const rows=$input.all().map(i=>i.json);'));
 const api=await new A('$',prefix+'return {currentSummaryPayload,currentSummaryRequest};})();return result;')(get);
 const r=record(),p=api.currentSummaryPayload(r),q=api.currentSummaryRequest(p,'a'.repeat(64));
 assert.match(q.message.text,/NO EXPENSE COA SPLIT/);assert.match(q.message.text,/Deposit amount: \$586.00/);assert.equal(p.recordKind,'supporting_bank_document');assert.equal(p.lines.length,0);
 assert.throws(()=>api.currentSummaryPayload({...r,totalCents:99}),/Unverified/);
 js=drafts.archive.nodes.find(n=>n.name==='Require Reviewed Receipt').parameters.jsCode;
 prefix=js.slice(0,js.indexOf('const p=$input.first().json;const r=p.receipt;'));
 const check=await new A('$',prefix+'return validateReceiptSplit;})();return result;')(get);
 assert.equal(check({...r,summaryFingerprint:'a'.repeat(64)}),true);
 assert.throws(()=>check({...r,recordKind:undefined,summaryFingerprint:'a'.repeat(64)}),/Confirmed item categories/);
 assert.throws(()=>check({...r,totalCents:1,summaryFingerprint:'a'.repeat(64)}),/Unverified/);
});
