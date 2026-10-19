'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {appendPerks,attachProductPerks}=require('./product-perks.cjs');
const mapping=[['Candle','CAN'],['Cheese','CP'],['Meat','CPM']].map(([name,perkCode])=>({sourceNames:[name],perkCode,perkScope:'purchaser'}));
const source=units=>({complete:true,isPrivate:false,classId:'123',expectedRowCount:units.length,rows:units.map(([order,item],i)=>({sourceOrderId:order,item,voucherCode:'unit-'+i,classId:'123',status:'Reserved'}))});
test('perks additions preserve the original text and do not duplicate overlapping abbreviations',()=>{
 const text='C; A / CPM';const added=appendPerks(text,'C',['CP','CAN']);assert.equal(added,'C; A / CPM, CP, CAN');assert.equal(appendPerks(added,'C','CP','CAN'),added);
 assert.equal(appendPerks('CC','C'),'CC, C');assert.equal(appendPerks('can','CAN'),'can');assert.throws(()=>appendPerks({formulaValue:'=1'},'CAN'));
});
test('products join by order identity and mark the purchaser once, preserving blank guest identities',()=>{
 const rows=[{sourceOrderId:'10',reservationKey:'1',guest:'Linda Smith',purchaser:'Linda Smith'},{sourceOrderId:'10',reservationKey:'2',guest:'',purchaser:'Linda Smith'},{sourceOrderId:'20',reservationKey:'3',guest:'Linda Smith',purchaser:'Linda Smith'}];
 const result=attachProductPerks(rows,source([['10','Candle'],['10','Candle'],['10','Meat']]),mapping);
 assert.deepEqual(result.rows.map(r=>r.productPerks),[['CAN','CPM'],[],[]]);assert.equal(result.rows[1].guest,'');assert.equal(result.review.length,0);assert.equal(rows[0].productPerks,undefined);
});
test('ambiguous purchaser rows are reviewed; configured order scope applies to the exact order only',()=>{
 const rows=[{sourceOrderId:'10',guest:'Guest A',purchaser:'Buyer'},{sourceOrderId:'10',guest:'Guest B',purchaser:'Buyer'}];
 assert.equal(attachProductPerks(rows,source([['10','Cheese']]),mapping).review.length,1);
 assert.deepEqual(attachProductPerks(rows,source([['10','Cheese']]),mapping.map(m=>({...m,perkScope:'order'}))).rows.map(r=>r.productPerks),[['CP'],['CP']]);
 assert.throws(()=>attachProductPerks(rows,source([['10','Unknown']]),mapping));
});

test('quantity covering an order marks each guest once; partial quantities retain purchaser marking and review',()=>{
 const rows=[{sourceOrderId:'10',guest:'Buyer',purchaser:'Buyer'},{sourceOrderId:'10',guest:'Guest B',purchaser:'Buyer'},{sourceOrderId:'10',guest:'',purchaser:'Buyer'}],configured=mapping.map(m=>({...m,perkScope:'quantity'}));
 const full=attachProductPerks(rows,source([['10','Candle'],['10','Candle'],['10','Candle']]),configured);assert.deepEqual(full.rows.map(r=>r.productPerks),[['CAN'],['CAN'],['CAN']]);assert.equal(full.review.length,0);
 const partial=attachProductPerks(rows,source([['10','Candle'],['10','Candle']]),configured);assert.deepEqual(partial.rows.map(r=>r.productPerks),[['CAN'],[],[]]);assert.equal(partial.review[0].units,2);assert.equal(partial.review[0].guestCount,3);
 const shared=attachProductPerks(rows,source([['10','Cheese']]),configured);assert.deepEqual(shared.rows.map(r=>r.productPerks),[['CP'],[],[]]);assert.equal(shared.review.length,0);
});
