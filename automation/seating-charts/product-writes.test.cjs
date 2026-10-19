'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {productSummary,planProductWrites,verifyProductWrites}=require('./product-writes.cjs');
const mapping=[{sourceNames:['Candle - Standard'],namesCell:'J23',totalCell:'R23'},{sourceNames:['Cheese - 1 Serving'],namesCell:'J24',totalCell:'R24'},{sourceNames:['Cheese and meat - 1 Serving'],namesCell:'J25',totalCell:'R25'}];
const row=(code,name='Example A')=>({sourceOrderId:'123',voucherCode:code,classId:'456',customer:name,item:'Cheese and meat - 1 Serving',status:'Reserved'});
const source=rows=>({classId:'456',isPrivate:false,complete:true,expectedRowCount:rows.length,rows});
const cells={J23:'',R23:0,J24:'',R24:0,J25:'',R25:0};
test('counts individual vouchers once and groups repeated customer units, with no money or attendance inference',()=>{
 const summary=productSummary(source([row('AA-1'),row('AA-2'),row('BB-1','Example B'),row('BB-2','Example B')]),mapping);
 assert.equal(summary[2].names,'Example A (2), Example B (2)');assert.equal(summary[2].total,4);assert.equal(summary[0].total,0);
 for(const rows of [[row('same'),row('same')],[{...row('x'),status:'Received'}],[{...row('x'),classId:'999'}],[{...row('x'),item:'Unmapped'}]])assert.throws(()=>productSummary(source(rows),mapping));
 assert.throws(()=>productSummary({...source([]),complete:false},mapping));
});
test('writes only mapped product cells and repeat runs write nothing; removed units update an owned summary',()=>{
 const first=planProductWrites({source:source([row('a'),row('b')]),mapping,sheetName:'Main class',cells});
 assert.deepEqual(first.request.data.map(d=>d.range),["'Main class'!J25","'Main class'!R25"]);
 const after={...cells,...first.expected};
 assert.equal(planProductWrites({source:source([row('a'),row('b')]),mapping,sheetName:'Main class',cells:after,ledger:first.lastWritten}).request.data.length,0);
 const removed=planProductWrites({source:source([]),mapping,sheetName:'Main class',cells:after,ledger:first.lastWritten});
 assert.deepEqual(removed.request.data.map(d=>d.values[0][0]),['',0]);
 assert.equal(verifyProductWrites({plan:first,before:cells,after,protectedBefore:[['seat','=formula','attendance']],protectedAfter:[['seat','=formula','attendance']]}).productsVerified,true);
 assert.throws(()=>verifyProductWrites({plan:first,before:cells,after,protectedBefore:['seat'],protectedAfter:['different']}));
});
test('preserves an entire customer/total pair if staff edited either value or supplied a formula',()=>{
 for(const changed of [{J25:'Staff note'},{R25:9},{J25:{formulaValue:'=manual()'}}]){
  const p=planProductWrites({source:source([row('a')]),mapping,sheetName:'Main',cells:{...cells,...changed}});
  assert.equal(p.request.data.length,0);assert.equal(p.review.length,1);
 }
});
test('pending writes are recoverable but cannot overwrite a third staff value',()=>{
 const p=planProductWrites({source:source([row('a')]),mapping,sheetName:'Main',cells});
 assert.equal(planProductWrites({source:source([row('a')]),mapping,sheetName:'Main',cells:{...cells,J25:p.expected.J25},pending:p}),p);
 assert.throws(()=>planProductWrites({source:source([row('a')]),mapping,sheetName:'Main',cells:{...cells,J25:'Staff edit'},pending:p}));
});
