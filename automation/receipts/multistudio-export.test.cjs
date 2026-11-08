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
 return new AsyncFunction('$',prefix+'return {reviewExtractedReceipt,applyOwnerClarifications,reviewMultiOrder,correctReviewedPdf,classifyItem};})();return result;')(lookup(scope));
}
async function config(scope){
 const js=drafts.review.nodes.find(n=>n.name==='Batch - Trusted Review Configuration').parameters.jsCode;
 return (await new AsyncFunction('$','$input',js)(lookup(scope),{all:()=>[]}))[0].json.config;
}
test('all seven existing workflows compile with no dangling connections',()=>{
 for(const w of Object.values(drafts))assert.equal(validateDraft(w),true);
 assert.equal(drafts.coordinator.id,'10cuqNLwpmvvhlAl');
});
test('PDF rendering retries briefly without retrying paid extraction or durable uploads',()=>{
 const node=drafts.documents.nodes.find(n=>n.name==='Batch - Render Documents');
 assert.equal(node.retryOnFail,true);assert.equal(node.maxTries,4);assert.equal(node.waitBetweenTries,5000);
 assert.equal(node.parameters.options.batching.batch.batchSize,1);
});

test('reviewed Target reference retains its original photo through evidence preparation',async()=>{
 const scope={...mailboxScope(registry,'jessejayspinotreceipts@gmail.com'),useSharedCoa:true};
 const js=drafts.review.nodes.find(n=>n.name==='First Receipt Review').parameters.jsCode;
 const prefix=js.slice(0,js.indexOf('const data=$("Batch - Trusted Review Configuration")'));
 const add=await new AsyncFunction('$',prefix+'return addExtractionEvidence;})();return result;')(lookup(scope));
 const cache={source:{mailbox:scope.mailbox,sourceMessageId:'1a0e940cf111b81e',attachments:[{filename:'pro-RTGVbqtE.jpeg',mimeType:'image/jpeg',size:863310}]},receipt:{vendor:'Target',date:'2026-09-28',totalCents:1060,subtotalCents:1060,reference:null,items:[{description:'Mondo Llama',netCents:1000}]}};
 const item={json:{sourceMessageId:cache.source.sourceMessageId,companyId:scope.scopeId,status:'prepared_for_review',reference:'2-6271-2473-0160-7748-7',totalCents:1060}};
 const result=add(item,cache);
 assert.equal(result.json.sourceAttachment.kind,'pdf_bundle_v1');
 assert.deepEqual(result.json.sourceAttachment.files,cache.source.attachments);
 assert.equal(cache.receipt.reference,null);
 assert.equal(add({...item,json:{...item.json,totalCents:9999}},cache).json.sourceAttachment,undefined);
});
test('uncached Canvas Depot email uses shared owner category without extraction',async()=>{
 const scope={...mailboxScope(registry,registry.studios[2].mailbox),useSharedCoa:true},c=await config(scope),id='0123456789abcdef';
 const text='From: outgoing@safewebservices.com\nDYNAMIC WHOLESALE SIGNS\nYour Card Sale is complete!\nApr 20, 2026\n$125.55\nTransaction ID\n11969756418\nDescription\nThe Canvas Depot\nOrder ID\nINV 6380\n';
 for(const name of ['First Receipt Review','Batch - Prepare and Hold Exceptions']){
  const values={'Mailbox Context':[{json:{mailboxContext:scope}}],'Batch - Trusted Review Configuration':[{json:{config:c,messages:[{id,text,subject:'Canvas Depot payment'}]}}],'Batch - Read Extraction Cache':[],'Current Extraction Cache':[],'Read Persisted Receipt Answers':[],'Read Existing Receipt Posting States':[]};
  const result=await new AsyncFunction('$',drafts.review.nodes.find(n=>n.name===name).parameters.jsCode)(n=>({all:()=>values[n],first:()=>values[n][0]}));
  assert.equal(result[0].json.status,'prepared_for_review');assert.equal(result[0].json.totalCents,12555);assert.equal(result[0].json.allocationLines[0].accountId,'222');
 }
});
test('TD paint rule recognizes named paint containers but excludes other merchandise',()=>{
 const rule=require('./shared-owner-rules.json').find(r=>r.id==='td-paint-color-quarts');
 const match=new RegExp(rule.pattern,'i');
 assert.equal(rule.accountDefinition.id,'164');
 assert.ok(match.test('Titanium White Quart Size 32 oz.'));
 assert.ok(match.test('Magenta Size 32 oz.'));
 assert.ok(match.test('Fluorescent Pink Size 32 oz.'));
 assert.ok(match.test('Fluorescent White Size 32 oz. $9.53 Case of 1'));
 assert.ok(!match.test('Fluorescent White Size 32 oz. plus unknown accessory'));
 for(const color of ['Metallic Copper','Metallic Gold','Fluorescent Orange','Fluorescent Yellow','Burnt Umber','Burnt Sienna','Violet Quart','Chrome Orange Quart','Chrome Yellow Quart'])assert.ok(match.test(color+' Size 32 oz.'));
 assert.ok(!match.test('White Candle Vessel Size 32 oz.'));
 assert.ok(!match.test('Titanium White Shirt'));
});
test('existing TD canvas and candle categories apply to extracted descriptions',async()=>{
 const scope={...mailboxScope(registry,registry.studios[2].mailbox),useSharedCoa:true},c=await config(scope),r=await runtime(scope);
 for(const [description,id] of [['10 x 30" Canvas $3.25ea Case of 24','163'],['Candle Fragrance Bourbon Tobacco 1 Pound','1150040007'],['Candle Warning Label','1150040007']]){
  assert.equal(r.classifyItem({vendor:'TD Art Supply',description},scope.scopeId,c.approvedRules)?.accountId,id);
 }
 assert.equal(r.classifyItem({vendor:'TD Art Supply',description:'Unknown accessory'},scope.scopeId,c.approvedRules),null);
 assert.equal(r.classifyItem({vendor:'TD Art Supply',description:'Candle Soy Wax 25 lb'},scope.scopeId,c.approvedRules)?.accountId,'1150040007');
 for(const description of ['Candle Cotton Wick $0.15 ea Packed 36','Candle Wick Stickers $0.025 ea Case of 80','Candle Vessel Customer Labels'])assert.equal(r.classifyItem({vendor:'TD Art Supply',description},scope.scopeId,c.approvedRules)?.accountId,'1150040007');
 assert.equal(r.classifyItem({vendor:'TD Art Supply',description:'Candle Fragrance Measuring Cup .75oz $0.025 ea Case Pack 100'},scope.scopeId,c.approvedRules)?.accountId,'1150040010');
 assert.equal(r.classifyItem({vendor:'TD Art Supply',description:'16 x 20" Premium Canvas'},scope.scopeId,c.approvedRules)?.accountId,'163');
 assert.equal(r.classifyItem({vendor:'TD Art Supply',description:'16" x 20" BLACK Canvas $2.25ea Case of 24'},scope.scopeId,c.approvedRules)?.accountId,'163');
});

