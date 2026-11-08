const test=require('node:test'),assert=require('node:assert/strict');
const {correctBlickUnitAmounts}=require('./receipt-source-repairs.cjs');
test('Cintas payment retains one printed invoice and the owner-confirmed service category',()=>{
 const fix=require('./receipt-source-repairs.cjs').correctCintasInvoicePayment;
 const text='From: myCintas Support <support@cintas.com>\nYour payment has been submitted.\nInvoice Date\nAccount\nInvoice #\nInvoice Total\nPayment\n08/10/2026\nPINOT\nUnited States\n0012928160\n4278494581\n$207.22\n$207.22\nSelected Invoice Total:\n$207.22\nCredits Applied:\n$0.00\nTotal Payment:\n$207.22';
 const c={source:{text,attachments:[]},receipt:{vendor:'myCintas',documentKind:'payment_only',reference:'0012928160',date:'2026-08-10',totalCents:20722,paidAmountCents:20722,items:[],uncertainties:['No itemized line items present.']}};
 const r=fix(c);assert.equal(r.receipt.reference,'4278494581');assert.equal(r.receipt.items[0].netCents,20722);assert.equal(r.receipt.vendor,'Cintas');assert.match(r.sourceRepair.note,/settlement.*not asserted/);
 assert.equal(fix({...c,receipt:{...c.receipt,uncertainties:['No itemized line items present in the receipt.']}}).receipt.reference,'4278494581');
 const uncertain={...c,receipt:{...c.receipt,uncertainties:['Invoice total is unclear.']}};assert.equal(fix(uncertain),uncertain);
 for(const v of [{...c,source:{text:text.replace('Credits Applied:\n$0.00','Credits Applied:\n$1.00'),attachments:[]}},{...c,source:{text:text+'\nUnited States\n001\n002\n$1.00\n$1.00',attachments:[]}},{...c,receipt:{...c.receipt,totalCents:1}},{...c,source:{text,attachments:[{}]}}])assert.equal(fix(v),v);
});
test('Uber booking fee remains a charge and is not counted again as tax',()=>{
 const fix=require('./receipt-source-repairs.cjs').correctReviewedUberBookingFee;
 const c={source:{sourceMessageId:'1a0a4de6e04e1543',mailbox:'stellaseaselempirereceipts@gmail.com',attachments:[],text:'From: Uber Receipts <noreply@uber.com>\nTotal $15.96\nTrip fare $12.75\nBooking Fee\n<https://example.com/link>\n$1.21\nTip $2.00\nMastercard ••••5929 $15.96\nReceipt ID # 1d5e7c67-9f90-4a63-af79-1c0b5b29d6cf'},receipt:{vendor:'Uber',reference:'1d5e7c67-9f90-4a63-af79-1c0b5b29d6cf',date:'2026-09-15',totalCents:1596,paidAmountCents:1596,subtotalCents:1275,taxCents:121,items:[['Trip fare',1275],['Booking Fee',121],['Tip',200]].map(([description,netCents])=>({description,netCents,itemTaxCents:121})),uncertainties:[]}};
 const r=fix(c);assert.equal(r.receipt.taxCents,null);assert.equal(r.receipt.items.reduce((s,i)=>s+i.netCents,0),1596);assert.equal(r.receipt.items[1].evidence,'$1.21');
 for(const v of [{...c,receipt:{...c.receipt,totalCents:1597}},{...c,source:{...c.source,text:c.source.text.replace('$1.21','$1.22')}},{...c,source:{...c.source,attachments:[{}]}}])assert.equal(fix(v),v);
});
test('reviewed Sams aggregate tax removes invented item zeros without changing printed amounts',()=>{
 const fix=require('./receipt-source-repairs.cjs').correctReviewedSamsAggregateTax;
 const c={source:{sourceMessageId:'1a02073e37503ae7',attachments:[{filename:'pro-RD4bLPuI.jpeg',size:119397}]},receipt:{reference:'8000000060458803',date:'2026-08-20',totalCents:10416,subtotalCents:9789,taxCents:627,items:[1848,1848,1848,1324,828,2093].map(netCents=>({netCents,itemTaxCents:0})),uncertainties:[]}};
 assert.ok(fix(c).receipt.items.every(i=>i.itemTaxCents===null));assert.equal(fix(c).receipt.totalCents,10416);assert.equal(c.receipt.items[0].itemTaxCents,0);
 for(const changed of [{...c,source:{...c.source,sourceMessageId:'other'}},{...c,receipt:{...c.receipt,totalCents:10417}},{...c,receipt:{...c.receipt,items:c.receipt.items.map(i=>({...i,itemTaxCents:1}))}}])assert.equal(fix(changed),changed);
});
test('Ohio service invoice separates usage quantities from prices and preserves payment credit evidence',()=>{
 const {correctOhioPestService:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'stellaseaselempirereceipts@gmail.com',sourceMessageId:'19f48622e1a7ac61',attachments:[{filename:'Ohio Exterminating Co Statement.pdf',size:38902}],text:'From: Ohio Exterminating Co. <bookkeeper@ohioexterminating.com>\nInvoice #\n548178\nMonthly Pest Control\n74.00\nSubtotal:\n74.00\nTax:\n5.92\nInvoice Total:\n$ 79.92\nCC/ACH EFT Payment XXXX9312\n-79.92\nBalance Due this Invoice:\n$ 0.00\nMaterials\nEPA\nDescription\nAmount\nUnits'},receipt:{vendor:'Ohio Exterminating Co.',reference:'548178',date:'2026-07-08',totalCents:7992,subtotalCents:7400,taxCents:592,paidAmountCents:-7992,items:['Monthly Pest Control','CONTRAC BLOX Target Pests: Mice','First Strike Target Pests: Mice, Rat','Transport Mikron Gallon Target Pests: General Treatment'].map(description=>({description})),uncertainties:['Invoice total and paid amount match, but itemized details for tax and fees are not clearly separated.']}};
 const r=fix(c).receipt;assert.equal(r.items.length,1);assert.equal(r.items[0].netCents+r.items[0].itemTaxCents,r.totalCents);assert.equal(r.paidAmountCents,7992);assert.equal(r.reviewedPrintedAmounts.paymentLedgerCents,-7992);assert.equal(r.materialUsage.length,3);
 for(const bad of [{...c,source:{...c.source,sourceMessageId:'other'}},{...c,source:{...c.source,text:c.source.text.replace('$ 0.00','$ 10.00')}},{...c,receipt:{...c.receipt,totalCents:8000}},{...c,receipt:{...c.receipt,uncertainties:['Another invoice omitted.']}}])assert.equal(fix(bad),bad);
});
test('reviewed Heidelberg line amounts reconcile without double-discounting or inventing payment',()=>{
 const {correctReviewedHeidelberg:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'stellaseaselempirereceipts@gmail.com',sourceMessageId:'1a18deac1df19385',attachments:[{filename:'10.28.26.jpg',mimeType:'image/jpeg',size:76769}]},receipt:{vendor:'Heidelberg Columbus',reference:'90008895',totalCents:35304,items:Array(6).fill({})}};
 const r=fix(c).receipt;
 assert.equal(r.items.reduce((n,i)=>n+i.netCents,0)+r.otherFeesCents,r.totalCents);
 assert.equal(r.date,'2026-10-28');assert.equal(r.paidAmountCents,null);assert.equal(r.taxCents,null);assert.equal(r.orderDiscountCents,0);
 for(const source of [{...c.source,mailbox:'wrong'},{...c.source,sourceMessageId:'wrong'},{...c.source,attachments:[]}]){const bad={...c,source};assert.equal(fix(bad),bad);}
});

