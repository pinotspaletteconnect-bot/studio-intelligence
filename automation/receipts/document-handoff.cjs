'use strict';
function collectDocumentResults(base, outputs) {
 const context={...base},errors=[];
 const expected=(base['Batch - Prepare and Hold Exceptions']||[]).filter(i=>i.json.sourceMessageId&&['prepared_for_review','needs_review'].includes(i.json.status));
 const returned=new Set();
 for(const out of outputs){
  if(out.error)errors.push(String(out.error.message||out.error));
  for(const i of out.context?.['Batch - Prepare and Hold Exceptions']||[])if(i.json.sourceMessageId)returned.add(i.json.sourceMessageId);
 }
 for(const i of expected)if(!returned.has(i.json.sourceMessageId))errors.push('Missing document helper result for '+i.json.sourceMessageId+'; leave source email in Inbox');
 context['Batch - Hash Current Summary']=outputs.flatMap(p=>p.context?.['Batch - Hash Current Summary']||[]);
 const files=outputs.flatMap(p=>(p.context?.['Batch - Refresh Verified Evidence']||[]).flatMap(i=>i.json.files||[]));
 context['Batch - Refresh Verified Evidence']=[{json:{files:[...new Map(files.map(f=>[f.id,f])).values()]}}];
 const receipts=context['Batch - Hash Current Summary'].filter(i=>i.json.status==='prepared_for_review').map(i=>i.json);
 return {context,receipts,documentErrors:errors};
}
function isolateDocumentCalls(w,makeId){
 const name='One Receipt Document at a Time',call=w.nodes.find(n=>n.name==='Preserve Receipt and Summary');
 if(!call)throw Error('Document helper call missing');
 call.parameters.mode='once';
 w.nodes.push({id:makeId(),name,type:'n8n-nodes-base.splitInBatches',typeVersion:3,position:[call.position[0]-350,call.position[1]+180],parameters:{batchSize:1,options:{}}});
 const edge=node=>({main:[[{node,type:'main',index:0}]]});
 w.connections['Process Each Receipt Independently']=edge(name);
 w.connections[name]={main:[[{node:'Collect File Results',type:'main',index:0}],[{node:'Preserve Receipt and Summary — Context',type:'main',index:0}]]};
 w.connections[call.name]=edge(name);
 const studioCall=w.nodes.find(n=>n.name==='Process Studios Independently');
 if(!studioCall)throw Error('Studio helper call missing');
 studioCall.parameters.mode='once';
 const studioLoop='One Studio at a Time';
 w.nodes.push({id:makeId(),name:studioLoop,type:'n8n-nodes-base.splitInBatches',typeVersion:3,position:[studioCall.position[0]-300,studioCall.position[1]+180],parameters:{batchSize:1,options:{}}});
 w.connections['Select Studio Inboxes']=edge(studioLoop);
 w.connections[studioLoop]={main:[[{node:'All Studio Results',type:'main',index:0}],[{node:studioCall.name,type:'main',index:0}]]};
 w.connections[studioCall.name]=edge(studioLoop);
 w.nodes.find(n=>n.name==='Collect File Results').parameters.jsCode=collectDocumentResults.toString()+"\nconst base=$('Read Receipts and Apply Saved Answers').first().json.context;return [{json:{...collectDocumentResults(base,$input.all().map(i=>i.json)),mailboxContext:$('Mailbox Context').first().json.mailboxContext}}];";
 const report=w.nodes.find(n=>n.name==='All Studio Results');
 report.parameters.jsCode=report.parameters.jsCode.replace("return hit?", "return hit&&hit.json.mode==='receipt_email_only'&&Array.isArray(hit.json.completed)&&Array.isArray(hit.json.documentIssues)&&hit.json.reviewCounts?");
 report.parameters.jsCode=report.parameters.jsCode.replace("s.error||s.status==='failed_or_incomplete'","s.error||s.documentIssues?.length||s.completionIssues?.length||s.status==='failed_or_incomplete'");
 report.parameters.jsCode=report.parameters.jsCode.replace("?'needs_attention':'completed'","?'needs_attention':studios.some(s=>s.reviewCounts?.needs_review||s.awaitingExtraction?.length)?'processed_with_holds':'completed'");
 return w;
}
module.exports={collectDocumentResults,isolateDocumentCalls};
