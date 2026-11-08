'use strict';
function correctReviewedHeidelberg(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='1a18deac1df19385'||r?.vendor!=='Heidelberg Columbus'||r.reference!=='90008895'||r.totalCents!==35304||r.items?.length!==6||!s.attachments?.some(a=>a.filename==='10.28.26.jpg'&&a.mimeType==='image/jpeg'&&a.size===76769))return cache;
 const printed=[['Modelo Especial 12OZ 24PK Cn Pilsner Style Lager',1,2239],["Barritt's 12OZ 4/6PK Cn Ginger",1,2299],['Malibu 750ML Coconut Rum-12 NV',2,2308],['Tangley Oaks 750ML Chard 12 18',1,5068],["McManis 750ML Pinot Noir 12 25",1,9595],['Maschio 750ML Prosecco Brut 12',1,13595]];
 const items=printed.map(([description,quantity,netCents])=>({description,quantity,netCents,itemTaxCents:null,evidence:'Visually verified printed extended line amount: '+(netCents/100).toFixed(2)}));
 if(items.reduce((n,i)=>n+i.netCents,0)+200!==35304)throw Error('Reviewed Heidelberg arithmetic mismatch');
 return {...cache,receipt:{...r,date:'2026-10-28',items,subtotalCents:35104,taxCents:null,deliveryCents:null,orderDiscountCents:0,otherFeesCents:200,paidAmountCents:null,uncertainties:[],reviewedPrintedAmounts:{totalSalesCents:46279,discountCents:11175,totalContentCents:35104,splitCaseChargeCents:200,totalCents:35304}},sourceRepair:{kind:'visually_reviewed_heidelberg_invoice',note:'Original 10.28.26.jpg reviewed 2026-11-08. Six extended line amounts already include discounts and sum to $351.04; printed split case bottle charge $2.00 gives invoice total $353.04. Printed date is October 28, 2026. Tax and payment are not independently stated; neither is invented. Categories still require saved rules.'}};
}