test('saved service purposes map to existing accounts without guessing other services',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true},c=await config(scope),r=await runtime(scope);
 for(const [vendor,description,id] of [['Franklin Pest Solutions','Commercial Pest Recurring','68'],['Outshine Window Cleaning','Window Cleaning Out Only + I/O Doors','68'],['Kahoot!','Kahoot!+ Premier Personal (annual billing)','122']])assert.equal(r.classifyItem({vendor,description},scope.scopeId,c.approvedRules)?.accountId,id);
 assert.equal(r.classifyItem({vendor:'Outshine Window Cleaning',description:'Amount'},scope.scopeId,c.approvedRules),null);
 assert.equal(r.classifyItem({vendor:'Unknown Vendor',description:'Commercial Pest Recurring'},scope.scopeId,c.approvedRules),null);
 const js=drafts.review.nodes.find(n=>n.name==='First Receipt Review').parameters.jsCode;
 const prefix=js.slice(0,js.indexOf('const data=$("Batch - Trusted Review Configuration")'));
 const match=await new AsyncFunction('$',prefix+'return knownOwnerCategory;})();return result;')(lookup(scope));
 for(const answer of ['Pest control.','Pest control','This is for window cleaning.'])assert.equal(match(answer,c.approvedRules)?.accountId,'68');
 assert.equal(match('Pest control or supplies?',c.approvedRules),null);
});

