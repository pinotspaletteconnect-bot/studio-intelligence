'use strict';
// Source facts visually verified from the original; no expense account inferred.
const facts=[{mailbox:'stellaseaselempirereceipts@gmail.com',companyId:'receipt-mail-stellaseaselempirereceipts',sourceMessageId:'19fcdbf51d81f5f1',vendor:'US Bank',date:'2026-08-04',reference:'0043 09290 0002',totalCents:58600,filename:'US Bank 8.4.26.jpg',mimeType:'image/jpeg',size:45329,kind:'bank_deposit',note:'Original U.S. Bank official receipt says Deposit, $586.00, August 4, 2026. This is supporting bank evidence, not an expense receipt. No expense COA split is applicable. The source of deposited funds has not been inferred.'}];
function supportingFact(r,registry){
 const files=(r.sourceAttachment||r.originalAttachment)?.files;
 return registry.find(f=>r.recordKind==='supporting_bank_document'&&r.companyId===f.companyId&&r.sourceMessageId===f.sourceMessageId&&r.vendor===f.vendor&&(r.extractedDate||r.date)===f.date&&r.reference===f.reference&&r.totalCents===f.totalCents&&r.ruleVersion==='reviewed-supporting-document-v1'&&Array.isArray(files)&&files.length===1&&['filename','mimeType','size'].every(k=>files[0][k]===f[k])&&!(r.allocationLines||r.lines||[]).length);
}
function prepareSupportingDocument(message,cache,scope,registry){
 const f=registry.find(f=>f.mailbox===scope.mailbox&&f.sourceMessageId===message.id);
 if(!f||cache?.source?.mailbox!==f.mailbox||cache.source.sourceMessageId!==f.sourceMessageId||cache.receipt?.vendor!==f.vendor||cache.receipt.reference!==f.reference||cache.receipt.date!==f.date||cache.receipt.totalCents!==f.totalCents||cache.source.attachments?.length!==1||!['filename','mimeType','size'].every(k=>cache.source.attachments[0][k]===f[k]))return null;
 return {json:{sourceMessageId:f.sourceMessageId,companyId:f.companyId,subject:message.subject||'',vendor:f.vendor,reference:f.reference,totalCents:f.totalCents,extractedDate:f.date,confirmedStudio:scope.studio,status:'prepared_for_review',recordKind:'supporting_bank_document',ruleVersion:'reviewed-supporting-document-v1',allocationLines:[],evidenceReady:true,postingAllowed:false,archiveAllowed:false,uploadAllowed:false,summaryRequest:{message:{id:f.sourceMessageId,date:f.date,text:f.note},context:{companyId:f.companyId}},sourceReviewNote:f.note,sourceAttachment:{kind:'pdf_bundle_v1',files:[{filename:f.filename,mimeType:f.mimeType,size:f.size}]},sourceRequest:{message:{id:f.sourceMessageId,subject:message.subject||'',date:f.date,text:f.note},context:{companyId:f.companyId}}}};
}
function supportingCode(js,key){
 if(!['review','documents','archive'].includes(key))return js;
 js='const SUPPORTING_FACTS='+JSON.stringify(facts)+';\n'+supportingFact.toString()+'\n'+prepareSupportingDocument.toString()+'\n'+js;
 if(key==='review')return js.replace('const multi=reviewMultiOrder(',"const supporting=prepareSupportingDocument(m,config.extractionCache?.[id],MB,SUPPORTING_FACTS);if(supporting)return supporting;const multi=reviewMultiOrder(")
  .replace('function addExtractionEvidence(item, cache) {',"function addExtractionEvidence(item, cache) {if(item.json.recordKind==='supporting_bank_document'){if(!supportingFact(item.json,SUPPORTING_FACTS))throw Error('Unverified supporting document');return item;}");
 if(key==='documents')return js.replace("const ready=receipt.status==='prepared_for_review',lines=summaryLines(receipt.allocationLines);","const ready=receipt.status==='prepared_for_review',lines=summaryLines(receipt.allocationLines);const supporting=!!supportingFact(receipt,SUPPORTING_FACTS);if(receipt.recordKind==='supporting_bank_document'&&!supporting)throw Error('Unverified supporting document');")
  .replace('if(ready&&(!lines.length','if(ready&&!supporting&&(!lines.length')
  .replace("...(receipt.recordKind==='multi_order_evidence_bundle'?", "...(supporting?{recordKind:receipt.recordKind}:{}),...(receipt.recordKind==='multi_order_evidence_bundle'?")
  .replace("if(payload.status==='prepared_for_review'){", "if(payload.recordKind==='supporting_bank_document'){const fact=supportingFact(payload,SUPPORTING_FACTS);if(!fact)throw Error('Unverified supporting summary');text[0]='SUPPORTING BANK DOCUMENT';text.push('NO EXPENSE COA SPLIT',fact.note,'Deposit amount: '+money(fact.totalCents),'Reference: '+fact.reference,'');}else if(payload.status==='prepared_for_review'){");
 return js.replace("if(r.status!=='prepared_for_review')throw Error('Receipt is not fully reviewed');", "if(r.status!=='prepared_for_review')throw Error('Receipt is not fully reviewed');if(r.recordKind==='supporting_bank_document'){if(!supportingFact(r,SUPPORTING_FACTS)||!/^[a-f0-9]{64}$/.test(r.summaryFingerprint||''))throw Error('Unverified supporting bank document');return true;}")
  .replace("kind==='source'?'Original':'COA Summary'", "kind==='source'?'Original':receipt.recordKind==='supporting_bank_document'?'Supporting Summary':'COA Summary'");
}
module.exports={facts,supportingFact,prepareSupportingDocument,supportingCode};
