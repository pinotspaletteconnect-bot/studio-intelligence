const test=require('node:test'),assert=require('node:assert/strict');
const {correctReviewedKroger}=require('./reviewed-kroger.cjs');
test('Kroger savings are not the charge; correction remains scoped to the verified photo',()=>{
 const c={source:{mailbox:'stellaseaselempirereceipts@gmail.com',sourceMessageId:'1a122a059be02215',attachments:[{filename:'Kroger 10.9.26.jpg',size:62726}]},receipt:{vendor:'Kroger',date:'2021-10-09',totalCents:300}};
 const r=correctReviewedKroger(c).receipt;
 assert.equal(r.totalCents,798);assert.equal(r.items.reduce((n,i)=>n+i.netCents,0),798);assert.equal(r.orderDiscountCents,0);assert.equal(r.date,'2026-10-09');assert.equal(c.receipt.totalCents,300);
 for(const source of [{...c.source,mailbox:'other'},{...c.source,sourceMessageId:'other'},{...c.source,attachments:[...c.source.attachments,{filename:'another.jpg'}]}]){const other={...c,source};assert.equal(correctReviewedKroger(other),other);}
});
test('reviewed Kroger corrects printed amounts only for the verified original',()=>{
 const c={source:{mailbox:'stellaseaselempirereceipts@gmail.com',sourceMessageId:'1a10dee3995008ac',attachments:[{filename:'Kroger 10.5.26.jpg',size:69675}]},receipt:{vendor:'Kroger',reference:'515083',date:'2026-10-03',totalCents:1831}};
 const r=correctReviewedKroger(c).receipt;
 assert.equal(r.items.reduce((n,i)=>n+i.netCents,0)+r.taxCents,1831);
 assert.equal(r.items.reduce((n,i)=>n+i.quantity,0),9);
 assert.equal(r.orderDiscountCents,0);
 for(const changed of [{...c,source:{...c.source,sourceMessageId:'other'}},{...c,receipt:{...c.receipt,totalCents:1832}}])assert.equal(correctReviewedKroger(changed),changed);
});

