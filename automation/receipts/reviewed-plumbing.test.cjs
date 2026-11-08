'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {correctReviewedPlumbing}=require('./reviewed-plumbing.cjs');
const sample=()=>({source:{mailbox:'stellaseaselempirereceipts@gmail.com',sourceMessageId:'19ffd4a77133aedf',attachments:[{filename:'Invoice-1800.pdf',size:21019}]},receipt:{vendor:'Callthatplumber LLC',reference:'1800',date:'2026-08-10',totalCents:45000,paidAmountCents:45000,subtotalCents:45000,items:[{description:'Snake sewer drain in the basement from cleanout',netCents:0}],uncertainties:['descriptive row zero']}});
test('reviewed invoice total preserves payment and source facts',()=>{
 const original=sample(),fixed=correctReviewedPlumbing(original);
 assert.equal(fixed.receipt.items[0].netCents,45000);
 assert.equal(fixed.receipt.paidAmountCents,45000);
 assert.deepEqual(fixed.receipt.uncertainties,[]);
 assert.equal(original.receipt.items[0].netCents,0);
});
test('changed attachment, studio, or total cannot inherit correction',()=>{
 for(const change of [x=>x.source.mailbox='other@example.com',x=>x.source.attachments[0].size++,x=>x.receipt.totalCents++]){
  const x=sample();change(x);assert.equal(correctReviewedPlumbing(x),x);
 }
});
