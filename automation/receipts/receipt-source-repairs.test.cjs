const test=require('node:test'),assert=require('node:assert/strict');
const {correctBlickUnitAmounts}=require('./receipt-source-repairs.cjs');

test('reviewed Autojate discount stays bound to its original studio and receipt',()=>{
 const {correctReviewedAutojateDiscount:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'jessejayspinotreceipts@gmail.com',sourceMessageId:'1a197c0e676af3a9',attachments:[{filename:'REC10008.pdf',size:15773}]},receipt:{vendor:'Autojate',reference:'REC10008',date:'2026-11-01',subtotalCents:9950,orderDiscountCents:1990,totalCents:7960,paidAmountCents:7960,items:[{description:'Jesse - Pinots Palette',netCents:7950}],uncertainties:[]}};
 const out=fix(c);assert.equal(out.receipt.items[0].netCents,7960);assert.equal(out.receipt.orderDiscountCents,0);assert.equal(out.receipt.reviewedPrintedAmounts.discountCents,1990);assert.equal(c.receipt.items[0].netCents,7950);
 for(const wrong of [{...c,source:{...c.source,mailbox:'other@example.com'}},{...c,receipt:{...c.receipt,totalCents:8000}},{...c,receipt:{...c.receipt,items:[...c.receipt.items,...c.receipt.items]}}])assert.equal(fix(wrong),wrong);
});
test('Blick uses printed extended amounts only when all quantity and subtotal checks agree',()=>{
 const cache={source:{text:'Paint\nQty: 3\nIn stock and reserved\n$ 22.14\neach $ 7.38\nSubtotal: $22.14'},receipt:{vendor:'Blick Art Materials',subtotalCents:2214,items:[{description:'Paint',quantity:3,netCents:738}]}};
 assert.equal(correctBlickUnitAmounts(cache).receipt.items[0].netCents,2214);
 const backorder={source:{text:cache.source.text.replace('In stock and reserved','1 Units In stock and Reserved; 2 Units on Backorder until 11/18/2026')},receipt:{...cache.receipt,items:[{description:'Paint',quantity:3,netCents:6642}]}};
 assert.equal(correctBlickUnitAmounts(backorder).receipt.items[0].netCents,2214);
 assert.equal(correctBlickUnitAmounts({...cache,receipt:{...cache.receipt,subtotalCents:2200}}).receipt.items[0].netCents,738);
 assert.equal(correctBlickUnitAmounts({...cache,source:{text:cache.source.text.replace('Qty: 3','Qty: 2')}}).receipt.items[0].netCents,738);
 assert.equal(correctBlickUnitAmounts({...cache,source:{text:cache.source.text+'\nPaint'}}).receipt.items[0].netCents,738);
});

test('Google One sums printed state and local tax without inventing a charge',()=>{
 const {correctGoogleOneTaxes}=require('./receipt-source-repairs.cjs');
 const receipt={vendor:'Google LLC',reference:'SOP.123',subtotalCents:299,taxCents:17,totalCents:323,items:[{description:'200 GB (Google One)',netCents:299,itemTaxCents:17}],uncertainties:['Total amount charged is monthly; actual paid amount not specified.']};
 const c={receipt,source:{text:"From: Google Play <googleplay-noreply@google.com>\nOrder number: SOP.123\n$2.99/month\nState sales tax: $0.17\nLocal sales tax: $0.07\nTotal: $3.23/month\nYour subscription continues and you've been charged"}};
 const fixed=correctGoogleOneTaxes(c);assert.equal(fixed.receipt.taxCents,24);assert.equal(fixed.receipt.items[0].itemTaxCents,24);assert.deepEqual(fixed.receipt.uncertainties,[]);
 assert.equal(correctGoogleOneTaxes({...c,receipt:{...receipt,totalCents:324}}).receipt.totalCents,324);
 assert.equal(correctGoogleOneTaxes({...c,source:{text:c.source.text+'\nOrder number: SOP.456'}}).receipt.taxCents,17);
});
test('Shippo aggregate payment uses the printed amount only after all invoice checks match',()=>{
 const {correctShippoPayment}=require('./receipt-source-repairs.cjs');
 const c={source:{text:'From: Shippo <noreply@shippo.com>\nInvoice Payment Confirmation\nInvoice #12345\nThis is confirmation that we have received payment for Oct 11, 2026 for 4 transactions with a total of $46.00 USD.',attachments:[]},receipt:{vendor:'Shippo',reference:'12345',subtotalCents:4600,totalCents:4600,paidAmountCents:4600,items:[],uncertainties:['No itemized line items provided in the receipt.']}};
 const fixed=correctShippoPayment(c);
 assert.equal(fixed.receipt.items[0].netCents,4600);
 assert.equal(fixed.receipt.uncertainties.length,0);
 assert.equal(c.receipt.items.length,0);
 for(const delta of [{totalCents:4601},{reference:'wrong'},{uncertainties:['Two receipts disagree.']},{taxCents:1}]){const bad={...c,receipt:{...c.receipt,...delta}};assert.equal(correctShippoPayment(bad),bad);}
 const wrong={...c,source:{...c.source,text:c.source.text.replace('noreply@shippo.com','someone@example.com')}};assert.equal(correctShippoPayment(wrong),wrong);
});
test('visually reviewed Cintas correction is exact-source and balances printed service fee',()=>{
 const {correctReviewedCintas}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'jessejayspinotreceipts@gmail.com',sourceMessageId:'1a130a62a28c7ece',attachments:[{filename:'Epson_10122026080516.pdf',size:640678}]},receipt:{vendor:'CINTAS',reference:'4218411442',date:'2026-09-07',totalCents:18742,taxCents:1061}};
 const r=correctReviewedCintas(c).receipt;
 assert.equal(r.items.reduce((n,i)=>n+i.netCents,0),17681);
 assert.equal(r.items.at(-1).netCents,2052);
 const wrong={...c,source:{...c.source,mailbox:'other@example.com'}};
 assert.equal(correctReviewedCintas(wrong),wrong);
 const changed={...c,receipt:{...c.receipt,totalCents:18743}};
 assert.equal(correctReviewedCintas(changed),changed);
});
