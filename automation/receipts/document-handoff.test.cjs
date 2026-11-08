const test=require('node:test'),assert=require('node:assert/strict');
const {collectDocumentResults}=require('./document-handoff.cjs');
const row=id=>({json:{sourceMessageId:id,status:'prepared_for_review'}});

test('held receipts without document evidence retain review context without false missing-result errors',()=>{
 const held={json:{sourceMessageId:'held',status:'needs_review',reason:'Real unanswered question'}};
 const base={'Batch - Prepare and Hold Exceptions':[held]};
 const result=collectDocumentResults(base,[]);
 assert.deepEqual(result.documentErrors,[]);
 assert.deepEqual(result.context['Batch - Prepare and Hold Exceptions'],[held]);
 assert.deepEqual(result.receipts,[]);
 const ready={json:{...held.json,evidenceReady:true}};
 assert.match(collectDocumentResults({'Batch - Prepare and Hold Exceptions':[ready]},[]).documentErrors[0],/for held;/);
});

test('generated document splitter skips only unavailable evidence and preserves full question context',async()=>{
 const fs=require('fs'),{draftHelpers}=require('./build-mailbox-routing.cjs');
 const w=draftHelpers(JSON.parse(fs.readFileSync('C:/Projects/studio-intelligence/tmp/multistudio-live-backup-paths.json'))).coordinator;
 const code=w.nodes.find(n=>n.name==='Process Each Receipt Independently').parameters.jsCode;
 const A=Object.getPrototypeOf(async function(){}).constructor;
 const held={json:{sourceMessageId:'held',status:'needs_review'}};
 const ready={json:{sourceMessageId:'ready',status:'needs_review',evidenceReady:true}};
 const base={'Batch - Prepare and Hold Exceptions':[held,ready,row('approved')]};
 const result=await new A('$','$input',code)(()=>({first:()=>({json:{mailboxContext:{studio:'Short North'}}})}),{first:()=>({json:{context:base}})});
 assert.deepEqual(result.map(r=>r.json.items[0].json.sourceMessageId),['ready','approved']);
 const empty=await new A('$','$input',code)(()=>({first:()=>({json:{mailboxContext:{studio:'Short North'}}})}),{first:()=>({json:{context:{'Batch - Prepare and Hold Exceptions':[held]}}})});
 assert.deepEqual(empty[0].json.items,[]);
 assert.deepEqual(empty[0].json.context['Batch - Prepare and Hold Exceptions'],[held]);
});
test('one failed helper retains other verified results and reports the missing receipt',()=>{
 const base={'Batch - Prepare and Hold Exceptions':[row('a'),row('b')]};
 const out={context:{'Batch - Prepare and Hold Exceptions':[row('a')],'Batch - Hash Current Summary':[row('a')],'Batch - Refresh Verified Evidence':[{json:{files:[{id:'pdf1'},{id:'pdf2'}]}}]}};
 const result=collectDocumentResults(base,[out,{error:{message:'failed'}}]);
 assert.deepEqual(result.receipts,[row('a').json]);assert.equal(result.context['Batch - Refresh Verified Evidence'][0].json.files.length,2);
 assert.ok(result.documentErrors.includes('failed'));assert.ok(result.documentErrors.some(x=>x.includes('for b;')));
 assert.ok(!result.documentErrors.some(x=>x.includes('for a;')));
});
test('studio context alone cannot be reported as completed receipt processing',async()=>{
 const fs=require('fs');const {draftHelpers}=require('./build-mailbox-routing.cjs');
 const w=draftHelpers(JSON.parse(fs.readFileSync('C:/Projects/studio-intelligence/tmp/multistudio-live-backup-paths.json'))).coordinator;
 const code=w.nodes.find(n=>n.name==='All Studio Results').parameters.jsCode;
 const fn=new Function('$input',code);
 const result=fn({all:()=>[{json:{mailboxContext:{mailbox:'stellaseaselempirereceipts@gmail.com'}}}]});
 assert.equal(result[0].json.status,'needs_attention');
 assert.ok(result[0].json.studios.every(s=>s.status==='failed_or_incomplete'));
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
 assert.equal(w.nodes.find(n=>n.name==='Process Studios Independently').parameters.mode,'once');
 assert.equal(w.connections['Select Studio Inboxes'].main[0][0].node,'One Studio at a Time');
 assert.equal(w.connections['One Studio at a Time'].main[0][0].node,'All Studio Results');
 assert.equal(w.connections['One Studio at a Time'].main[1][0].node,'Process Studios Independently');
 assert.equal(w.connections['Process Studios Independently'].main[0][0].node,'One Studio at a Time');
 assert.ok(w.nodes.find(n=>n.name==='All Studio Results').parameters.jsCode.includes('s.documentIssues?.length'));
});
