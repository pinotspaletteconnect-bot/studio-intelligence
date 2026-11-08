const test=require('node:test'),assert=require('node:assert/strict');
const {correctReviewedKroger}=require('./reviewed-kroger.cjs');
test('reviewed Kroger corrects printed amounts only for the verified original',()=>{
 const c={source:{mailbox:'stellaseaselempirereceipts@gmail.com',sourceMessageId:'1a10dee3995008ac',attachments:[{filename:'Kroger 10.5.26.jpg',size:69675}]},receipt:{vendor:'Kroger',reference:'515083',date:'2026-10-03',totalCents:1831}};
 const r=correctReviewedKroger(c).receipt;
 assert.equal(r.items.reduce((n,i)=>n+i.netCents,0)+r.taxCents,1831);
 assert.equal(r.items.reduce((n,i)=>n+i.quantity,0),9);
 assert.equal(r.orderDiscountCents,0);
 for(const changed of [{...c,source:{...c.source,sourceMessageId:'other'}},{...c,receipt:{...c.receipt,totalCents:1832}}])assert.equal(correctReviewedKroger(changed),changed);
});
