const test=require('node:test'),assert=require('node:assert/strict');
const {correctBlickUnitAmounts}=require('./receipt-source-repairs.cjs');
test('Blick uses printed extended amounts only when all quantity and subtotal checks agree',()=>{
 const cache={source:{text:'Paint\nQty: 3\nIn stock and reserved\n$ 22.14\neach $ 7.38\nSubtotal: $22.14'},receipt:{vendor:'Blick Art Materials',subtotalCents:2214,items:[{description:'Paint',quantity:3,netCents:738}]}};
 assert.equal(correctBlickUnitAmounts(cache).receipt.items[0].netCents,2214);
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