function correctReviewedNorthVernon(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='trooperseaselempirereceipts@gmail.com'||s.sourceMessageId!=='1a06d1b1f79bc35a'||r?.vendor!=='NORTH VERNON BEVERAGE CO. INC.'||r.reference!=='60227730'||r.date!=='2026-09-04'||r.totalCents!==12850||r.paidAmountCents!==12850||r.items?.length!==4||!s.attachments?.some(a=>a.filename==='pro-3RH8GlnG.jpeg'&&a.size===587233))return cache;
 const printed=[['MICH ULTRA 24/12 LNNR',2595],['SHOCKT BELG WH 4/6 NR',3015],['STELLA ARTOIS 4/6 NR 11.2',3680],['MODELO ESP LOOSE LNNR',3560]];
 const items=printed.map(([description,netCents])=>({description,quantity:1,netCents,itemTaxCents:null,evidence:'Original invoice 60227730 visually verified line amount '+(netCents/100).toFixed(2)}));
 if(items.reduce((n,i)=>n+i.netCents,0)!==r.totalCents)throw Error('Reviewed North Vernon arithmetic mismatch');
 return {...cache,receipt:{...r,items,subtotalCents:12850,taxCents:null,deliveryCents:null,otherFeesCents:null,orderDiscountCents:0,uncertainties:[]},sourceRepair:{kind:'visually_reviewed_north_vernon_invoice',note:'Original pro-3RH8GlnG.jpeg visually reviewed 2026-11-08. Four printed beer case amounts $25.95, $30.15, $36.80 and $35.60 exactly total $128.50; printed discount .00. Separate tax or fees are not printed. Corrected extraction misreads; original retained unchanged.'}};
}
function correctFishCleaningPayment(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='FISH WINDOW CLEANING - COLUMBUS'||s.attachments?.length||!t.includes('outgoing@safewebservices.com')||
   !t.includes('Your card has been charged by FISH WINDOW CLEANING - COLUMBUS.')||!t.includes('Credit Card Sale'))return cache;
 const totals=[...t.matchAll(/^Total ([\d]+\.[\d]{2})$/gm)],taxes=[...t.matchAll(/^Tax ([\d]+\.[\d]{2})$/gm)],refs=[...t.matchAll(/Reference #\s*\n\s*(\d+)/g)];
 if(totals.length!==1||taxes.length!==1||refs.length!==1||refs[0][1]!==r.reference)return cache;
 const gross=Math.round(Number(totals[0][1])*100),tax=Math.round(Number(taxes[0][1])*100);
 if(gross<=tax||tax<0||r.totalCents!==gross||r.taxCents!==tax||(r.paidAmountCents!=null&&r.paidAmountCents!==gross)||
   r.items?.length!==1||!['Total','Line Items'].includes(r.items[0].description)||![gross,gross-tax].includes(r.items[0].netCents)||
   [r.deliveryCents,r.otherFeesCents,r.orderDiscountCents].some(n=>n!=null&&n!==0))return cache;
 const allowed=new Set(['Subtotal amount is not explicitly provided; only total and tax are mentioned.','Line item details are not explicitly provided.']);
 if(!(r.uncertainties||[]).every(u=>allowed.has(u)))return cache;
 return {...cache,receipt:{...r,subtotalCents:gross-tax,paidAmountCents:gross,items:[{...r.items[0],description:'Window Cleaning',netCents:gross-tax,itemTaxCents:tax,evidence:totals[0][0]}],uncertainties:[]},sourceRepair:{kind:'window_cleaning_printed_total_tax',note:'Payment receipt explicitly says the card was charged for window cleaning. Service net is the printed Total less the separately printed Tax; both printed figures are preserved and reconcile exactly. Owner-confirmed window-cleaning category applies across studios.'}};
}

function correctCanvasDepotPayment(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'');
 if(!r||!['DYNAMIC WHOLESALE SIGNS','Canvas Depot','The Canvas Depot'].includes(r.vendor)||s.attachments?.length||
   !t.includes('Your Card Sale is complete!')||!t.includes('The Canvas Depot')||!t.includes('outgoing@safewebservices.com'))return cache;
 const amounts=[...t.matchAll(/\$([0-9]+\.[0-9]{2})/g)],refs=[...t.matchAll(/Order ID\s*\n\s*(INV\s+\d+)/g)];
 const cents=amounts.length===1?Math.round(Number(amounts[0][1])*100):null;
 if(!cents||refs.length!==1||refs[0][1]!==r.reference||r.totalCents!==cents||(r.paidAmountCents!=null&&r.paidAmountCents!==cents)||r.subtotalCents!==cents||
   r.items?.length!==1||r.items[0].netCents!==cents||!/^The Canvas Depot$/i.test(r.items[0].description)||
   [r.taxCents,r.deliveryCents,r.otherFeesCents,r.orderDiscountCents].some(n=>n!=null&&n!==0))return cache;
 const allowed=new Set(['No tax, delivery, or discount details provided.','Total amount matches the subtotal; no tax or additional fees are specified.']);
 if(!(r.uncertainties||[]).every(u=>allowed.has(u)))return cache;
 return {...cache,receipt:{...r,paidAmountCents:cents,uncertainties:[]},sourceRepair:{kind:'confirmed_canvas_depot_gross_payment',note:'Completed card-sale receipt identifies Canvas Depot and its invoice reference. Owner assigns Canvas Depot purchases to Special Class Products COGS. The full printed payment is classified; a separate tax or fee breakdown is not stated and has not been invented.'}};
}
function correctBlickUnitAmounts(cache) {
 const r=cache?.receipt,text=String(cache?.source?.text||'');
 if(!/^Blick(?: Art Materials)?$/i.test(r?.vendor||'')||!Array.isArray(r.items)||!r.items.length)return cache;
 const cents=s=>Math.round(Number(String(s).replace(/,/g,''))*100);
 const items=[];
 for(const item of r.items){
  const parts=text.split(item.description);
  if(parts.length!==2)return cache;
  const m=parts[1].match(/^\s*Qty:\s*(\d+)\s+(?:In stock and reserved|\d+ Units In stock and Reserved; \d+ Units on Backorder until \d{1,2}\/\d{1,2}\/\d{4})\s+\$\s*([\d,]+\.\d{2})(?:\s+each\s*\$\s*([\d,]+\.\d{2}))?/i);
  if(!m||Number(m[1])!==item.quantity)return cache;
  const line=cents(m[2]),unit=m[3]?cents(m[3]):line;
  if(!Number.isSafeInteger(line)||line<=0||unit*item.quantity!==line||![line,unit,line*item.quantity].includes(item.netCents))return cache;
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
function correctReviewedCintas(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a130a62a28c7ece'||r?.vendor!=='CINTAS'||r.reference!=='4218411442'||r.date!=='2026-09-07'||r.totalCents!==18742||r.taxCents!==1061||!s.attachments?.some(a=>a.filename==='Epson_10122026080516.pdf'&&a.size===640678))return cache;
 const printed=[['SIG AUTOPAPER DRG ALU',2,50],['FC4 NEUTRAL FLR CLNR',1,362],['SIG AIR SVC',1,2431],['SIG SOAP SVC',1,954],['SIG SANT SVC',1,1924],['A0004 PINOT PALETTE LOGO MAT',1,4345],['HRDWD DRK PAPER LRG',2,3735],["SANI'S BOWL CLIP SVC",2,1268],['SIG HND SNTZR STAND',1,560],['SERVICE CHARGE',1,2052]];
 const items=printed.map(([description,quantity,netCents])=>({description,quantity,netCents,itemTaxCents:null,evidence:'Visually verified original line total: '+(netCents/100).toFixed(2)}));
 if(items.reduce((n,i)=>n+i.netCents,0)+r.taxCents!==r.totalCents)throw Error('Reviewed Cintas arithmetic mismatch');
 return {...cache,receipt:{...r,items,subtotalCents:17681,otherFeesCents:0,deliveryCents:0,orderDiscountCents:0,uncertainties:[],reviewedPrintedAmounts:{serviceSubtotalCents:15629,serviceChargeCents:2052,subtotalCents:17681,taxCents:1061,totalCents:18742}},sourceRepair:{kind:'visually_reviewed_cintas_invoice',note:'Original invoice 4218411442 visually reviewed 2026-11-08. Nine positive service lines total $156.29; separately printed service charge $20.52; subtotal $176.81; tax $10.61; total $187.42. Zero-price refill lines remain on original PDF. Categories still require saved owner approval.'}};
}
function correctOutshineServicePayment(cache) {
 const r=cache?.receipt,s=cache?.source,text=String(s?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='Outshine Window Cleaning'||s.attachments?.length||!text.includes('From: Xplor Pay <no-reply@xplorpay.com>')||!text.includes('SALE, APPROVED'))return cache;
 const refs=[...text.matchAll(/Transaction ID:\s*(\d+)/g)],dates=[...text.matchAll(/Transaction Date:\s*(\d{2})\/(\d{2})\/(\d{4})/g)];
 const amounts=[...text.matchAll(/Amount:\s*(\d+\.\d{2}) USD\s*Sales Tax:\s*(\d+\.\d{2}) USD\s*Tip:\s*(\d+\.\d{2}) USD\s*Total:\s*(\d+\.\d{2}) USD/g)];
 if(refs.length!==1||refs[0][1]!==r.reference||dates.length!==1||`${dates[0][3]}-${dates[0][1]}-${dates[0][2]}`!==r.date||amounts.length!==1)return cache;
 const [net,tax,tip,total]=amounts[0].slice(1).map(n=>Math.round(Number(n)*100));
 if(net<=0||tax!==0||tip!==0||net!==total||r.totalCents!==total||r.paidAmountCents!==total||r.subtotalCents!==net||r.taxCents||r.deliveryCents||r.otherFeesCents||r.orderDiscountCents)return cache;
 if(r.items?.length!==1||!['Amount','Window Cleaning'].includes(r.items[0].description)||r.items[0].netCents!==net)return cache;
 const allowed=new Set(['No itemized line items provided; only total amount available.','No itemized list of services provided.']);
 if((r.uncertainties||[]).some(u=>!allowed.has(u)))return cache;
 return {...cache,receipt:{...r,items:[{...r.items[0],description:'Window Cleaning',evidence:amounts[0][0]}],uncertainties:[]},sourceRepair:{kind:'confirmed_window_cleaning_payment',note:'Owner previously confirmed Outshine as window cleaning. The approved payment receipt explicitly reconciles amount, zero tax, zero tip and total. A single service amount is retained; no additional service details are invented.'}};
}
function correctReviewedTarget(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a0e940cf111b81e'||r?.vendor!=='Target'||r.date!=='2026-09-28'||r.totalCents!==1060||r.items?.length!==1||r.items[0].description!=='Mondo Llama'||r.items[0].netCents!==1000||!s.attachments?.some(a=>a.filename==='pro-RTGVbqtE.jpeg'&&a.size===863310))return cache;
 return {...cache,receipt:{...r,reference:'2-6271-2473-0160-7748-7',subtotalCents:1000,taxCents:60,paidAmountCents:1060},sourceRepair:{kind:'visually_reviewed_target_receipt',note:'Original photo reviewed November 8: REC#2-6271-2473-0160-7748-7, two Mondo Llama items at $5 each, subtotal $10, tax $.60, total and printed card charge $10.60. Handwritten Cash is retained on the original, not treated as proof of payment method. Product type still requires an owner answer.'}};
}
module.exports={correctReviewedTarget,correctReviewedHeidelberg,correctReviewedNorthVernon,correctFishCleaningPayment,correctCanvasDepotPayment,correctBlickUnitAmounts,correctGoogleOneTaxes,correctReviewedAutojateDiscount,correctShippoPayment,correctReviewedCintas,correctOutshineServicePayment};
