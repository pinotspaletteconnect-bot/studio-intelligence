const {test}=require('node:test');
const assert=require('node:assert/strict');
const {prepareEmailDocument:prepare}=require('./services/receipts/email-document.cjs');
const m={kind:'review-summary',id:'test',vendor:'Example',date:'2026-09-22',reference:'INV 1',total:'$10.00',sourceReference:'email test',lines:[{description:'Canvas',account:'Inventory',amount:'$10.00'}]};
test('compact summary is display only',()=>{const r=prepare(m,{companyId:'test'});assert.equal(r.status,'ready_for_pdf_render');assert.match(r.html,/Inventory/);assert.equal(r.postingAllowed,false);assert.equal(r.archiveAllowed,false);assert.equal(r.aiUsed,false);});
test('source identity still required',()=>assert.equal(prepare(m,{}).status,'needs_review'));
test('missing, oversized and malformed fields hold',()=>{for(const patch of [{lines:[]},{lines:[null]},{vendor:'x'.repeat(301)},{sourceReference:''}])assert.equal(prepare({...m,...patch},{companyId:'test'}).status,'needs_review');});
test('untrusted markup is escaped in all display fields',()=>{const r=prepare({...m,vendor:'<script>x</script>',lines:[{description:'<img src=x>',account:'A&B',amount:'$10'}]},{companyId:'test'});assert.doesNotMatch(r.html,/<script>|<img /);assert.match(r.html,/A&amp;B/);});