test('saved shipping and special-product answers use existing configured accounts',async()=>{
 const scope={...mailboxScope(registry,registry.studios[2].mailbox),useSharedCoa:true},c=await config(scope),r=await runtime(scope);
 const js=drafts.review.nodes.find(n=>n.name==='First Receipt Review').parameters.jsCode;
 const prefix=js.slice(0,js.indexOf('const data=$("Batch - Trusted Review Configuration")'));
 const match=await new AsyncFunction('$',prefix+'return knownOwnerCategory;})();return result;')(lookup(scope));
 for(const [answer,id] of [['Postage and shipping','123'],['All shippos are shipping and postage','123'],['Special class cogs','222'],['Special products cogs','222'],['Special product inventory','179'],['Printing and photocopying','120']])assert.equal(match(answer,c.approvedRules)?.accountId,id);
 assert.equal(match('maybe shipping or supplies',c.approvedRules),null);
 assert.equal(match('marketing',c.approvedRules)?.accountId,'13');
 assert.equal(match('Staff enrichment. Find a coa that is close to this.',c.approvedRules)?.accountId,'1150040006');
 assert.equal(match('These are all under cintas',c.approvedRules)?.accountId,'229');
 assert.equal(match('Candle inventoiry',c.approvedRules)?.accountId,'1150040007');
 assert.equal(match('Candle inventoiry or supplies?',c.approvedRules),null);
 assert.equal(r.classifyItem({vendor:'Shippo',description:'Invoice Payment Confirmation'},scope.scopeId,c.approvedRules)?.accountId,'123');
 assert.equal(r.classifyItem({vendor:'TD Art Supply',description:'#4 Round Brush'},scope.scopeId,c.approvedRules)?.accountId,'221');
 assert.equal(r.classifyItem({vendor:'Unknown',description:'Invoice Payment Confirmation'},scope.scopeId,c.approvedRules),null);
});

test('authenticated saved category answer survives a stale follow-up delivery state',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true},c=await config(scope),r=await runtime(scope),id='0123456789abcdef';
 const cache={source:{sourceMessageId:id,attachments:[]},receipt:{items:[{description:'Amount',netCents:2650}]}};
 const meta={version:1,companyId:scope.scopeId,receiptKey:scope.scopeId+':'+id,field:'category',itemIndex:0,observed:'Amount',attachments:[]};
 const audit={messageId:'reply',sender:'jeff.duff@pinotspalette.com',authenticated:true,receivedAt:'2026-11-08T12:00:00Z',answer:'This is for window cleaning.'};
 const row={companyId:scope.scopeId,receiptKey:meta.receiptKey,reviewKey:'a'.repeat(64),status:'followup_delivery_pending',question:'Question\n[RECEIPT-QUESTION-V1]'+JSON.stringify(meta),ruleScope:'owner-clarification-v1:'+JSON.stringify([audit])};
 assert.equal(r.applyOwnerClarifications({id},cache,[row],c.approvedRules).mappings[0]?.accountId,'68');
 const wrong={...row,ruleScope:'owner-clarification-v1:'+JSON.stringify([{...audit,authenticated:false}])};
 assert.deepEqual(r.applyOwnerClarifications({id},cache,[wrong],c.approvedRules).mappings,{});
 assert.deepEqual(r.applyOwnerClarifications({id:'different'},cache,[row],c.approvedRules).mappings,{});
 const all={...row,ruleScope:'owner-clarification-v1:'+JSON.stringify([{...audit,answer:'These are all under cintas'}])};
 const cintas={...cache,receipt:{vendor:'CINTAS',items:[...cache.receipt.items,{description:'Soap service',netCents:1000}]}};
 assert.equal(r.applyOwnerClarifications({id},cintas,[all],c.approvedRules).mappings[1]?.accountId,'229');
 assert.equal(r.applyOwnerClarifications({id},{...cintas,receipt:{...cintas.receipt,vendor:'Other'}},[all],c.approvedRules).mappings[1],undefined);
});

