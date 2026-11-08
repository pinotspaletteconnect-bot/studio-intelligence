'use strict';

// Owner explicitly approved cross-studio category reuse on 2026-11-08.
// This shares category authority, never source amounts, dates or identity.
function currentSharedCategory(vendor, description, rules) {
 const name=String(vendor).toLowerCase().replace(/[^a-z0-9]/g,'');
 let key=null;
 if(['canvasdepot','thecanvasdepot','dynamicwholesalesigns','dynamicwholesale'].includes(name))key='projectPet';
 const d=String(description||'');
 if(!key&&/^(?:Modelo Especial|Stella Artois 5\.16 gal \(1\/6 bbl\) Keg|Kona Big Wave 4x 6 Pack \(12 oz Bottles\)|Bud Light 4x 6 Pack \(12 oz Bottles\)|Four Peaks Hop Knot IPA 4x 6 Pack \(12 oz Bottles\))$/i.test(d.trim()))key='beer';
 if(!key&&/\b(?:paint|acrylics?|watercolou?rs?|tempera|gouache)\b/i.test(d)&&
   !/\b(?:brush(?:es)?|pen(?:s)?|marker(?:s)?|medium|thinner|remover|tray|palette|apron|varnish|canvas|kit|class|ticket|lesson|event|service|set of tools)\b/i.test(d))key='paint';
 const account=key&&rules.accounts[key];
 return account?{companyId:rules.companyId,accountId:account.id,accountName:account.name,
   approved:true,active:true,ruleId:'owner-shared-20261108-'+key,
   sharedOwnerAnswer:{source:key==='beer'?'owner_reply_1a175259a094b9da_and_shared_reuse_approval':'owner_chat_20261108',scope:'all four studio inboxes',statement:key==='paint'?'Paint regardless of color is Paint Inventory.':key==='beer'?'Existing owner-confirmed Beer Inventory category applies to these named beer products across suppliers and studios; deposits and other merchandise are excluded.':'Canvas Depot is Special Class Products COGS.'}}:null;
}

function sharedSavedCategory(description, rows, rules, helpers) {
 const normalize=s=>{
   const text=String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
   // Same named product in supplier shorthand and the owner's answered question.
   if(/^barritt'?s (?:12oz 4\/6pk cn ginger|regular ginger beer 4x 6 pack \(12 oz cans\))$/.test(text))return 'barritts regular ginger beer 12 oz cans';
   // Owner-approved general product answers apply across studios. Restrict
   // this family to named packaged soft drinks, never syrup or merchandise.
   if(/^(?:coca-cola soft drink 12 fl\. oz\., 35 pk\.|sprite lemon lime soda soft drinks, 12 fl\. oz\., 35 pk\.|mountain dew 12 fl\. oz\. cans, 36 pk\.|canada dry ginger ale soda 12 fl\. oz\., 24 pk\.)$/.test(text))return 'packaged soft drinks';
   return text;
 };
 const d=normalize(description);
 // Generic totals/payment labels cannot identify a product across vendors.
 if(d.length<5||/^(?:amount|total|subtotal|payment|invoice payment confirmation|service|service charge|fee|tax)$/.test(d))return null;
 const matches=[];
 for(const row of rows) {
   const meta=helpers.questionMetadata(row),answer=helpers.latestOwnerAnswer(row);
   if(meta?.field!=='category'||normalize(meta.observed)!==d||!answer)continue;
   const category=helpers.knownOwnerCategory(answer.answer,rules);
   if(category)matches.push({category,row,answer});
 }
 if(!matches.length||new Set(matches.map(m=>m.category.accountId)).size!==1)return null;
 const m=matches[0];
 return {companyId:rules.companyId,...m.category,approved:true,active:true,
   ruleId:'owner-shared-answer:'+m.row.reviewKey,
   sharedOwnerAnswer:{source:'authenticated_owner_reply',scope:'owner-approved cross-studio category reuse',
     originalCompanyId:m.row.companyId,originalReceiptKey:m.row.receiptKey,reviewKey:m.row.reviewKey,
     messageId:m.answer.messageId,receivedAt:m.answer.receivedAt,description,accountId:m.category.accountId}};
}
module.exports={currentSharedCategory,sharedSavedCategory};
