const test=require('node:test'),assert=require('node:assert/strict');
const {currentSharedCategory,sharedSavedCategory}=require('./shared-answer-policy.cjs');
const rules={companyId:'target-studio',accounts:{paint:{id:'164',name:'Paint Inventory'},projectPet:{id:'222',name:'Special Class Products COGS'}}};
test('named Barritts shorthand reuses an authenticated answer but not other ginger products',()=>{
 const row={reviewKey:'answered',companyId:'source-studio',meta:{field:'category',observed:'Barritts Regular Ginger Beer 4x 6 Pack (12 oz Cans)'},reply:{answer:'Nonalcoholic inventory',messageId:'owner-reply'}};
 const helpers={questionMetadata:r=>r.meta,latestOwnerAnswer:r=>r.reply,knownOwnerCategory:a=>a==='Nonalcoholic inventory'?{accountId:'184',accountName:'Nonalcoholic Drink Inventory'}:null};
 assert.equal(sharedSavedCategory("Barritt's 12OZ 4/6PK Cn Ginger",[row],rules,helpers)?.accountId,'184');
 assert.equal(sharedSavedCategory('Other Ginger Beer',[row],rules,helpers),null);
 assert.equal(sharedSavedCategory("Barritt's 12OZ 4/6PK Cn Ginger",[{...row,reply:null}],rules,helpers),null);
});
test('known Modelo beer reuses its confirmed category across suppliers without classifying merchandise',()=>{
 const r={...rules,accounts:{...rules.accounts,beer:{id:'162',name:'Beer Inventory'}}};
 assert.equal(currentSharedCategory('Heidelberg','Modelo Especial',r).accountId,'162');
 assert.equal(currentSharedCategory('Other supplier','Modelo Especial',r).accountId,'162');
 assert.equal(currentSharedCategory('Heidelberg','Modelo Especial shirt',r),null);
});
test('owner policy uses all paint colors and Canvas Depot across studio scopes',()=>{
 for(const studio of ['Gilbert','St. Matthews','Short North','Jeffersonville']) {
   const r={...rules,companyId:studio};
   assert.equal(currentSharedCategory('Blick','Acrylic Paint - Unexpected New Color',r).accountId,'164');
   assert.equal(currentSharedCategory('DYNAMIC WHOLESALE SIGNS','The Canvas Depot',r).accountId,'222');
   assert.equal(currentSharedCategory('Canvas Depot','Wood Surface',r).companyId,studio);
 }
 for(const item of ['Paint brush','Paint thinner','Acrylic medium','Paint and sip class','Canvas'])assert.equal(currentSharedCategory('Other',item,rules),null);
});
test('shared answers reuse only authenticated exact product categories, not amounts or ambiguous labels',()=>{
 const helpers={questionMetadata:r=>r.meta,latestOwnerAnswer:r=>r.auth?r.reply:null,knownOwnerCategory:a=>a==='wine'?{accountId:'161',accountName:'Wine Inventory'}:a==='food'?{accountId:'224',accountName:'Food Inventory'}:null};
 const row={companyId:'other-studio',receiptKey:'other:source',reviewKey:'original-review',meta:{field:'category',observed:'Sauvignon Blanc'},auth:true,reply:{answer:'wine',messageId:'owner-reply',receivedAt:'2026-11-08T16:00:00Z'},amountCents:999};
 const result=sharedSavedCategory('Sauvignon Blanc',[row],rules,helpers);
 assert.equal(result.accountId,'161');assert.equal(result.companyId,'target-studio');assert.equal(result.amountCents,undefined);assert.equal(result.sharedOwnerAnswer.originalReceiptKey,'other:source');
 assert.equal(sharedSavedCategory('Sauvignon Blanc',[{...row,auth:false}],rules,helpers),null);
 assert.equal(sharedSavedCategory('Other wine',[row],rules,helpers),null);
 assert.equal(sharedSavedCategory('Amount',[{...row,meta:{field:'category',observed:'Amount'}}],rules,helpers),null);
 assert.equal(sharedSavedCategory('Sauvignon Blanc',[row,{...row,reply:{...row.reply,answer:'food'}}],rules,helpers),null);
});
