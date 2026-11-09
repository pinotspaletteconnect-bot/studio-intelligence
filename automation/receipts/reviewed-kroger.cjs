'use strict';
function correctReviewedKroger(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox==='stellaseaselempirereceipts@gmail.com'&&s.sourceMessageId==='1a122a059be02215'&&r?.vendor==='Kroger'&&r.totalCents===300&&s.attachments?.length===1&&s.attachments[0].filename==='Kroger 10.9.26.jpg'&&s.attachments[0].size===62726){
  const items=[['Lemons',499],['Limes',299]].map(([description,netCents])=>({description,quantity:1,netCents,itemTaxCents:0,evidence:'Original receipt photo: '+description+' '+(netCents/100).toFixed(2)}));
  return {...cache,receipt:{...r,date:'2026-10-09',reference:'587-660-165',items,subtotalCents:798,taxCents:0,orderDiscountCents:0,deliveryCents:0,otherFeesCents:0,totalCents:798,paidAmountCents:798,uncertainties:[]},sourceRepair:{kind:'visually_reviewed_kroger_receipt',note:'Original photo reviewed November 9: October 9, 2026, transaction 587 660 165; lemons $4.99 plus limes $2.99, tax $0, balance and Visa payment $7.98. The $3.00 is savings, not the charge or an additional discount. Apply confirmed garnish category rules.'}};
 }
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='1a10dee3995008ac'||r?.vendor!=='Kroger'||r.reference!=='515083'||r.totalCents!==1831||r.date!=='2026-10-03'||!s.attachments?.some(a=>a.filename==='Kroger 10.5.26.jpg'&&a.size===69675))return cache;
 const items=[['BIGELOW TEA',3,897],['KRO ZERO SUGAR TON',2,200],['KRO CLUB SODA',2,200],['KRO RS LEMONADE',2,518]].map(([description,quantity,netCents])=>({description,quantity,netCents,itemTaxCents:null,evidence:'Original photo visually reviewed November 8; extended amount for '+quantity+' items.'}));
 if(items.reduce((n,i)=>n+i.netCents,0)+16!==1831)throw Error('Reviewed Kroger arithmetic mismatch');
 return {...cache,receipt:{...r,items,subtotalCents:1815,taxCents:16,orderDiscountCents:0,deliveryCents:0,otherFeesCents:0,paidAmountCents:1831,uncertainties:[]},sourceRepair:{kind:'visually_reviewed_kroger_receipt',note:'Original photo: nine items, three teas at $2.99, two tonic waters at $1, two club sodas at $1, two lemonades at $2.59. Net items $18.15 plus tax $.16 equals Visa payment $18.31. Printed $2.40 savings is already reflected in selling prices, not a second discount. Product categories still require confirmed rules.'}};
}
module.exports={correctReviewedKroger};

