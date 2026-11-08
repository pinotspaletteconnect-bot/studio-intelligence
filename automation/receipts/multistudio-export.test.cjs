'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {draftHelpers,validateDraft,scopedCode}=require('./build-mailbox-routing.cjs');
const registry=require('./receipt-studio-mailboxes.json');
const {mailboxScope}=require('./mailbox-scope.cjs');
const {scopeReceiptRules}=require('./scoped-runtime.cjs');
const backups=JSON.parse(fs.readFileSync('C:/Projects/studio-intelligence/tmp/multistudio-live-backup-paths.json'));
const drafts=draftHelpers(backups);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
function lookup(scope){return name=>{assert.equal(name,'Mailbox Context');return {first:()=>({json:{mailboxContext:scope}})};};}
async function runtime(scope){
 const js=drafts.review.nodes.find(n=>n.name==='First Receipt Review').parameters.jsCode;
 const prefix=js.slice(0,js.indexOf('const data=$("Batch - Trusted Review Configuration")'));
 return new AsyncFunction('$',prefix+'return {reviewExtractedReceipt,applyOwnerClarifications,reviewMultiOrder,correctReviewedPdf};})();return result;')(lookup(scope));
}
async function config(scope){
 const js=drafts.review.nodes.find(n=>n.name==='Batch - Trusted Review Configuration').parameters.jsCode;
 return (await new AsyncFunction('$','$input',js)(lookup(scope),{all:()=>[]}))[0].json.config;
}
test('all seven existing workflows compile with no dangling connections',()=>{
 for(const w of Object.values(drafts))assert.equal(validateDraft(w),true);
 assert.equal(drafts.coordinator.id,'10cuqNLwpmvvhlAl');
});

test('new approved extraction results reach review without another paid request',async()=>{
 const scope={...mailboxScope(registry,registry.studios[3].mailbox),useSharedCoa:true};
 const c=await config(scope),id='0123456789abcdef';
 const cached={model:'gpt-4o-mini-2024-07-18',source:{sourceMessageId:id,mailbox:scope.mailbox,text:'Paper Towels',attachments:[{filename:'receipt.pdf',size:100,mimeType:'application/pdf'}]},receipt:{documentKind:'receipt',vendor:"Sam's Club",reference:'TEST',date:'2026-11-07',currency:'USD',studioEvidence:'Other studio',items:[{description:'Paper Towels',quantity:1,netCents:1000,itemTaxCents:80,evidence:'Paper Towels 10.00'}],totalCents:1080,subtotalCents:1000,taxCents:80,deliveryCents:0,orderDiscountCents:0,otherFeesCents:0,paidAmountCents:1080,uncertainties:[]}};
 for(const name of ['First Receipt Review','Batch - Prepare and Hold Exceptions']){
  const cache=[{json:{approvalId:'receipt-studios-20261108-usd5-166',status:'complete',sourceMessageId:id,resultJson:JSON.stringify(cached)}}];
  const values={'Mailbox Context':[{json:{mailboxContext:scope}}],'Batch - Trusted Review Configuration':[{json:{config:c,messages:[{id,text:'Paper Towels'}]}}],'Batch - Read Extraction Cache':cache,'Current Extraction Cache':cache,'Read Persisted Receipt Answers':[],'Read Existing Receipt Posting States':[]};
  const result=await new AsyncFunction('$',drafts.review.nodes.find(n=>n.name===name).parameters.jsCode)(n=>({all:()=>values[n],first:()=>values[n][0]}));
  assert.equal(result[0].json.status,'prepared_for_review');
  assert.equal(result[0].json.confirmedStudio,'Jeffersonville');
 }
});

