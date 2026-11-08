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
function correctReviewedAutojateDiscount(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a197c0e676af3a9'||r?.vendor!=='Autojate'||r.reference!=='REC10008'||r.date!=='2026-11-01'||r.items?.length!==1||!r.items[0].description.startsWith('Jesse - Pinot')||r.subtotalCents!==9950||r.orderDiscountCents!==1990||r.totalCents!==7960||r.paidAmountCents!==7960||r.taxCents||r.deliveryCents||r.otherFeesCents||r.uncertainties?.length)return cache;
 if(!s.attachments?.some(a=>a.filename==='REC10008.pdf'&&a.size===15773))return cache;
 return {...cache,receipt:{...r,subtotalCents:7960,orderDiscountCents:0,items:[{...r.items[0],netCents:7960}],reviewedPrintedAmounts:{subtotalCents:9950,discountCents:1990,totalCents:7960}},sourceRepair:{kind:'reviewed_single_line_discount',note:'Original REC10008.pdf visually reviewed 2026-11-08: single phone-service line $99.50, discount $19.90, paid $79.60. Entire discount applies to that sole line. Summary reports net $79.60; original PDF retains printed amounts.'}};
}
function correctShippoPayment(cache) {
 const r=cache?.receipt,s=cache?.source,text=String(s?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='Shippo'||s.attachments?.length||!text.includes('From: Shippo <noreply@shippo.com>')||!text.includes('Invoice Payment Confirmation'))return cache;
 const refs=[...text.matchAll(/Invoice #(\d+)/g)];
 const paid=[...text.matchAll(/This is confirmation that we have received payment for ([^\n]+?) for (\d+) transactions? with a total of \$(\d+\.\d{2}) USD\./g)];
 if(refs.length!==1||refs[0][1]!==r.reference||paid.length!==1||Number(paid[0][2])<1)return cache;
 const cents=Math.round(Number(paid[0][3])*100);
 if(!Number.isSafeInteger(cents)||cents<=0||r.totalCents!==cents||r.paidAmountCents!==cents||r.subtotalCents!==cents||r.taxCents||r.deliveryCents||r.otherFeesCents||r.orderDiscountCents)return cache;
 const allowed=/^(?:No itemized line items provided in the receipt\.|No itemized details for the \d+ transactions are provided\.)$/;
 if((r.uncertainties||[]).some(u=>!allowed.test(u)))return cache;
 if(r.items?.length>1||(r.items?.length===1&&(r.items[0].description!=='Invoice Payment Confirmation'||r.items[0].netCents!==cents)))return cache;
 return {...cache,receipt:{...r,items:[{description:'Invoice Payment Confirmation',quantity:1,netCents:cents,itemTaxCents:null,evidence:paid[0][0]}],uncertainties:[]},sourceRepair:{kind:'shippo_confirmed_aggregate_postage',note:'Owner explicitly confirmed all Shippo charges are shipping and postage. Source confirms payment for '+paid[0][2]+' transactions; the summary uses the single invoice payment total, not invented per-label prices.'}};
}
module.exports={correctBlickUnitAmounts,correctGoogleOneTaxes,correctReviewedAutojateDiscount,correctShippoPayment};
