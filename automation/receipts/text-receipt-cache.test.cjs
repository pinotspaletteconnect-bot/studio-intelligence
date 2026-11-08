const test=require('node:test'),assert=require('node:assert/strict');
const {canvasDepotTextCache:f}=require('./text-receipt-cache.cjs');
const m={id:'19dac91ab1cfa1b0',text:'From: outgoing@safewebservices.com\nDYNAMIC WHOLESALE SIGNS\nYour Card Sale is complete!\nApr 20, 2026\n$125.55\nTransaction ID\n11969756418\nDescription\nThe Canvas Depot\nOrder ID\nINV 6380\n'};
test('complete Canvas Depot email supplies exact facts without a paid extraction',()=>{const r=f(m,{mailbox:'studio@example.com',studio:'Studio'});assert.equal(r.receipt.totalCents,12555);assert.equal(r.receipt.date,'2026-04-20');assert.equal(r.receipt.taxCents,null);assert.equal(r.source.mailbox,'studio@example.com');});
test('ambiguous or incomplete payment emails remain unparsed',()=>{for(const text of [m.text+'$9.00',m.text.replace('Your Card Sale is complete!','Payment pending'),m.text.replace('The Canvas Depot','Other Vendor'),m.text+'Order ID\nINV 2\n'])assert.equal(f({...m,text},{}),null);});
