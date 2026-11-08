'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {routeStudioGmail}=require('./route-studio-gmail.cjs');
const {mailboxScope}=require('./mailbox-scope.cjs');
const registry=require('./receipt-studio-mailboxes.json');
const scopes=registry.studios.map(s=>({...mailboxScope(registry,s.mailbox),useSharedCoa:registry.useSharedCoa===true}));
const {scopeReceiptRules,scopeReceiptConfig}=require('./scoped-runtime.cjs');
const {selectApprovedTicket}=require('./approved-budget.cjs');
const {addExtractionPreflight}=require('./extraction-preflight.cjs');
const SHARED_RULES=require('./shared-owner-rules.json');
const SHARED_ACCOUNTS=require('./shared-owner-accounts.json');
const {currentSharedCategory,sharedSavedCategory}=require('./shared-answer-policy.cjs');
const {supportOriginalPhotos}=require('./original-photo-support.cjs');
const {isolateDocumentCalls}=require('./document-handoff.cjs');
const {correctReviewedHeidelberg}=require('./receipt-source-repairs.cjs');
const {correctZemBrushOrder}=require('./receipt-source-repairs.cjs');
const {correctReviewedKroger}=require('./reviewed-kroger.cjs');
const {correctReviewedPlumbing}=require('./reviewed-plumbing.cjs');
const {correctReviewedNorthVernon,correctFishCleaningPayment,correctCanvasDepotPayment,correctBlickUnitAmounts,correctGoogleOneTaxes,correctReviewedAutojateDiscount,correctShippoPayment,correctReviewedCintas,correctOutshineServicePayment}=require('./receipt-source-repairs.cjs');
const edge=n=>({main:[[{node:n,type:'main',index:0}]]});
const code=(name,jsCode,position=[0,0])=>({id:randomUUID(),name,type:'n8n-nodes-base.code',typeVersion:2,position,parameters:{jsCode}});

function addMailboxContext(w) {
 const trigger=w.nodes.find(n=>n.type==='n8n-nodes-base.executeWorkflowTrigger');
 if(!trigger)throw Error('Helper input not found: '+w.id);
 const context=code('Mailbox Context',`const input=$input.first().json;const scopes=${JSON.stringify(scopes)};const requested=input.mailboxContext||input.context?.mailboxContext;const mailbox=requested?.mailbox||${JSON.stringify(scopes[0].mailbox)};const scope=scopes.find(s=>s.mailbox===mailbox);if(!scope)throw Error('Unknown receipt mailbox');if(requested&&requested.studio&&requested.studio!==scope.studio)throw Error('Studio mailbox mismatch');return $input.all().map(i=>({...i,json:{...i.json,mailboxContext:scope}}));`,[trigger.position[0]+200,trigger.position[1]]);
 const outgoing=w.connections[trigger.name];
 w.connections[trigger.name]=edge(context.name);w.connections[context.name]=outgoing;
 w.nodes.push(context);
 return w;
}