test('new clarification emails use the confirmed work address',()=>{
 const sends=drafts.questions.nodes.filter(n=>n.parameters.sendTo);
 assert.equal(sends.length,8);
 assert.ok(sends.every(n=>n.parameters.sendTo==='jeff.duff@pinotspalette.com'));
});
test('shared approved rules produce balanced splits for each studio without QBO',async()=>{
 for(const studio of registry.studios){
  const scope={...mailboxScope(registry,studio.mailbox),useSharedCoa:true};
  const c=await config(scope),r=await runtime(scope);
  const message={id:'0123456789abcdef',text:''};
  const cache={source:{sourceMessageId:message.id,mailbox:scope.mailbox,attachments:[{filename:'receipt.pdf',size:100,mimeType:'application/pdf'}]},receipt:{documentKind:'receipt',vendor:"Sam's Club",reference:'TEST-RECEIPT',date:'2026-11-07',currency:'USD',studioEvidence:'',items:[{description:'Paper Towels',quantity:1,netCents:1000,itemTaxCents:null,evidence:'Paper Towels 10.00'}],totalCents:1080,subtotalCents:1000,taxCents:80,deliveryCents:0,orderDiscountCents:0,otherFeesCents:0,paidAmountCents:1080,uncertainties:[]}};
  const result=r.reviewExtractedReceipt(message,cache,c.approvedRules,[],{receiptEmailOnly:true});
  assert.ok(result.receipt,scope.studio+': '+result.reason);
  assert.equal(result.receipt.confirmedStudio,scope.studio);
  assert.equal(result.receipt.lines[0].accountName,'Supplies & materials');
  assert.equal(result.receipt.lines.reduce((n,l)=>n+l.amountCents,0),1080);
 }
});
test('embedded argument rules are scoped without changing historical provenance',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true};
 const rules={version:'test',companyId:'9130357828229216',accounts:{supplies:{name:'Supplies'}},rules:[{id:'general'},{id:'specific',sourceMessageId:'0123456789abcdef'}]};
 const js=scopedCode('return [{json:{rules:'+JSON.stringify(rules)+'}}];','fixture','review');
 const output=await new AsyncFunction('$',js)(lookup(scope));
 assert.equal(output[0].json.rules.companyId,scope.scopeId);
 assert.deepEqual(output[0].json.rules.rules.map(r=>r.id),['general','owner-autojate-phone-service-shared']);
 assert.equal(output[0].json.rules.accounts.phone.name,'Utilities:Phone service');
});
test('saved Autojate phone purpose classifies each studio without copying amounts',async()=>{
 for(const studio of registry.studios){
  const scope={...mailboxScope(registry,studio.mailbox),useSharedCoa:true};
  const c=await config(scope),r=await runtime(scope),message={id:'0123456789abcdef',text:''};
  const cache={source:{sourceMessageId:message.id,mailbox:scope.mailbox,attachments:[{filename:'receipt.pdf',size:100,mimeType:'application/pdf'}]},receipt:{documentKind:'receipt',vendor:'Autojate',reference:'TEST-PHONE',date:'2026-11-07',currency:'USD',studioEvidence:'',items:[{description:'Jesse - Pinot’s Palette St. Matthews (half of the Louisville receptionist)',quantity:1,netCents:7950,itemTaxCents:0,evidence:'79.50'}],totalCents:7950,subtotalCents:7950,taxCents:0,deliveryCents:0,orderDiscountCents:0,otherFeesCents:0,paidAmountCents:7950,uncertainties:[]}};
  const result=r.reviewExtractedReceipt(message,cache,c.approvedRules,[],{receiptEmailOnly:true});
  assert.ok(result.receipt,result.reason);assert.equal(result.receipt.lines[0].accountName,'Utilities:Phone service');assert.equal(result.receipt.lines[0].amountCents,7950);
 }
});
test('inbox determines studio even when printed or forwarded location differs',async()=>{
 const scope={...mailboxScope(registry,registry.studios[2].mailbox),useSharedCoa:true};
 const js=scopedCode("function receiptAddressEvidence(receipt,message,owner){return receipt;}return [{json:receiptAddressEvidence({studioEvidence:'Gilbert'}, {}, {})}];",'fixture','review');
 const out=await new AsyncFunction('$',js)(lookup(scope));
 assert.equal(out[0].json.studioEvidence,'Owner-assigned receipt inbox: Short North');
 assert.equal(out[0].json.printedStudioEvidence,'Gilbert');
 assert.ok(!drafts.coordinator.nodes.find(n=>n.name==='Plan Genuine Questions').parameters.jsCode.includes("add('studioEvidence','Was this expense for Gilbert?"));
});
test('a new studio without extraction history keeps the review running',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true};
 const js=scopedCode('return [{json:{sourceMessageId:"0123456789abcdef",resultJson:JSON.stringify({source:{mailbox:"crashseaselempirereceipts@gmail.com"}})}}];','Batch - Read Extraction Cache','review');
 const output=await new AsyncFunction('$',js)(lookup(scope));
 assert.equal(output.length,1);assert.equal(output[0].json.status,'no_extraction_cache');
 assert.equal(output[0].json.mailboxContext.mailbox,scope.mailbox);
});
test('Google account notices never reach paid extraction; invoices remain eligible',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true};
 const js=scopedCode('return [{json:{eligible:true}}];','Backlog - Select Real Attachments','extraction');
 const run=subject=>new AsyncFunction('$','$input',js)(lookup(scope),{first:()=>({json:{payload:{headers:[{name:'From',value:'Google <no-reply@google.com>'},{name:'Subject',value:subject}]}}})});
 assert.deepEqual(await run('Welcome to Google on your Windows'),[]);
 assert.equal((await run('Your Google invoice'))[0].json.eligible,true);
});