test('window-cleaning net derives only from explicit printed total and tax with charged status',()=>{
 const {correctFishCleaningPayment:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{text:'From: outgoing@safewebservices.com\nYour card has been charged by FISH WINDOW CLEANING - COLUMBUS.\nTotal 40.96\nTax 2.56\nReference #\n4414875588\nCredit Card Sale',attachments:[]},receipt:{vendor:'FISH WINDOW CLEANING - COLUMBUS',reference:'4414875588',totalCents:4096,taxCents:256,paidAmountCents:null,items:[{description:'Total',netCents:4096}],uncertainties:['Subtotal amount is not explicitly provided; only total and tax are mentioned.']}};
 const r=fix(c).receipt;assert.equal(r.subtotalCents,3840);assert.equal(r.items[0].netCents+r.items[0].itemTaxCents,r.totalCents);assert.equal(r.paidAmountCents,4096);
 const net={...c,receipt:{...c.receipt,subtotalCents:3840,items:[{description:'Line Items',netCents:3840,itemTaxCents:256}]}};
 assert.equal(fix(net).receipt.items[0].description,'Window Cleaning');assert.equal(fix(net).receipt.items[0].netCents,3840);
 for(const delta of [{reference:'wrong'},{taxCents:257},{paidAmountCents:1},{uncertainties:['Additional receipts omitted.']}]){const bad={...c,receipt:{...c.receipt,...delta}};assert.equal(fix(bad),bad);}
 const extra={...c,source:{...c.source,text:c.source.text+'\nTotal 50.00'}};assert.equal(fix(extra),extra);
});

