const test=require('node:test'),assert=require('node:assert/strict');
const {correctBlickUnitAmounts}=require('./receipt-source-repairs.cjs');
test('Blick uses printed extended amounts only when all quantity and subtotal checks agree',()=>{
 const cache={source:{text:'Paint\nQty: 3\nIn stock and reserved\n$ 22.14\neach $ 7.38\nSubtotal: $22.14'},receipt:{vendor:'Blick Art Materials',subtotalCents:2214,items:[{description:'Paint',quantity:3,netCents:738}]}};
 assert.equal(correctBlickUnitAmounts(cache).receipt.items[0].netCents,2214);
 assert.equal(correctBlickUnitAmounts({...cache,receipt:{...cache.receipt,subtotalCents:2200}}).receipt.items[0].netCents,738);
 assert.equal(correctBlickUnitAmounts({...cache,source:{text:cache.source.text.replace('Qty: 3','Qty: 2')}}).receipt.items[0].netCents,738);
 assert.equal(correctBlickUnitAmounts({...cache,source:{text:cache.source.text+'\nPaint'}}).receipt.items[0].netCents,738);
});