function scopedCode(js, name, key) {
 if(key==='review'&&name==='Choose Unread Receipts')js=js.replace('const rows=$input.all()',"for(const i of [...$('Read Historic Extraction Cache').all(),...$('Read New Extraction Cache').all()])if(['complete','failed','reserved'].includes(i.json.status)&&i.json.sourceMessageId)cached.add(i.json.sourceMessageId);const rows=$input.all()");
 if(key==='review')js=correctReviewedPlumbing.toString()+'\n'+correctReviewedKroger.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctReviewedKroger(correctReviewedPlumbing(cache));');
 js=supportOriginalPhotos(js,key,name);
 if(key==='review')js=correctZemBrushOrder.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctZemBrushOrder(cache);');
 if(key==='review')js=correctReviewedHeidelberg.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctReviewedHeidelberg(cache);');
 if(key==='review')js=correctReviewedNorthVernon.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctReviewedNorthVernon(cache);');
 if(key==='review')js=correctFishCleaningPayment.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctFishCleaningPayment(cache);');
 if(key==='review')js=correctCanvasDepotPayment.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctCanvasDepotPayment(cache);');
 if(key==='review')js=currentSharedCategory.toString()+'\n'+sharedSavedCategory.toString()+'\n'+js
   .replace('mapping:owner.mappings[i]||classifyItem(', 'mapping:currentSharedCategory(vendor,item.description,rules)||owner.mappings[i]||sharedSavedCategory(item.description,clarificationRows,rules,{questionMetadata,latestOwnerAnswer,knownOwnerCategory})||classifyItem(')
   .replace('const unknown=mapped.filter(l=>!l.mapping);','for(const line of mapped)if(line.mapping?.sharedOwnerAnswer)owner.provenance.push({...line.mapping.sharedOwnerAnswer,field:"category",lineId:line.lineId,value:{accountId:line.mapping.accountId,accountName:line.mapping.accountName}});\n  const unknown=mapped.filter(l=>!l.mapping);');
 if(key==='review')js=correctOutshineServicePayment.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctOutshineServicePayment(cache);');
 if(key==='review')js=correctReviewedCintas.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctReviewedCintas(cache);');
 if(key==='review')js=js.replace("accountId:value.accountId}};", `accountId:value.accountId}};
      if(/^these are all under cintas[.!]?$/i.test(answer.answer.trim())&&/^Cintas$/i.test(r.vendor)&&value.accountId==='229')r.items.forEach((line,index)=>{
        mappings[index]={...value,companyId:rules.companyId,approved:true,active:true,ruleId:'owner:'+row.reviewKey,
          ownerDecision:{...p,lineId:String(index),description:line.description,accountId:value.accountId,scope:'all lines of this exact Cintas receipt'}};
      });`);
 js=js.replace("phone:['phone'", "cintas:['these are all under cintas'],marketing:['marketing'],staffEvents:['staff enrichment'],phone:['phone'");
 if(key==='review')js=correctShippoPayment.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctShippoPayment(cache);');
 if(key==='review')js=js.replace('source.includes(normalized(l.evidence))',`source.includes(normalized(String(l.evidence).replace(/^["“]([\\s\\S]*)["”]$/, '$1')))`);
 js=js.replace("phone:['phone'", "shipping:['shipping and postage','postage and shipping','all shippos are shipping and postage'],projectPet:['special class cogs','special products cogs'],special:['special product inventory'],phone:['phone'");
 // Calendar invitations accompany payment receipts but are not receipt images.
 // Ignore only the explicit calendar MIME/extension pair; other unsupported
 // attachments still require inspection before any extraction allowance is used.
 if(key==='extraction')js=js.replace("if(mime==='application/pdf'||actualAttachment) attachments.push({", "if((mime==='application/pdf'||actualAttachment)&&!(mime==='text/calendar'&&/\\.ics$/i.test(part.filename))) attachments.push({");
 if(key==='review')js=js.replace("['needs_answer','answered_pending_account_verification'].includes(row.status)","['needs_answer','answered_pending_account_verification','followup_delivery_pending'].includes(row.status)");
 if(key==='review')js=correctReviewedAutojateDiscount.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctReviewedAutojateDiscount(cache);');
 js=js.replace("plumbing:['plumbing repair'],subscriptions:['subscriptions']", "plumbing:['plumbing repair'],subscriptions:['subscriptions'],maintenance:['pest control','window cleaning','this is for window cleaning'],software:['software','software subscription']");
 if(key==='review')js=correctGoogleOneTaxes.toString()+'\n'+js.replace('if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;','if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctGoogleOneTaxes(cache);');
 if(key==='documents')js=js.replaceAll('plain-instructions-v2','bold-instructions-v3');
 if(key==='review')js=correctBlickUnitAmounts.toString()+'\n'+js.replace("if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;","if(!cache||cache.source?.sourceMessageId!==message.id||!cache.receipt)return null;cache=correctBlickUnitAmounts(cache);").replaceAll('cache.reviewedPdfEvidence?.note||null','cache.reviewedPdfEvidence?.note||cache.sourceRepair?.note||null');
 if(key==='review'&&name==='Choose Unread Receipts')js=js.replace("/requires extraction/.test(r.reason||'')", "/requires extraction|Receipt body is empty; inspect original attachments/.test(r.reason||'')");
 if(key==='review')js=js.replace("function workingConfirmation(receipt) {",`function workingConfirmation(receipt) { {
  // Explicitly free lines remain in the original document but do not need an
  // expense allocation. Unknown amounts and negative adjustments stay held.
  const free=i=>i.netCents===0&&typeof i.description==='string'&&i.description.trim()&&/^\\s*\\$0\\.00(?: USD)?\\s*$/.test(i.evidence||'')&&(i.itemTaxCents==null||i.itemTaxCents===0);
  if(Array.isArray(receipt.items)&&receipt.items.some(free)&&receipt.items.some(i=>Number.isSafeInteger(i.netCents)&&i.netCents>0))receipt={...receipt,zeroPriceItems:receipt.items.filter(free),items:receipt.items.filter(i=>!free(i))};
  const ancillaryOnly=new Set(['Total amount matches subtotal, but no tax or fees are listed.','Total amount matches subtotal, but no explicit tax or fees are listed.','No explicit tax or discount amounts provided.','Total amount and item details are consistent with the invoice, but tax and delivery fees are not specified.','Total amount matches the payment but lacks detailed tax or discount breakdown.']);
  const validItems=Array.isArray(receipt.items)&&receipt.items.length&&receipt.items.every(i=>Number.isSafeInteger(i.netCents)&&i.netCents>0);
  const net=validItems?receipt.items.reduce((s,i)=>s+i.netCents,0):null;
  const balanced=validItems&&net===receipt.subtotalCents&&net+(receipt.taxCents??0)+(receipt.deliveryCents??0)+(receipt.otherFeesCents??0)-(receipt.orderDiscountCents??0)===receipt.totalCents;
  if(balanced&&Array.isArray(receipt.uncertainties))receipt={...receipt,uncertainties:receipt.uncertainties.filter(s=>!ancillaryOnly.has(s)&&!(receipt.documentKind==='order_confirmation'&&s==='The total amount charged is not explicitly stated as paid; it is inferred from the order confirmation.'))}; }
 `);
 if(key==='coordinator'&&name==='Plan Genuine Questions')js=js
   .replace("if(r.status==='duplicate_in_batch'||", "if(r.status!=='needs_review'||")
   .replace('sources.filter(m=>!cache[m.id]', 'sources.filter(m=>$(\'Collect File Results\').first().json.context["Batch - Prepare and Hold Exceptions"].some(i=>i.json.sourceMessageId===m.id&&i.json.status===\'needs_review\')&&!cache[m.id]');
 if(key==='review')js=js.replaceAll('.includes(row.approvalId)', '.concat('+JSON.stringify([...Array.from({length:166},(_,i)=>'receipt-studios-20261108-usd5-'+String(i+1).padStart(3,'0')),...Array.from({length:50},(_,i)=>'receipt-reconciled-20261108-cap10-'+String(i+1).padStart(3,'0'))])+').includes(row.approvalId)');
 js=js.replace('function receiptAddressEvidence(receipt,message,owner){',"function receiptAddressEvidence(receipt,message,owner){ return {...receipt,printedStudioEvidence:receipt.printedStudioEvidence||receipt.studioEvidence||'',studioEvidence:'Owner-assigned receipt inbox: '+MB.studio};");
 js=js.replace("if(!/\\b(?:Gilbert|85295)\\b/i.test(r.studioEvidence||''))add('studioEvidence','Was this expense for Gilbert? Reply Gilbert or explain the correct studio.',r.studioEvidence);",'');
 js=js.replace("if(!studioFromEvidence(r.studioEvidence))add('studioEvidence','Which studio should receive this expense? Reply Gilbert, St. Matthews, Short North, or Jeffersonville.',r.studioEvidence);",'');
 // Printed facts and extraction failures require source review, not a repeated
 // owner questionnaire. Ask only for genuinely missing business purpose/context.
 if(key==='questions'&&name==='Code in JavaScript')js=js.replace('const incoming=$input.first().json;',"const incoming=$input.first().json;\nconst questionMeta=questionMetadata(incoming),questionField=questionMeta?.field;if(questionField&&!['category','ownerContext'].includes(questionField))return [];if(questionField==='category'&&SHARED_RULES.some(r=>r.id.startsWith('td-')&&new RegExp(r.pattern,'i').test(String(questionMeta.observed||''))))return [];");
 if(key==='extraction'&&name==='Backlog - Eligible Allowances')
  js=selectApprovedTicket.toString()+"\nconst ticket=selectApprovedTicket($input.all().map(i=>i.json),$('Verify Legacy Budget').all().map(i=>i.json),$('Helper Input').first().json.sourceMessageId);return ticket?[{json:ticket}]:[];";
 if(key==='extraction')js=js.replaceAll('maximumApprovalUSD:5','maximumApprovalUSD:10');
 if(key==='extraction')js=js.replace('tokens.input_tokens>APPROVAL.contextTokens','Math.ceil(tokens.input_tokens*APPROVAL.inputMicrousdPerToken+tokens.output_tokens*APPROVAL.outputMicrousdPerToken)>APPROVAL.reservationMicrousd');
 // Cover rule JSON embedded as arguments as well as declarations, without
 // changing the historical company recorded inside owner provenance.
 const edits=[];
 for(const match of js.matchAll(/\{"version"/g)) {
   let depth=0,quoted=false,escaped=false,end=match.index;
   for(;end<js.length;end++) {
     const c=js[end];
     if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
     if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end++;break;}
   }
   const literal=js.slice(match.index,end);let value;
   try{value=JSON.parse(literal);}catch{continue;}
   if(value.companyId&&value.accounts&&Array.isArray(value.rules))edits.push({start:match.index,end,literal});
 }
 for(const e of edits.reverse())js=js.slice(0,e.start)+'scopeReceiptRules('+e.literal+',MB)'+js.slice(e.end);
 js=js.replace('function prepareBatch(items, config) {','function prepareBatch(items, config) {\n config=scopeReceiptConfig(config,MB);');
 if(key==='review') {
   js=require('./text-receipt-cache.cjs').canvasDepotTextCache.toString()+'\n'+js.replace('ownerSourceCache(m,config.clarificationRows||[],config.approvedRules):null;','(ownerSourceCache(m,config.clarificationRows||[],config.approvedRules)||canvasDepotTextCache(m,MB)):null;');
   js=require('./receipt-source-repairs.cjs').correctReviewedTarget.toString()+'\n'+js.replace('const owner=applyOwnerClarifications(message,cache,clarificationRows,rules);','cache=correctReviewedTarget(cache);const owner=applyOwnerClarifications(message,cache,clarificationRows,rules);');
   // Evidence must see the same reviewed source facts as categorization.
   // Otherwise a repaired reference causes addExtractionEvidence to return
   // early and drops the original attachment manifest before archiving.
   js=js.replace('function addExtractionEvidence(item, cache) {', 'function addExtractionEvidence(item, cache) {\n if(cache)cache=correctReviewedTarget(correctBlickUnitAmounts(correctGoogleOneTaxes(correctReviewedAutojateDiscount(correctShippoPayment(correctReviewedCintas(correctOutshineServicePayment(correctCanvasDepotPayment(correctFishCleaningPayment(correctReviewedNorthVernon(correctReviewedHeidelberg(correctZemBrushOrder(correctReviewedKroger(correctReviewedPlumbing(cache))))))))))))));');
   js=require('./non-receipt-mail.cjs').isSavedSearchPromotion.toString()+'\n'+js.replace("if (!id) return hold('Missing message identity');", "if (!id) return hold('Missing message identity');if(isSavedSearchPromotion(m))return {json:{...base,status:'excluded_non_receipt',reason:'Saved-search marketing email; no receipt processed or archived'}};");
   js=js.replace("if (!id) return hold('Missing message identity');", "if (!id) return hold('Missing message identity');if(/^(?:Welcome to Google on your .+|Security alert|2-Step Verification (?:turned on|turned off))$/i.test(m.subject||''))return {json:{...base,status:'excluded_non_receipt',reason:'Google account notification'}};");
   js=js.replace('(config.approvedRules ? parseApproved(m,config.approvedRules) : null)',"(MB.studio==='Gilbert'&&config.approvedRules ? parseApproved(m,config.approvedRules) : null)")
     .replace(' || !shippingAddress.includes(rule.shippingMarker) || !billingAddress.includes(rule.billingMarker)', " || (MB.studio==='Gilbert'&&(!shippingAddress.includes(rule.shippingMarker)||!billingAddress.includes(rule.billingMarker)))")
     .replace('requiredText:[order[0],rule.shippingMarker,rule.billingMarker]',"requiredText:MB.studio==='Gilbert'?[order[0],rule.shippingMarker,rule.billingMarker]:[order[0],rule.vendorMarker]")
     .replace('if(rules.length!==1)return null;',"if(!rules.length||new Set(rules.map(r=>r.accountId+'|'+r.accountName)).size!==1)return null;")
     .replace("confirmedStudio:r.confirmedStudio||'Gilbert'","confirmedStudio:r.confirmedStudio||MB.studio")
     .replace('if(!studios.length)return receipt;',"if(!studios.length)return !String(receipt.studioEvidence||'').trim()?{...receipt,studioEvidence:'Owner-assigned receipt inbox: '+MB.studio}:receipt;");
 }
 // These are historical corrections, not shared product classification rules.
 js=js.replace('function applyReviewedReceiptFacts(cache,ownerProvenance=[]) {',"function applyReviewedReceiptFacts(cache,ownerProvenance=[]) { if(MB.studio!=='Gilbert')return cache;")
   .replace('function correctReviewedPdf(cache){',"function correctReviewedPdf(cache){ if(MB.studio!=='Gilbert')return null;")
   .replace('function reviewedPartialDuplicate(receipt,message,config){',"function reviewedPartialDuplicate(receipt,message,config){ if(MB.studio!=='Gilbert')return null;")
   .replace('function reviewMultiOrder(message,config,snapshot,decision){',"function reviewMultiOrder(message,config,snapshot,decision){ if(MB.studio!=='Gilbert')return null;");
 if(key==='archive') {
   js=js.replaceAll(JSON.stringify(scopes[0].mailbox),'MB.mailbox')
     .replaceAll("'"+scopes[0].mailbox+"'",'MB.mailbox');
   js=js.replace("const identity=['re1',", "const identity=[MB.studio==='Gilbert'?'re1':'re1m'+"+JSON.stringify(scopes.map(s=>s.mailbox))+".indexOf(MB.mailbox),");
 }
 if(key==='replies'&&name==='Bind Exact Original Question')
   js=js.replace("!/^crashseaselempirereceipts@gmail\\.com$/i.test((header(parent,'from').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/i)||[])[0]||'')","((header(parent,'from').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/i)||[])[0]||'').toLowerCase()!==MB.mailbox");
 if(key==='questions'&&name==='Code in JavaScript')
   js=js.replace('r.companyId!=="9130357828229216"','r.companyId!==MB.scopeId')
     .replace("!/^9130357828229216:[a-f0-9]{16}$/.test(r.receiptKey||'')","!(String(r.receiptKey||'').startsWith(MB.scopeId+':')&&/^[a-f0-9]{16}$/.test(String(r.receiptKey).slice(MB.scopeId.length+1)))");
 if(key==='extraction'&&name==='Backlog - Build Bounded Requests')
   js=js.replace('source:{...g.source,attachments:','source:{...g.source,mailbox:MB.mailbox,studio:MB.studio,attachments:');
 if(key==='extraction'&&name==='Backlog - Select Real Attachments')
   js="const notice=$input.first().json;const h=notice.payload?.headers||[];const subject=h.find(x=>x.name.toLowerCase()==='subject')?.value||notice.subject||'';const from=h.find(x=>x.name.toLowerCase()==='from')?.value||'';if(/no-reply@(?:accounts\\.)?google\\.com/i.test(from)&&/^(?:Welcome to Google on your .+|Security alert|2-Step Verification (?:turned on|turned off))$/i.test(subject))return [];\n"+js;
 // Common staging documents remain in the existing staging folder. Names
 // include the mailbox namespace so a same-ID message cannot reuse its peer.
 if(['documents','archive'].includes(key)) {
   js=js.replaceAll("'receipt-'+", "('receipt-'+(MB.studio==='Gilbert'?'':MB.scopeId+'-'))+")
     .replaceAll('`receipt-${',"`receipt-${MB.studio==='Gilbert'?'':MB.scopeId+'-'}${");
 }
 js=require('./reviewed-supporting-documents.cjs').supportingCode(js,key);
 let after='';
 if(key==='review'&&name==='Choose Unread Receipts')
   after+=`const available=$('Read New Extraction Cache').all().filter(i=>i.json.status==='available').length;result=result.filter(i=>i.json.sourceMessageId).slice(0,Math.min(25,available));if(!result.length)result=[{json:{sourceMessageId:null,extractionDeferred:true}}];`;
 if(key==='review'&&['Batch - Read Extraction Cache','Current Extraction Cache'].includes(name))
   after+=`result=result.filter(i=>{if(!i.json.resultJson)return false;let r;try{r=JSON.parse(i.json.resultJson);}catch{return false;}return (r.source?.mailbox||${JSON.stringify(scopes[0].mailbox)})===MB.mailbox;});if(!result.length)result=[{json:{status:'no_extraction_cache'}}];`;
 if(key==='review'&&name==='Batch - Trusted Review Configuration')
   after+='result=result.map(i=>({...i,json:{...i.json,config:scopeReceiptConfig(i.json.config,MB)}}));';
 if(key==='coordinator'&&name==='Receipt Email Run Result')
   after+=`const review=$('Read Receipts and Apply Saved Answers').first().json;const rows=review.context?.['Batch - Prepare and Hold Exceptions']||[];const reviewCounts={};for(const i of rows){const status=i.json.status||'unknown';reviewCounts[status]=(reviewCounts[status]||0)+1;}const awaitingExtraction=$('Plan Genuine Questions').first().json.awaitingExtraction||[];result=result.map(i=>({...i,json:{...i.json,reviewCounts,awaitingExtraction}}));`;
 return `const MB=$('Mailbox Context').first().json.mailboxContext;\nconst SHARED_RULES=${JSON.stringify(SHARED_RULES)};\nconst SHARED_ACCOUNTS=${JSON.stringify(SHARED_ACCOUNTS)};\n${scopeReceiptRules.toString()}\n${scopeReceiptConfig.toString()}\nlet result=await(async()=>{\n${js}\n})();\n${after}\nreturn result.map(i=>({...i,json:{...i.json,mailboxContext:MB,...(i.json.context?{context:{...i.json.context,mailboxContext:MB}}:{})}}));`;
}

