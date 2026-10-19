'use strict';

// Append literal codes while retaining the exact existing text as the prefix.
function appendPerks(existing, ...additions) {
 if(typeof existing!=='string')throw Error('Perks must be literal text');
 let value=existing;
 for(const part of additions.flat()){
  if(typeof part!=='string')throw Error('Perk code must be text');
  for(const code of part.split(/[\s,;|/]+/u).filter(Boolean)){
   const escaped=code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   if(!new RegExp('(^|[^A-Za-z0-9])'+escaped+'($|[^A-Za-z0-9])','iu').test(value))value+=(value.trim()?', ':'')+code;
  }
 }
 return value;
}

function attachProductPerks(rows, productSource, mapping) {
 if(productSource?.complete!==true||productSource.isPrivate!==false||!Array.isArray(productSource.rows)||productSource.rows.length!==productSource.expectedRowCount)throw Error('Complete product snapshot required');
 const codes=new Set(['CAN','CP','CPM']);
 if(!Array.isArray(mapping)||mapping.length!==3||mapping.some(m=>!codes.has(m.perkCode)||!['purchaser','order','quantity'].includes(m.perkScope)))throw Error('Verified product perk mapping required');
 const result=rows.map(r=>({...r,productPerks:[]})),review=[],seen=new Set(),groups=new Map();
 for(const unit of productSource.rows){
  const id=unit.sourceOrderId+':'+unit.voucherCode;
  if(unit.classId!==productSource.classId||unit.status!=='Reserved'||!/^\d+$/.test(unit.sourceOrderId)||!unit.voucherCode||seen.has(id))throw Error('Unverified product order unit');
  seen.add(id);
  const matches=mapping.filter(m=>m.sourceNames.includes(unit.item.replace(/\s+/g,' ').trim()));
  if(matches.length!==1)throw Error('Unmapped product perks');
  const groupKey=unit.sourceOrderId+':'+matches[0].perkCode;
  const group=groups.get(groupKey)??{orderId:unit.sourceOrderId,mapping:matches[0],units:0};group.units++;groups.set(groupKey,group);
 }
 const normalize=s=>String(s??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
 for(const {orderId,mapping:m,units} of groups.values()){
  const candidates=result.filter(r=>r.sourceOrderId===orderId);
  const named=candidates.filter(r=>normalize(r.guest)&&normalize(r.guest)===normalize(r.purchaser));
  const selected=m.perkScope==='order'||m.perkScope==='quantity'&&units>=candidates.length?candidates:candidates.length===1?candidates:named.length===1?named:[];
  if(!selected.length){review.push({sourceOrderId:orderId,code:m.perkCode,reason:'product-purchaser-row-unresolved'});continue;}
  for(const row of selected)if(!row.productPerks.includes(m.perkCode))row.productPerks.push(m.perkCode);
  if(m.perkScope==='quantity'&&units>1&&units<candidates.length)review.push({sourceOrderId:orderId,code:m.perkCode,units,guestCount:candidates.length,reason:'partial-product-guest-allocation-unresolved'});
 }
 return {rows:result,review};
}
module.exports={appendPerks,attachProductPerks};
