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
function correctGoogleOneTaxes(cache) {
 const r=cache?.receipt,text=String(cache?.source?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='Google LLC'||r.items?.length!==1||!/^\d+\s*(?:GB|TB) \(Google One\)/.test(r.items[0].description)||!text.includes('From: Google Play <googleplay-noreply@google.com>'))return cache;
 const orders=[...text.matchAll(/^Order number: (\S+)$/gm)],prices=[...text.matchAll(/^\$([\d.]+)\/month$/gm)],totals=[...text.matchAll(/^Total: \$([\d.]+)\/month$/gm)],taxes=[...text.matchAll(/^(?:State|Local) sales tax: \$([\d.]+)$/gm)];
 const cents=s=>Math.round(Number(s)*100);
 if(orders.length!==1||orders[0][1]!==r.reference||prices.length!==1||totals.length!==1||taxes.length!==2||!text.includes("continues and you've been charged"))return cache;
 const net=cents(prices[0][1]),tax=taxes.reduce((s,m)=>s+cents(m[1]),0),total=cents(totals[0][1]);
 if(net!==r.subtotalCents||net!==r.items[0].netCents||net+tax!==total||total!==r.totalCents)return cache;
 const unnecessary=new Set(['Total amount charged is monthly; actual paid amount not specified.','Total amount charged is monthly; actual payment details are not provided.']);
 return {...cache,receipt:{...r,taxCents:tax,items:[{...r.items[0],itemTaxCents:tax}],uncertainties:(r.uncertainties||[]).filter(s=>!unnecessary.has(s))},sourceRepair:{kind:'google_one_printed_taxes',note:'State and local sales tax were added from the printed receipt and reconciled with the printed monthly charge. Source explicitly states this renewal was charged.'}};
}
module.exports={correctBlickUnitAmounts,correctGoogleOneTaxes};