function scopeHelperCode(w,key) {
 if(key==='review')for(const n of w.nodes.filter(n=>n.type==='n8n-nodes-base.gmail'&&n.parameters.operation==='getAll')) {
  n.parameters.returnAll=false;n.parameters.limit=250;
 }
 // Explicit columns prevent routing context objects from entering scalar tables.
 for(const n of w.nodes)if(n.type==='n8n-nodes-base.dataTable'&&n.parameters.columns?.mappingMode==='autoMapInputData') {
  const c=n.parameters.columns;c.mappingMode='defineBelow';
  c.value=Object.fromEntries(c.schema.filter(s=>!s.readOnly&&!s.removed).map(s=>[s.id,'={{ $json['+JSON.stringify(s.id)+'] ?? "" }}']));
 }
 for(const n of w.nodes)if(n.parameters?.jsCode&&n.name!=='Mailbox Context')n.parameters.jsCode=scopedCode(n.parameters.jsCode,n.name,key);
 for(const original of w.nodes.filter(n=>n.type==='n8n-nodes-base.gmailTrigger')) {
   const eventOutput=w.connections[original.name],manualOutput=w.connections['Mailbox Context'];
   const gate={id:randomUUID(),name:'Reply Event or Scheduled Check',type:'n8n-nodes-base.if',typeVersion:2.2,position:[420,0],parameters:{conditions:{options:{caseSensitive:true,typeValidation:'strict',version:2},conditions:[{id:'event',leftValue:'={{ $json._receiptReplyEvent === true }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}}};
   w.nodes.push(gate);w.connections['Mailbox Context']=edge(gate.name);
   w.connections[gate.name]={main:[eventOutput.main[0],manualOutput.main[0]]};
   scopes.forEach((scope,i)=>{
     const trigger=i===0?original:{...structuredClone(original),id:randomUUID(),name:'When '+scope.studio+' Reply Arrives',position:[-300,i*200],credentials:{gmailOAuth2:{id:registry.studios[i].gmailCredentialId,name:registry.studios[i].credentialName}}};
     if(i)w.nodes.push(trigger);
     const bridge=code(trigger.name+' — Scope',`return $input.all().map(i=>({...i,json:{...i.json,_receiptReplyEvent:true,mailboxContext:${JSON.stringify(scope)}}}));`,[-100,i*200]);
     w.nodes.push(bridge);w.connections[trigger.name]=edge(bridge.name);w.connections[bridge.name]=edge('Mailbox Context');
   });
 }
 if(key==='documents')for(const n of w.nodes){
   // Rendering has no durable write or paid extraction side effect. Allow a
   // bounded retry when the existing PDF worker is temporarily occupied.
   if(n.name==='Batch - Render Documents')Object.assign(n,{retryOnFail:true,maxTries:4,waitBetweenTries:5000});
   const q=n.parameters?.queryParameters?.parameters?.find(p=>p.name==='q');
   if(q&&q.value.includes('1mKjkWl5pisd_aBiDTTNwi6LTm9eMNqK_')) {
     const base=q.value;
     q.value='={{ '+JSON.stringify(base)+' + ($(\'Mailbox Context\').first().json.mailboxContext.studio === \'Gilbert\' ? " and not name contains \'receipt-receipt-mail-\'" : " and name contains \'receipt-" + $(\'Mailbox Context\').first().json.mailboxContext.scopeId + "-\'") }}';
   }
 }
 if(key==='questions')for(const n of w.nodes.filter(n=>n.credentials?.gmailOAuth2&&n.parameters.sendTo))n.parameters.sendTo='jeff.duff@pinotspalette.com';
 if(key==='replies')for(const n of w.nodes.filter(n=>n.name==='Reply with Specific Question'))n.parameters={
  operation:'send',sendTo:'jeff.duff@pinotspalette.com',
  subject:"={{ '[QBO-REVIEW:' + $json.reviewKey + '] Receipt question' }}",
  emailType:'text',message:"={{ $json.followup + '\\n\\nOriginal source: ' + $json.sourceUrl }}",
  options:{appendAttribution:false,replyTo:scopes[0].mailbox}
 };
 // Every child call receives the studio even when its preceding API step
 // returned only remote response fields.
 for(const n of [...w.nodes].filter(n=>n.type==='n8n-nodes-base.executeWorkflow')) {
   const bind=code(n.name+' — Context',"const MB=$('Mailbox Context').first().json.mailboxContext;return $input.all().map(i=>({...i,json:{...i.json,mailboxContext:MB}}));",[n.position[0]-170,n.position[1]]);
   for(const c of Object.values(w.connections))for(const outputs of Object.values(c))for(const edges of outputs)for(const e of edges)if(e.node===n.name)e.node=bind.name;
   w.nodes.push(bind);w.connections[bind.name]=edge(n.name);
 }
 return w;
}

function coordinator(source) {
 const w=structuredClone(source),pipelineStart='Verify Receipt Account';
 const entry={id:randomUUID(),name:'Process One Studio',type:'n8n-nodes-base.executeWorkflowTrigger',typeVersion:1.1,position:[0,450],parameters:{inputSource:'passthrough'}};
 w.nodes.push(entry);w.connections[entry.name]=edge(pipelineStart);
 addMailboxContext(w);
 const by=name=>w.nodes.find(n=>n.name===name);
 by('Require Correct Account').parameters.jsCode="const MB=$('Mailbox Context').first().json.mailboxContext;if($json.emailAddress?.toLowerCase()!==MB.mailbox)throw Error('Wrong studio Gmail account');return [{json:{mailboxContext:MB}}];";
 by('Require Destination Access').parameters.jsCode+="";
 scopeHelperCode(w,'coordinator');
 const dispatch=code('Select Studio Inboxes',`return ${JSON.stringify(scopes)}.map(mailboxContext=>({json:{mailboxContext}}));`,[250,0]);
 const run={id:randomUUID(),name:'Process Studios Independently',type:'n8n-nodes-base.executeWorkflow',typeVersion:1.2,position:[500,0],parameters:{workflowId:{__rl:true,value:w.id,mode:'id'},mode:'each',options:{waitForSubWorkflow:true}},alwaysOutputData:true,onError:'continueRegularOutput'};
 const report=code('All Studio Results',`const expected=${JSON.stringify(scopes)};const items=$input.all();const studios=expected.map(scope=>{const hit=items.find(i=>i.json.mailboxContext?.mailbox===scope.mailbox);return hit?{studio:scope.studio,...hit.json}:{studio:scope.studio,status:'failed_or_incomplete',error:'No completed studio result; inspect the studio sub-execution'};});return [{json:{mode:'receipt_email_only',status:studios.some(s=>s.error||s.status==='failed_or_incomplete')?'needs_attention':'completed',studios,qboAccess:false}}];`,[750,0]);
 w.nodes.push(dispatch,run,report);w.connections[dispatch.name]=edge(run.name);w.connections[run.name]=edge(report.name);
 for(const n of w.nodes.filter(n=>['n8n-nodes-base.manualTrigger','n8n-nodes-base.scheduleTrigger'].includes(n.type)))w.connections[n.name]=edge(dispatch.name);
 w.name='Receipt Email — All Studios — 02';w.pinData={};
 return routeStudioGmail(isolateDocumentCalls(w,randomUUID),registry);
}

// This draft handles credential routing only. Review/cache/ledger scope and
// coordinator iteration must be completed before enabling another studio.
function draftHelpers(backups) {
 const out={};
 for(const key of ['review','questions','replies','documents','archive','extraction']) {
  const w=JSON.parse(fs.readFileSync(backups[key],'utf8'));
  const routed=routeStudioGmail(scopeHelperCode(addMailboxContext(w),key),registry);
  routed.pinData={};
  out[key]=key==='extraction'?addExtractionPreflight(routed,randomUUID):routed;
 }
 out.coordinator=coordinator(JSON.parse(fs.readFileSync(backups.coordinator,'utf8')));
 return out;
}

function validateDraft(w) {
 const names=new Set(w.nodes.map(n=>n.name));
 if(names.size!==w.nodes.length)throw Error('Duplicate node name');
 for(const [name,c]of Object.entries(w.connections)) {
  if(!names.has(name))throw Error('Unknown source '+name);
  for(const outputs of Object.values(c))for(const edges of outputs)for(const e of edges)
   if(!names.has(e.node))throw Error('Unknown destination '+e.node);
 }
 for(const n of w.nodes) {
  if(n.credentials?.gmailOAuth2&&!registry.studios.some(s=>s.gmailCredentialId===n.credentials.gmailOAuth2.id))throw Error('Unapproved Gmail credential');
  const url=n.parameters?.url||'';
  if(/quickbooks|qbo\.intuit|intuit\.com/i.test(url))throw Error('QBO request in receipt-only workflow');
  if(n.parameters?.jsCode)new Function('return async function(){'+n.parameters.jsCode+'}');
 }
 return true;
}

module.exports={addMailboxContext,scopedCode,scopeHelperCode,coordinator,draftHelpers,validateDraft};
if(require.main===module) {
 const backups=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const output=process.argv[3];fs.mkdirSync(output,{recursive:true});
 for(const [key,w]of Object.entries(draftHelpers(backups))) {
  validateDraft(w);fs.writeFileSync(path.join(output,key+'.json'),JSON.stringify(w,null,2));
  console.log(key+': '+w.nodes.length+' nodes; credential routing draft, NOT production-ready');
 }
}
