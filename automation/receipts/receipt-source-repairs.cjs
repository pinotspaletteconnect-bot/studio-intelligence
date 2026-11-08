'use strict';
function correctBlickUnitAmounts(cache) {
 const r=cache?.receipt,text=String(cache?.source?.text||'');
 if(!/^Blick(?: Art Materials)?$/i.test(r?.vendor||'')||!Array.isArray(r.items)||!r.items.length)return cache;
 const cents=s=>Math.round(Number(String(s).replace(/,/g,''))*100);
 const items=[];
 for(const item of r.items){
  const parts=text.split(item.description);
  if(parts.length!==2)return cache;
  const m=parts[1].match(/^\s*Qty:\s*(\d+)\s+In stock and reserved\s+\$\s*([\d,]+\.\d{2})(?:\s+each\s*\$\s*([\d,]+\.\d{2}))?/i);
  if(!m||Number(m[1])!==item.quantity)return cache;
  const line=cents(m[2]),unit=m[3]?cents(m[3]):line;
  if(!Number.isSafeInteger(line)||line<=0||unit*item.quantity!==line||![line,unit].includes(item.netCents))return cache;
  items.push({...item,netCents:line,evidence:item.description+m[0]});
 }
 const sum=items.reduce((n,i)=>n+i.netCents,0),subtotal=text.match(/Subtotal:\s*\$\s*([\d,]+\.\d{2})/i);
 if(!subtotal||cents(subtotal[1])!==sum||sum!==r.subtotalCents)return cache;
 if(items.every((i,n)=>i.netCents===r.items[n].netCents))return cache;
 return {...cache,receipt:{...r,items},sourceRepair:{kind:'blick_printed_line_totals',note:'Used the printed extended line amounts, independently reconciled to quantity × unit price and printed subtotal.'}};
}
module.exports={correctBlickUnitAmounts};