test('Canvas Depot payment preserves unknown tax and requires exact printed amount and invoice',()=>{
 const {correctCanvasDepotPayment}=require('./receipt-source-repairs.cjs');
 const c={source:{text:'From: outgoing@safewebservices.com\nYour Card Sale is complete!\n$139.50\nDescription\nThe Canvas Depot\nOrder ID\nINV 6568',attachments:[]},receipt:{vendor:'DYNAMIC WHOLESALE SIGNS',reference:'INV 6568',totalCents:13950,paidAmountCents:13950,subtotalCents:13950,taxCents:null,items:[{description:'The Canvas Depot',netCents:13950}],uncertainties:['No tax, delivery, or discount details provided.']}};
 const fixed=correctCanvasDepotPayment(c);assert.equal(fixed.receipt.uncertainties.length,0);assert.equal(fixed.receipt.taxCents,null);assert.match(fixed.sourceRepair.note,/not been invented/);
 for(const delta of [{reference:'INV 999'},{totalCents:13951},{taxCents:10},{uncertainties:['Two charges may be combined.']}]){const bad={...c,receipt:{...c.receipt,...delta}};assert.equal(correctCanvasDepotPayment(bad),bad);}
 const two={...c,source:{...c.source,text:c.source.text+'\n$5.00'}};assert.equal(correctCanvasDepotPayment(two),two);
});

test('known window-cleaning service payment requires exact printed identity and balanced amounts',()=>{
 const {correctOutshineServicePayment:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{text:'From: Xplor Pay <no-reply@xplorpay.com>\nTransaction ID:\n912867490\nTransaction Date:\n10/26/2026 10:16 AM\nSALE, APPROVED\nAmount:\n26.50 USD\nSales Tax:\n0.00 USD\nTip:\n0.00 USD\nTotal:\n26.50 USD',attachments:[]},receipt:{vendor:'Outshine Window Cleaning',reference:'912867490',date:'2026-10-26',subtotalCents:2650,totalCents:2650,paidAmountCents:2650,items:[{description:'Amount',netCents:2650}],uncertainties:['No itemized line items provided; only total amount available.']}};
 const out=fix(c);assert.equal(out.receipt.items[0].description,'Window Cleaning');assert.deepEqual(out.receipt.uncertainties,[]);
 for(const wrong of [{...c,receipt:{...c.receipt,reference:'other'}},{...c,receipt:{...c.receipt,totalCents:2700}},{...c,receipt:{...c.receipt,uncertainties:['Multiple receipts present.']}},{...c,source:{...c.source,attachments:[{filename:'other.pdf'}]}}])assert.equal(fix(wrong),wrong);
});

