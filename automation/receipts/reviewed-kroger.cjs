'use strict';
function correctReviewedKroger(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='1a10dee3995008ac'||r?.vendor!=='Kroger'||r.reference!=='515083'||r.totalCents!==1831||r.date!=='2026-10-03'||!s.attachments?.some(a=>a.filename==='Kroger 10.5.26.jpg'&&a.size===69675))return cache;
 const items=[['BIGELOW TEA',3,897],['KRO ZERO SUGAR TON',2,200],['KRO CLUB SODA',2,200],['KRO RS LEMONADE',2,518]].map(([description,quantity,netCents])=>({description,quantity,netCents,itemTaxCents:null,evidence:'Original photo visually reviewed November 8; extended amount for '+quantity+' items.'}));
 if(items.reduce((n,i)=>n+i.netCents,0)+16!==1831)throw Error('Reviewed Kroger arithmetic mismatch');
 return {...cache,receipt:{...r,items,subtotalCents:1815,taxCents:16,orderDiscountCents:0,deliveryCents:0,otherFeesCents:0,paidAmountCents:1831,uncertainties:[]},sourceRepair:{kind:'visually_reviewed_kroger_receipt',note:'Original photo: nine items, three teas at $2.99, two tonic waters at $1, two club sodas at $1, two lemonades at $2.59. Net items $18.15 plus tax $.16 equals Visa payment $18.31. Printed $2.40 savings is already reflected in selling prices, not a second discount. Product categories still require confirmed rules.'}};
}
module.exports={correctReviewedKroger};