test('absent ancillary lines clear only when item and total arithmetic fully reconcile',async()=>{
 const scope={...mailboxScope(registry,registry.studios[3].mailbox),useSharedCoa:true};
 const js=drafts.review.nodes.find(n=>n.name==='First Receipt Review').parameters.jsCode;
 const prefix=js.slice(0,js.indexOf('const data=$("Batch - Trusted Review Configuration")'));
 const normalize=await new AsyncFunction('$',prefix+'return workingConfirmation;})();return result;')(lookup(scope));
 const r={documentKind:'order_confirmation',items:[{netCents:28656}],subtotalCents:28656,totalCents:28656,taxCents:null,deliveryCents:0,otherFeesCents:null,orderDiscountCents:null,uncertainties:['Total amount matches subtotal, but no tax or fees are listed.']};
 assert.deepEqual(normalize(r).uncertainties,[]);
 assert.equal(normalize({...r,totalCents:28657}).uncertainties.length,1);
 assert.equal(normalize({...r,items:[]}).uncertainties.length,1);
 assert.deepEqual(normalize({...r,uncertainties:['Two receipts have different totals.']}).uncertainties,['Two receipts have different totals.']);
 const unconfirmed={...r,paidAmountCents:null,uncertainties:['The total amount charged is not explicitly stated as paid; it is inferred from the order confirmation.']};
 assert.deepEqual(normalize(unconfirmed).uncertainties,[]);
 assert.equal(normalize(unconfirmed).paidAmountCents,null);
 assert.equal(normalize({...unconfirmed,totalCents:28657}).uncertainties.length,1);
 assert.equal(normalize({...unconfirmed,documentKind:'receipt'}).uncertainties.length,1);
 const free={description:'Free event',netCents:0,itemTaxCents:0,evidence:'$0.00 USD'};
 const paid={...r,documentKind:'receipt',items:[{netCents:10000},{netCents:2500},{netCents:438},free],subtotalCents:12938,totalCents:12938,paidAmountCents:12938,uncertainties:['Total amount matches the payment but lacks detailed tax or discount breakdown.']};
 assert.equal(normalize(paid).items.length,3);
 assert.deepEqual(normalize(paid).zeroPriceItems,[free]);
 assert.deepEqual(normalize(paid).uncertainties,[]);
 assert.equal(normalize({...paid,totalCents:12939}).uncertainties.length,1);
 assert.equal(normalize({...paid,items:[free]}).items.length,1);
 assert.equal(normalize({...paid,items:[{netCents:12938},{...free,evidence:'unreadable'}]}).uncertainties.length,1);
 assert.equal(normalize({...paid,items:[{netCents:12938},{...free,itemTaxCents:1}]}).uncertainties.length,1);
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
 const followups=drafts.replies.nodes.filter(n=>n.parameters.sendTo);
 assert.equal(followups.length,4);
 assert.ok(followups.every(n=>n.parameters.sendTo==='jeff.duff@pinotspalette.com'&&n.parameters.subject.includes('Receipt question')));
});

test('location suppression runs after metadata initialization and preserves genuine questions',async()=>{
 const scope={...mailboxScope(registry,registry.studios[2].mailbox),useSharedCoa:true};
 const make=field=>({companyId:scope.scopeId,receiptKey:scope.scopeId+':0123456789abcdef',reviewKey:'a'.repeat(64),lineId:'0',itemDescription:'Unclear item',amountCents:100,sourceUrl:'https://mail.google.com/mail/#all/0123456789abcdef',question:'Question\n[RECEIPT-QUESTION-V1]'+JSON.stringify({version:1,companyId:scope.scopeId,receiptKey:scope.scopeId+':0123456789abcdef',field,itemIndex:0})});
 const run=async field=>{const row={json:make(field)};return new AsyncFunction('$','$input',drafts.questions.nodes.find(n=>n.name==='Code in JavaScript').parameters.jsCode)(lookup(scope),{first:()=>row,all:()=>[row]});};
 assert.deepEqual(await run('studioEvidence'),[]);
 assert.deepEqual(await run('reference'),[]);
 assert.deepEqual(await run('orderDiscountCents'),[]);
 assert.deepEqual(await run('verifyReceipt'),[]);
 assert.equal((await run('category'))[0].json.status,'delivery_pending');
});