test('exhausted allowance skips extraction sweep while preserving review continuation',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true};
 const js=scopedCode('return [{json:{sourceMessageId:"a"}},{json:{sourceMessageId:"b"}}];','Choose Unread Receipts','review');
 const run=rows=>new AsyncFunction('$',js)(name=>name==='Read New Extraction Cache'?{all:()=>rows.map(json=>({json}))}:lookup(scope)(name));
 const exhausted=await run([{status:'complete'}]);
 assert.equal(exhausted.length,1);assert.equal(exhausted[0].json.sourceMessageId,null);
 assert.equal(exhausted[0].json.extractionDeferred,true);
 const bounded=await run([{status:'available'},{status:'reserved'}]);
 assert.equal(bounded.length,1);assert.equal(bounded[0].json.sourceMessageId,'a');
});
test('original-mail sender binding is specific to the active studio',()=>{
 const js=drafts.replies.nodes.find(n=>n.name==='Bind Exact Original Question').parameters.jsCode;
 assert.ok(js.includes(".toLowerCase()!==MB.mailbox"));
 assert.ok(!js.includes('/^crashseaselempirereceipts'));
});
test('clarification inserts map only known scalar columns',()=>{
 const c=drafts.questions.nodes.find(n=>n.name==='Insert row').parameters.columns;
 assert.equal(c.mappingMode,'defineBelow');
 assert.ok(!Object.hasOwn(c.value,'mailboxContext'));
 assert.ok(Object.hasOwn(c.value,'reviewKey'));
 assert.ok(Object.hasOwn(c.value,'question'));
});
test('reported extraction usage is accepted only within its reserved cost',()=>{
 const js=drafts.extraction.nodes.find(n=>n.name==='Backlog - Validate Extraction Results').parameters.jsCode;
 const fn=js.slice(js.indexOf('function parseExtractionResponse'),js.indexOf("const requests=$('Backlog - Require Owned Allowance')"));
 const parse=new Function('APPROVAL',fn+'return parseExtractionResponse;')({model:'gpt-4o-mini-2024-07-18',inputMicrousdPerToken:0.15,outputMicrousdPerToken:0.6,reservationMicrousd:30000,maxOutputTokens:8192});
 const response={status:'completed',model:'gpt-4o-mini-2024-07-18',output:[{content:[{type:'output_text',text:'{"items":[],"uncertainties":[]}'}]}],usage:{input_tokens:128022,output_tokens:388}};
 assert.equal(parse(response).usage.upperCostMicrousd,19437);
 assert.throws(()=>parse({...response,usage:{input_tokens:200000,output_tokens:388}}));
});
test('each inbox read has a bounded Gmail request count',()=>{
 const reads=drafts.review.nodes.filter(n=>n.type==='n8n-nodes-base.gmail'&&n.parameters.operation==='getAll');
 assert.equal(reads.length,4);
 assert.ok(reads.every(n=>n.parameters.returnAll===false&&n.parameters.limit===250));
});
test('source-specific correction and two-order decisions do not cross studios',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true};
 const r=await runtime(scope);
 assert.equal(r.reviewMultiOrder({id:'1a0683cc13b767a4'},{companyId:scope.scopeId},null,{}),null);
});
test('each studio archives only after two verified PDFs, preserving duplicate identity',async()=>{
 for(const studio of registry.studios){
  const scope={...mailboxScope(registry,studio.mailbox),useSharedCoa:true};
  const js=drafts.archive.nodes.find(n=>n.name==='Require Reviewed Receipt').parameters.jsCode;
  const prefix=js.slice(0,js.indexOf('const p=$input.first().json;'));
  const r=await new AsyncFunction('$',prefix+'return {planReceiptCopies,archiveAfterVerified};})();return result;')(lookup(scope));
  const receipt={companyId:scope.scopeId,sourceMessageId:'0123456789abcdef',status:'prepared_for_review',confirmedStudio:scope.studio,vendor:'Test Supplier',totalCents:1080,extractedDate:'2026-11-07',ruleVersion:'approved',summaryFingerprint:'a'.repeat(64),allocationLines:[{accountId:'131',accountName:'Supplies & materials',description:'Paper towels',amountCents:1080}]};
  const prefixName='receipt-'+(scope.studio==='Gilbert'?'':scope.scopeId+'-')+receipt.sourceMessageId;
  const sourceFiles=['source','summary'].map((kind,i)=>({id:'staging'+i,name:prefixName+(kind==='summary'?'-'+receipt.summaryFingerprint:'')+' - '+kind+'.pdf',mimeType:'application/pdf',size:100,md5Checksum:String(i+1).repeat(32)}));
  const cfg={studios:Object.fromEntries(registry.studios.map(s=>[s.studio,{folderId:s.folderId}]))};
  const planned=r.planReceiptCopies(receipt,sourceFiles,{files:[]},cfg);
  assert.equal(planned.length,2);assert.ok(planned.every(j=>j.folderId===studio.folderId));
  const saved=planned.map((j,i)=>({id:'saved'+i,name:j.name,mimeType:'application/pdf',parents:[j.folderId],size:j.expectedSize,md5Checksum:j.expectedMd5,appProperties:{receiptIdentity:j.identity}}));
  assert.deepEqual(r.planReceiptCopies(receipt,sourceFiles,{files:saved},cfg).map(j=>j.existingFileId),['saved0','saved1']);
  assert.throws(()=>r.archiveAfterVerified(receipt,[],scope.mailbox,'completed'),/Both separately verified/);
  const jobs=['source','summary'].map((kind,i)=>({kind,sourceMessageId:receipt.sourceMessageId,verified:true,fileId:'file'+i}));
  assert.deepEqual(r.archiveAfterVerified(receipt,jobs,scope.mailbox,'completed').removeLabelIds,['INBOX']);
  assert.throws(()=>r.archiveAfterVerified(receipt,jobs,'wrong@example.com','completed'),/Wrong Gmail/);
 }
});
