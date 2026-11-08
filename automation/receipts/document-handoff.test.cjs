const test=require('node:test'),assert=require('node:assert/strict');
const {collectDocumentResults}=require('./document-handoff.cjs');
const row=id=>({json:{sourceMessageId:id,status:'prepared_for_review'}});
test('one failed helper retains other verified results and reports the missing receipt',()=>{
 const base={'Batch - Prepare and Hold Exceptions':[row('a'),row('b')]};
 const out={context:{'Batch - Prepare and Hold Exceptions':[row('a')],'Batch - Hash Current Summary':[row('a')],'Batch - Refresh Verified Evidence':[{json:{files:[{id:'pdf1'},{id:'pdf2'}]}}]}};
 const result=collectDocumentResults(base,[out,{error:{message:'failed'}}]);
 assert.deepEqual(result.receipts,[row('a').json]);assert.equal(result.context['Batch - Refresh Verified Evidence'][0].json.files.length,2);
 assert.ok(result.documentErrors.includes('failed'));assert.ok(result.documentErrors.some(x=>x.includes('for b;')));
 assert.ok(!result.documentErrors.some(x=>x.includes('for a;')));
});
test('existing workflow loops individual document calls and only collects at loop completion',()=>{
 const fs=require('fs');const {draftHelpers,validateDraft}=require('./build-mailbox-routing.cjs');
 const w=draftHelpers(JSON.parse(fs.readFileSync('C:/Projects/studio-intelligence/tmp/multistudio-live-backup-paths.json'))).coordinator;
 assert.ok(validateDraft(w));
 assert.equal(w.nodes.find(n=>n.name==='Preserve Receipt and Summary').parameters.mode,'once');
 const loop=w.nodes.find(n=>n.name==='One Receipt Document at a Time');assert.equal(loop.parameters.batchSize,1);
 assert.equal(w.connections[loop.name].main[0][0].node,'Collect File Results');
 assert.equal(w.connections[loop.name].main[1][0].node,'Preserve Receipt and Summary — Context');
 assert.equal(w.connections['Preserve Receipt and Summary'].main[0][0].node,loop.name);
 assert.ok(w.nodes.find(n=>n.name==='All Studio Results').parameters.jsCode.includes('s.documentIssues?.length'));
});