test('completed and non-receipt messages never enter the question backlog',async()=>{
 const scope={...mailboxScope(registry,registry.studios[2].mailbox),useSharedCoa:true};
 const rows=['prepared_for_review','excluded_non_receipt','needs_review'].map((status,i)=>({json:{sourceMessageId:String(i+1).padStart(16,'0'),status}}));
 const context={'Read Persisted Receipt Answers':[],'Batch - Trusted Review Configuration':[{json:{messages:rows.map(i=>({id:i.json.sourceMessageId,text:'',subject:''}))}}],'Batch - Read Extraction Cache':[],'Batch - Prepare and Hold Exceptions':rows};
 const lookup=n=>({first:()=>({json:n==='Mailbox Context'?{mailboxContext:scope}:{context}})});
 const out=await new AsyncFunction('$',drafts.coordinator.nodes.find(n=>n.name==='Plan Genuine Questions').parameters.jsCode)(lookup);
 assert.deepEqual(out[0].json.questions,[]);
 assert.deepEqual(out[0].json.awaitingExtraction,[scope.scopeId+':'+rows[2].json.sourceMessageId]);
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
 assert.deepEqual(output[0].json.rules.rules.map(r=>r.id),['general',...require('./shared-owner-rules.json').filter(r=>!r.studios||r.studios.includes(scope.studio)).map(r=>r.id)]);
 assert.equal(output[0].json.rules.accounts.actualLiquor.id,'215');
 assert.equal(output[0].json.rules.accounts.actualLiquor.name,'Liquor Inventory');
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

test('calendar companion does not block a receipt PDF, but other unsupported files remain held',()=>{
 const js=drafts.extraction.nodes.find(n=>n.name==='Backlog - Select Real Attachments').parameters.jsCode;
 const fn=js.slice(js.indexOf('function gmailSource'),js.indexOf('function extractionRequest'));
 const parse=new Function(fn+'return gmailSource;')();
 const part=(filename,mimeType)=>({filename,mimeType,headers:[{name:'Content-Disposition',value:'attachment'}],body:{size:100,attachmentId:'attachment'}});
 const source={id:'1a0018714e2ede07',payload:{parts:[part('event.ics','text/calendar'),part('receipt.pdf','application/pdf')]}};
 assert.deepEqual(parse(source).attachments.map(a=>a.filename),['receipt.pdf']);
 source.payload.parts.push(part('details.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
 assert.equal(parse(source).attachments.find(a=>a.filename==='details.xlsx').supported,false);
 source.payload.parts.push(part('receipt.ics','application/octet-stream'));
 assert.equal(parse(source).attachments.find(a=>a.filename==='receipt.ics').supported,false);
});

test('attachment-only emails enter extraction while completed cache and unrelated holds do not',async()=>{
 const scope={...mailboxScope(registry,registry.studios[1].mailbox),useSharedCoa:true};
 const js=drafts.review.nodes.find(n=>n.name==='Choose Unread Receipts').parameters.jsCode;
 const rows=[{sourceMessageId:'a',status:'needs_review',reason:'Receipt body is empty; inspect original attachments before asking for a COA'},{sourceMessageId:'b',status:'needs_review',reason:'Needs COA clarification: purpose'},{sourceMessageId:'c',status:'needs_review',reason:'Receipt body is empty; inspect original attachments before asking for a COA'}];
 rows.unshift({sourceMessageId:'failed',status:'needs_review',reason:'Receipt format requires extraction'});
 const values={'Mailbox Context':[{json:{mailboxContext:scope}}],'Batch - Read Extraction Cache':[{json:{status:'complete',sourceMessageId:'c'}}],'Read Historic Extraction Cache':[], 'Read New Extraction Cache':[{json:{status:'failed',sourceMessageId:'failed'}},{json:{status:'available'}}]};
 const result=await new AsyncFunction('$','$input',js)(n=>({all:()=>values[n],first:()=>values[n][0]}),{all:()=>rows.map(json=>({json}))});
 assert.deepEqual(result.map(i=>i.json.sourceMessageId),['a']);
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

test('TD text reader uses mailbox studio with balanced known items, rejecting mismatches',async()=>{
 const scope={...mailboxScope(registry,registry.studios[2].mailbox),useSharedCoa:true};
 const js=drafts.review.nodes.find(n=>n.name==='First Receipt Review').parameters.jsCode;
 const prefix=js.slice(0,js.indexOf('const data=$("Batch - Trusted Review Configuration")'));
 const parse=await new AsyncFunction('$',prefix+'return parseTd;})();return result;')(lookup(scope));
 const c=await config(scope),rule=require('./scoped-runtime.cjs').scopeReceiptConfig(c,scope).tdRule;
 const m={id:'testmail',subject:'FW: Order #TAS12345 confirmed',text:'From: TD ART SUPPLY <store+26326730@t.shopifyemail.com>\nSent: Monday, November 2, 2026 9:00 AM\nOrder #TAS12345\nOrder summary\n16 x 20" Value Canvas x × 2\n$95.52\nSubtotal\n$95.52\nShipping\n$0.00\nTotal\n$95.52 USD\nShipping address\nShort North\nBilling address\nGilbert\nShipping method\nFedEx'};
 assert.equal(parse(m,rule)?.totalCents,9552);
 assert.equal(parse({...m,text:m.text.replace('Total\n$95.52','Total\n$95.53')},rule),null);
 assert.equal(parse({...m,text:m.text.replace('16 x 20" Value Canvas x','Unknown item')},rule),null);
 assert.equal(parse({...m,text:m.text.replace('TD ART SUPPLY','UNKNOWN VENDOR')},rule),null);
});