test('reviewed Autojate discount stays bound to its original studio and receipt',()=>{
 const {correctReviewedAutojateDiscount:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'jessejayspinotreceipts@gmail.com',sourceMessageId:'1a197c0e676af3a9',attachments:[{filename:'REC10008.pdf',size:15773}]},receipt:{vendor:'Autojate',reference:'REC10008',date:'2026-11-01',subtotalCents:9950,orderDiscountCents:1990,totalCents:7960,paidAmountCents:7960,items:[{description:'Jesse - Pinots Palette',netCents:7950}],uncertainties:[]}};
 const out=fix(c);assert.equal(out.receipt.items[0].netCents,7960);assert.equal(out.receipt.orderDiscountCents,0);assert.equal(out.receipt.reviewedPrintedAmounts.discountCents,1990);assert.equal(c.receipt.items[0].netCents,7950);
 for(const wrong of [{...c,source:{...c.source,mailbox:'other@example.com'}},{...c,receipt:{...c.receipt,totalCents:8000}},{...c,receipt:{...c.receipt,items:[...c.receipt.items,...c.receipt.items]}}])assert.equal(fix(wrong),wrong);
});
test('Blick uses printed extended amounts only when all quantity and subtotal checks agree',()=>{
 const cache={source:{text:'Paint\nQty: 3\nIn stock and reserved\n$ 22.14\neach $ 7.38\nSubtotal: $22.14'},receipt:{vendor:'Blick Art Materials',subtotalCents:2214,items:[{description:'Paint',quantity:3,netCents:738}]}};
 assert.equal(correctBlickUnitAmounts(cache).receipt.items[0].netCents,2214);
 const backorder={source:{text:cache.source.text.replace('In stock and reserved','1 Units In stock and Reserved; 2 Units on Backorder until 11/18/2026')},receipt:{...cache.receipt,items:[{description:'Paint',quantity:3,netCents:6642}]}};
 assert.equal(correctBlickUnitAmounts(backorder).receipt.items[0].netCents,2214);
 assert.equal(correctBlickUnitAmounts({...cache,receipt:{...cache.receipt,subtotalCents:2200}}).receipt.items[0].netCents,738);
 assert.equal(correctBlickUnitAmounts({...cache,source:{text:cache.source.text.replace('Qty: 3','Qty: 2')}}).receipt.items[0].netCents,738);
 assert.equal(correctBlickUnitAmounts({...cache,source:{text:cache.source.text+'\nPaint'}}).receipt.items[0].netCents,738);
});

test('Google One sums printed state and local tax without inventing a charge',()=>{
 const {correctGoogleOneTaxes}=require('./receipt-source-repairs.cjs');
 const receipt={vendor:'Google LLC',reference:'SOP.123',subtotalCents:299,taxCents:17,totalCents:323,items:[{description:'200 GB (Google One)',netCents:299,itemTaxCents:17}],uncertainties:['Total amount charged is monthly; actual paid amount not specified.']};
 const c={receipt,source:{text:"From: Google Play <googleplay-noreply@google.com>\nOrder number: SOP.123\n$2.99/month\nState sales tax: $0.17\nLocal sales tax: $0.07\nTotal: $3.23/month\nYour subscription continues and you've been charged"}};
 const fixed=correctGoogleOneTaxes(c);assert.equal(fixed.receipt.taxCents,24);assert.equal(fixed.receipt.items[0].itemTaxCents,24);assert.deepEqual(fixed.receipt.uncertainties,[]);
 const duration={...c,receipt:{...receipt,uncertainties:['Total amount charged is monthly; actual payment may vary based on subscription duration.','Other invoice is missing.']}};
 assert.deepEqual(correctGoogleOneTaxes(duration).receipt.uncertainties,['Other invoice is missing.']);
 const uncharged={...duration,source:{text:c.source.text.replace("continues and you've been charged",'renews next month')}};
 assert.equal(correctGoogleOneTaxes(uncharged),uncharged);
 assert.equal(correctGoogleOneTaxes({...c,receipt:{...receipt,totalCents:324}}).receipt.totalCents,324);
 assert.equal(correctGoogleOneTaxes({...c,source:{text:c.source.text+'\nOrder number: SOP.456'}}).receipt.taxCents,17);
});
test('Shippo aggregate payment uses the printed amount only after all invoice checks match',()=>{
 const {correctShippoPayment}=require('./receipt-source-repairs.cjs');
 const c={source:{text:'From: Shippo <noreply@shippo.com>\nInvoice Payment Confirmation\nInvoice #12345\nThis is confirmation that we have received payment for Oct 11, 2026 for 4 transactions with a total of $46.00 USD.',attachments:[]},receipt:{vendor:'Shippo',reference:'12345',subtotalCents:4600,totalCents:4600,paidAmountCents:4600,items:[],uncertainties:['No itemized line items provided in the receipt.']}};
 const fixed=correctShippoPayment(c);
 assert.equal(fixed.receipt.items[0].netCents,4600);
 assert.equal(fixed.receipt.uncertainties.length,0);
 assert.equal(c.receipt.items.length,0);
 for(const delta of [{totalCents:4601},{reference:'wrong'},{uncertainties:['Two receipts disagree.']},{taxCents:1}]){const bad={...c,receipt:{...c.receipt,...delta}};assert.equal(correctShippoPayment(bad),bad);}
 const wrong={...c,source:{...c.source,text:c.source.text.replace('noreply@shippo.com','someone@example.com')}};assert.equal(correctShippoPayment(wrong),wrong);
});
test('visually reviewed Cintas correction is exact-source and balances printed service fee',()=>{
 const {correctReviewedCintas}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'jessejayspinotreceipts@gmail.com',sourceMessageId:'1a130a62a28c7ece',attachments:[{filename:'Epson_10122026080516.pdf',size:640678}]},receipt:{vendor:'CINTAS',reference:'4218411442',date:'2026-09-07',totalCents:18742,taxCents:1061}};
 const r=correctReviewedCintas(c).receipt;
 assert.equal(r.items.reduce((n,i)=>n+i.netCents,0),17681);
 assert.equal(r.items.at(-1).netCents,2052);
 const wrong={...c,source:{...c.source,mailbox:'other@example.com'}};
 assert.equal(correctReviewedCintas(wrong),wrong);
 const changed={...c,receipt:{...c.receipt,totalCents:18743}};
 assert.equal(correctReviewedCintas(changed),changed);
});
test('reviewed North Vernon correction is restricted to the verified original',()=>{
 const {correctReviewedNorthVernon:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'trooperseaselempirereceipts@gmail.com',sourceMessageId:'1a06d1b1f79bc35a',attachments:[{filename:'pro-3RH8GlnG.jpeg',size:587233}]},receipt:{vendor:'NORTH VERNON BEVERAGE CO. INC.',reference:'60227730',date:'2026-09-04',totalCents:12850,paidAmountCents:12850,items:[{},{},{},{}]}};
 assert.deepEqual(fix(c).receipt.items.map(i=>i.netCents),[2595,3015,3680,3560]);
 assert.equal(fix(c).receipt.items.reduce((n,i)=>n+i.netCents,0),12850);
 for(const change of [{reference:'other'},{totalCents:12851},{date:'2026-09-05'}]){const bad={...c,receipt:{...c.receipt,...change}};assert.equal(fix(bad),bad);}
 const bad={...c,source:{...c.source,mailbox:'other'}};assert.equal(fix(bad),bad);
});
test('Target source repair corrects printed facts without guessing the item category',()=>{
 const {correctReviewedTarget:fix}=require('./receipt-source-repairs.cjs');
 const c={source:{mailbox:'jessejayspinotreceipts@gmail.com',sourceMessageId:'1a0e940cf111b81e',attachments:[{filename:'pro-RTGVbqtE.jpeg',size:863310}]},receipt:{vendor:'Target',date:'2026-09-28',totalCents:1060,subtotalCents:1060,reference:null,items:[{description:'Mondo Llama',netCents:1000}]}};
 const r=fix(c).receipt;assert.equal(r.reference,'2-6271-2473-0160-7748-7');assert.equal(r.subtotalCents+r.taxCents,r.totalCents);assert.equal(r.items[0].description,'Mondo Llama');assert.equal(r.items[0].accountId,undefined);
 const other={...c,source:{...c.source,sourceMessageId:'1a0e93eadf2ad6ba'}};assert.equal(fix(other),other);
});
