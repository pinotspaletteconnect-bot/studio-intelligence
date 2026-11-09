'use strict';
function correctReviewedSamsOctober(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'');
 const gross=[4468,2093,1848,1848,2998,1348,648];
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a12c4cae7fffed1'||s.attachments?.length||r?.vendor!=="Sam's Club"||r.reference!=='TC # 654014593427635654926'||r.date!=='2026-10-09'||r.totalCents!==15377||r.subtotalCents!==15251||r.taxCents!==876||r.orderDiscountCents!==750||r.items?.length!==7||!t.includes('$44.68')||!t.includes('$22.34 each')||!t.includes('Savings')||!t.includes('$7.50')||r.items.some((i,n)=>i.netCents!==(n===0?2234:gross[n])))return cache;
 const discounts=gross.map(n=>Math.floor(n*750/15251)),rank=gross.map((n,i)=>({i,r:n*750%15251})).sort((a,b)=>b.r-a.r||a.i-b.i);
 for(let n=0,left=750-discounts.reduce((a,b)=>a+b,0);n<left;n++)discounts[rank[n].i]++;
 return {...cache,receipt:{...r,subtotalCents:14501,orderDiscountCents:0,deliveryCents:0,otherFeesCents:0,items:r.items.map((i,n)=>({...i,quantity:n===0?2:1,netCents:gross[n]-discounts[n],itemTaxCents:null})),uncertainties:[]},sourceRepair:{kind:'reviewed_sams_extended_price_and_savings',note:'Original Sam’s email TC654014593427635654926 reviewed November9: PAPERPLATE extended amount44.68 is two at22.34 each. Seven product lines sum152.51. Printed savings7.50 allocated proportionally across extended lines using exact-cent rounding, leaving145.01; printed tax8.76 gives paid153.77. Line discount and tax allocation are estimates under the existing proportional allocation policy; no item-specific discount or tax is asserted. Original email retains the printed values.'}};
}
function correctReviewedKegOctober(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a1406ee13cdbf9b'||s.attachments?.length!==1||s.attachments[0].filename!=='20261015_123830.jpg'||s.attachments[0].size!==2263375||r?.vendor!=='Keg 1 Beer LLC'||r.totalCents!==9340||r.reference!=='59896')return cache;
 return {...cache,receipt:{...r,reference:'539896',date:'2026-10-15',subtotalCents:8740,taxCents:0,deliveryCents:600,otherFeesCents:0,orderDiscountCents:0,items:[{description:'ANG ORCH CRISP 12PK NR 12OZ',quantity:1,netCents:3200,itemTaxCents:0,evidence:'ANG ORCH CRISP 12PK NR 12OZ 32.00'},{description:'BLUE MN BEL W 12PK NR 12OZ',quantity:1,netCents:3060,itemTaxCents:0,evidence:'BLUE MN BEL W 12PK NR 12OZ PRICE 32.00 DISC 1.40 NET 30.60'},{description:'YUENG LAGER 12PK NR 12OZ',quantity:1,netCents:2480,itemTaxCents:0,evidence:'YUENG LAGER 12PK NR 12OZ 24.80'}],uncertainties:[]},sourceRepair:{kind:'visually_reviewed_keg_october_invoice',note:'Original 20261015_123830.jpg reviewed November 9: complete foreground invoice539896 dated October15,2026, three cases. Angry Orchard32.00, Blue Moon Belgian White30.60 after1.40 line discount, Yuengling Lager24.80 =87.40; printed MISC FUEL SURCHARGE6.00 gives93.40, paid by check. Fuel is treated as delivery cost under the existing proportional delivery-allocation policy, not sales tax. The October31 license-expiry date is not the invoice date. No second purchase is asserted from the covered paper underneath.'}};
}
function correctReviewedGordonFood(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a0206ee81c7465c'||s.attachments?.length!==1||s.attachments[0].filename!=='pro-oqGpp8hO.jpeg'||s.attachments[0].size!==901042||r?.vendor!=='Gordon Food Service Store'||r.totalCents!==7412||r.items?.length!==4||r.items.some((i,n)=>i.netCents!==[2498,1261,2798,799][n]))return cache;
 return {...cache,receipt:{...r,reference:'1515-4-243',date:'2026-08-20',subtotalCents:7356,taxCents:56,deliveryCents:0,orderDiscountCents:0,otherFeesCents:0,items:r.items.map((i,n)=>({...i,quantity:[2,1,2,1][n],itemTaxCents:n===3?56:0})),uncertainties:[]},sourceRepair:{kind:'visually_reviewed_gordon_food_quantities',note:'Original pro-oqGpp8hO.jpeg reviewed November9: store1515 lane4 transaction243, August20,2026. Two salami at $12.49=$24.98, cheese by weight $12.61, two crackers at $13.99=$27.98, Dawn $7.99. Six purchased units across four lines, not six different products. Net $73.56 plus printed tax $0.56 on the T-marked Dawn line equals $74.12. Extraction had mistaken salami SKU5016371 for transaction reference. Categories require saved owner rules.'}};
}
function correctMichaelsUnitAmounts(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='Michaels'||r.documentKind!=='order_confirmation'||s.attachments?.length||!t.includes('From: Michaels <no-reply@michaels.com>')||!Array.isArray(r.items)||!r.items.length||!t.includes('Order '+r.reference)||(r.uncertainties||[]).some(u=>u!=='The total amount charged matches the order total, but the itemized amounts do not clearly indicate individual item discounts or taxes applied.'))return cache;
 const sub=t.match(/Subtotal\s*\((\d+) items\)\s*\$([\d,]+\.\d{2})/),tax=t.match(/Taxes\s*\$([\d,]+\.\d{2})/),total=t.match(/Order Total\s*\$([\d,]+\.\d{2})/),voucher=t.match(/Voucher\s*-\$([\d,]+\.\d{2})/);
 if(!sub||!tax||!total||!t.match(/Shipping\s*Free/))return cache;
 const cents=v=>Math.round(Number(v.replace(/,/g,''))*100),subtotal=cents(sub[2]),taxCents=cents(tax[1]),totalCents=cents(total[1]),discount=voucher?cents(voucher[1]):0;
 if(totalCents!==r.totalCents||subtotal!==r.subtotalCents||taxCents!==r.taxCents||subtotal-discount+taxCents!==totalCents||r.items.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<=0||!Number.isSafeInteger(i.netCents)||i.netCents<=0||!t.includes('$'+(i.netCents/100).toFixed(2)))||r.items.reduce((n,i)=>n+i.quantity,0)!==Number(sub[1]))return cache;
 const gross=r.items.map(i=>i.quantity*i.netCents);if(gross.reduce((a,b)=>a+b,0)!==subtotal)return cache;
 const allocation=gross.map(n=>Math.floor(n*discount/subtotal)),remainder=discount-allocation.reduce((a,b)=>a+b,0),rank=gross.map((n,i)=>({i,r:n*discount%subtotal})).sort((a,b)=>b.r-a.r||a.i-b.i);for(let n=0;n<remainder;n++)allocation[rank[n].i]++;
 return {...cache,receipt:{...r,subtotalCents:subtotal-discount,orderDiscountCents:0,paidAmountCents:null,items:r.items.map((i,n)=>({...i,netCents:gross[n]-allocation[n],itemTaxCents:null})),uncertainties:[]},sourceRepair:{kind:'michaels_verified_extended_prices',note:'Original Michaels order lists unit prices beside quantities. Multiplying each unit price by its quantity exactly matches the printed subtotal and total item count. The printed voucher, if any, is allocated proportionally with exact-cent rounding; printed tax remains separate and total reconciles exactly. Order confirmation is preserved without claiming payment settlement. Categories still require saved owner rules.'}};
}
function correctReviewedMichaelsPaint(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'');
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a144d14bf7c5708'||s.attachments?.length||r?.vendor!=='Michaels'||r.reference!=='5200110909895173'||r.totalCents!==4403||!t.includes('$87.94')||!t.includes('-$20.00')||!t.includes('$26.40')||!t.includes('$2.49')||r.items?.length!==4)return cache;
 const gross=[1399,1678,1399,1678],qty=[1,2,1,2];
 if(r.items.some((i,n)=>i.quantity!==qty[n]||!i.description.includes('Acrylic Paint by Craft Smart')||i.netCents!==[1399,839,1399,839][n]))return cache;
 const discounts=gross.map(n=>Math.floor(n*2000/6154));let remaining=2000-discounts.reduce((a,b)=>a+b,0);
 const rank=gross.map((n,i)=>({i,remainder:n*2000%6154})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);for(let n=0;n<remaining;n++)discounts[rank[n].i]++;
 const items=r.items.map((i,n)=>({...i,netCents:gross[n]-discounts[n],itemTaxCents:null,evidence:i.evidence}));
 if(items.reduce((n,i)=>n+i.netCents,0)+249!==4403)throw Error('Michaels reviewed paint total mismatch');
 return {...cache,receipt:{...r,subtotalCents:4154,taxCents:249,deliveryCents:0,orderDiscountCents:0,otherFeesCents:0,paidAmountCents:4403,items,uncertainties:[]},sourceRepair:{kind:'source_verified_paint_voucher_allocation',note:'Original Michaels order5200110909895173: six paint containers. Extended sale prices $13.99, $16.78, $13.99, $16.78 sum $61.54, equal printed $87.94 before $26.40 savings. The separate $20 voucher is allocated proportionally over those four extended lines with exact-cent rounding, leaving $41.54; printed tax $2.49 brings total to $44.03. No discount is deducted twice. All items are acrylic paint under the owner-confirmed Paint Inventory rule.'}};
}
function correctReviewedPosterOrder(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'');
 if(s?.mailbox==='jessejayspinotreceipts@gmail.com'&&s.sourceMessageId==='1a130a1424e002df'&&!s.attachments?.length&&r?.vendor==='Amazon.com'&&r.reference==='111-8443245-5627403'&&r.date==='2026-10-12'&&r.totalCents===3495&&r.items?.length===1&&r.items[0].quantity===1&&r.items[0].netCents===3297&&r.items[0].description==='Displays2go Window Sign Holder for Banner Graphics'&&t.includes('Quantity: 1')&&/Grand Total:\s*\$34\.95/.test(t))return {...cache,receipt:{...r,subtotalCents:null,taxCents:null,deliveryCents:null,orderDiscountCents:null,otherFeesCents:null,paidAmountCents:null,items:[{...r.items[0],netCents:3495,itemTaxCents:null,evidence:'Grand Total: $34.95'}],uncertainties:[]},sourceRepair:{kind:'reviewed_single_product_order_gross_amount',note:'Original Amazon order111-8443245-5627403 confirms one Displays2go banner sign holder with item price $32.97 and grand total $34.95. The $1.98 difference is not itemized as tax or another fee. Summary assigns the gross order total to the single marketing item without asserting tax or payment settlement; original price remains in the source PDF.'}};
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a116ce50bcbca32'||s.attachments?.length||r?.vendor!=='Amazon.com'||r.reference!=='113-6368496-7846663'||r.date!=='2026-10-07'||r.totalCents!==6041||r.items?.length!==1||r.items[0].netCents!==5699||!t.includes('Grand Total:')||!t.includes('$60.41'))return cache;
 return {...cache,receipt:{...r,subtotalCents:null,taxCents:null,deliveryCents:null,orderDiscountCents:null,otherFeesCents:null,paidAmountCents:null,items:[{...r.items[0],netCents:6041,itemTaxCents:null,evidence:'$60.41'}],uncertainties:[]},sourceRepair:{kind:'reviewed_single_product_order_gross_amount',note:'Original Amazon order confirmation113-6368496-7846663 contains one product: poster-frame two-pack, displayed product price $56.99 and grand total $60.41. The $3.42 difference is not broken out as tax or another fee; no tax or settlement is asserted. The entire stated order total is assigned to the one product and the owner-confirmed Marketing category (answer96). Original item price remains visible in the original PDF; this summary uses the gross order amount, not an invented item-price or multi-product allocation.'}};
}
function correctReviewedStorage(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='19fa3a52726b728b'||r?.vendor!=='Go Store It - Grandview Heights'||r.reference!=='1736947649'||r.date!=='2026-07-26'||r.totalCents!==25152||s.attachments?.length!==1||s.attachments[0].filename!=='Receipt_1736947649.pdf'||s.attachments[0].size!==60512)return cache;
 return {...cache,receipt:{...r,subtotalCents:23400,taxCents:1752,orderDiscountCents:0,deliveryCents:0,otherFeesCents:0,paidAmountCents:25152,items:[{description:'Storage unit rent',quantity:1,netCents:21900,itemTaxCents:1752,evidence:'$219.00'},{description:'Storage unit protection plan',quantity:1,netCents:1500,itemTaxCents:0,evidence:'$15.00'}],uncertainties:[]},sourceRepair:{kind:'visually_reviewed_storage_tax',note:'Original PDF reviewed November 9: receipt1736947649, July26,2026. Storage rent $219 plus printed tax $17.52; related storage protection plan $15 with zero tax. Total paid $251.52. No discount is printed. Owner answer122 confirms storage unit; protection remains a separately identified rental-related line, not an assertion that the plan is an insurance policy.'}};
}
function correctBwcPolicyPayment(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='BWC'||r.documentKind!=='payment_only'||s.attachments?.length||r.items?.length||!t.includes('From: donotreply@bwc.state.oh.us <donotreply@bwc.state.oh.us>')||!t.includes('scheduling your payment'))return cache;
 const refs=[...t.matchAll(/Confirmation ID#:\s*(\d+)/g)],policies=[...t.matchAll(/Policy number:\s*(\d+)/g)],dates=[...t.matchAll(/Scheduled payment date:\s*(\d{2})\/(\d{2})\/(\d{4})/g)],amounts=[...t.matchAll(/\nAmount:\s*\$([\d,]+\.\d{2})/g)];
 if(refs.length!==1||policies.length!==1||dates.length!==1||amounts.length!==1||refs[0][1]!==r.reference)return cache;
 const cents=Math.round(Number(amounts[0][1].replace(/,/g,''))*100),date=dates[0][3]+'-'+dates[0][1]+'-'+dates[0][2];
 if(cents<=0||cents!==r.totalCents||date!==r.date||r.taxCents||r.deliveryCents||r.otherFeesCents||r.orderDiscountCents||(r.uncertainties||[]).some(u=>!/^No itemized line items present in the (?:receipt|document)\.$/.test(u)))return cache;
 return {...cache,receipt:{...r,subtotalCents:cents,paidAmountCents:null,items:[{description:'Ohio BWC workers compensation policy payment',quantity:1,netCents:cents,itemTaxCents:null,evidence:amounts[0][0].trim()}],uncertainties:[]},sourceRepair:{kind:'bwc_policy_payment_confirmation',note:'Original BWC email identifies one policy payment, confirmation number, scheduled date and amount. The summary classifies the policy payment as a single insurance line. Date is the scheduled payment date, not a service-period or bank-settlement assertion. Source says posting typically occurs later; no settlement is asserted. Studio comes from the receipt inbox, not the forwarding signature.'}};
}
function correctReviewedHeidelbergSeptember(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='1a06e05fcc75de01'||s.attachments?.length!==1||s.attachments[0].filename!=='Heidelberg 9.2.jpg'||s.attachments[0].size!==71999||r?.vendor!=='Heidelberg Columbus'||r.totalCents!==37333||r.items?.length!==5)return cache;
 const printed=[["Barritts Regular Ginger Beer 4x 6 Pack (12 oz Cans)",2299],['Charles & Charles Rose 750ML',8795],['McManis Pinot Noir 750ML',9595],['Maschio Prosecco Brut 750ML',11995],["Daily's Sweet & Sour RTU 1L",4649]];
 if(r.items.some((i,n)=>i.netCents!==printed[n][1])||(r.uncertainties||[]).some(u=>u!=='Total sales and total content amounts are provided, but tax and delivery details are not specified.'))return cache;
 return {...cache,receipt:{...r,reference:'90023044',date:'2026-09-02',subtotalCents:37333,taxCents:null,deliveryCents:null,otherFeesCents:0,orderDiscountCents:0,paidAmountCents:null,items:printed.map(([description,netCents])=>({description,quantity:1,netCents,itemTaxCents:null,evidence:'Visually verified extended line amount '+(netCents/100).toFixed(2)})),uncertainties:[],reviewedPrintedAmounts:{totalSalesCents:54933,discountCents:17600,totalContentCents:37333,totalCents:37333}},sourceRepair:{kind:'reviewed_heidelberg_september_invoice',note:'Original Heidelberg 9.2.jpg visually reviewed 2026-11-09: invoice 90023044 dated September 2, 2026. Five extended lines already include discounts and total $373.33. Printed gross sales $549.33 less $176 discount equals the $373.33 picksheet total. Do not deduct the discount twice. No separate tax or payment settlement is asserted. Barritts ginger beer uses the saved owner answer; product descriptions transcribed from original.'}};
}
function correctReviewedKeg1(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='jessejayspinotreceipts@gmail.com'||s.sourceMessageId!=='1a163f0fe9170f93'||s.attachments?.length!==1||s.attachments[0].filename!=='Epson_10222026070738.pdf'||s.attachments[0].size!==489095||r?.totalCents!==3800)return cache;
 return {...cache,receipt:{...r,vendor:'Keg1',reference:'543975',date:null,subtotalCents:3200,taxCents:null,deliveryCents:600,otherFeesCents:0,orderDiscountCents:0,items:[{description:'Angry Orchard Crisp 12PK',quantity:1,netCents:3200,itemTaxCents:null,evidence:'Printed positive-quantity line $32.00; fuel surcharge $6.00; total $38.00.'}],uncertainties:['Purchase date unavailable: invoice header is cut off and owner confirmed they do not know the date. Do not infer the purchase date from the scan filename or ask the owner again.']},sourceRepair:{kind:'owner_confirmed_keg1_unknown_date',note:'Owner confirmed supplier Keg1 on 2026-11-08 and explicitly does not know the purchase date. Visually reviewed invoice 543975: Angry Orchard $32 plus fuel surcharge $6, paid by check $38. Zero-quantity Blue Moon and Yuengling rows are preserved on the original only. Extraction had mistaken scanner name for vendor and scan filename for purchase date. Date remains unknown; receipt is not marked complete.'}};
}
function correctReviewedRockbot(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.sourceMessageId!=='19becf3beecda372'||s.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.attachments?.length!==1||s.attachments[0].filename!=="CI_Pinot's Palette - Columbus, OH_#110136.pdf"||s.attachments[0].size!==66076||r?.reference!=='CI_110136'||r.date!=='2026-01-21'||r.totalCents!==32335||r.subtotalCents!==29940||r.taxCents!==2395||r.paidAmountCents!==32335||r.items?.length!==2)return cache;
 const expected=[['Content Licensing & Standard Platform',19375,1435],['Commercial Music Streaming',12960,960]];
 if(r.items.some((i,n)=>i.description!==expected[n][0]||i.netCents!==expected[n][1]||i.itemTaxCents!==expected[n][2])||(r.uncertainties||[]).some(u=>u!=='Invoice balance shows $0.00, indicating it has been paid in full.'))return cache;
 return {...cache,receipt:{...r,items:r.items.map(i=>({...i,netCents:i.netCents-i.itemTaxCents})),uncertainties:[]},sourceRepair:{kind:'visually_reviewed_rockbot_net_and_tax',note:'Original invoice CI_110136 visually verified: licensing/platform unit price $179.40 plus $14.35 tax; music streaming $120.00 plus $9.60 tax. Net $299.40 plus tax $23.95 equals $323.35. Extraction incorrectly treated gross line totals as net. Printed paid-in-full balance is payment evidence, not an unresolved question.'}};
}
function correctCintasInvoicePayment(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='myCintas'||r.documentKind!=='payment_only'||s.attachments?.length||r.items?.length||!t.includes('From: myCintas Support <support@cintas.com>')||!t.includes('Your payment has been submitted.'))return cache;
 const invoices=[...t.matchAll(/United States\n(\d+)\n(\d+)\n\$([\d,]+\.\d{2})\n\$([\d,]+\.\d{2})/g)],dates=[...t.matchAll(/Invoice Date\nAccount\nInvoice #\nInvoice Total\nPayment\n(\d{2})\/(\d{2})\/(\d{4})\n/g)];
 if(invoices.length!==1||dates.length!==1)return cache;
 const m=invoices[0],amount=Math.round(Number(m[3].replace(/,/g,''))*100),date=dates[0][3]+'-'+dates[0][1]+'-'+dates[0][2];
 if(m[3]!==m[4]||r.reference!==m[1]||r.date!==date||r.totalCents!==amount||r.paidAmountCents!==amount||!t.includes('Selected Invoice Total:\n$'+m[3])||!t.includes('Credits Applied:\n$0.00')||!t.includes('Total Payment:\n$'+m[3])||(r.uncertainties||[]).some(u=>!['No itemized line items present.','No itemized line items provided.','No itemized line items present in the receipt.'].includes(u)))return cache;
 return {...cache,receipt:{...r,vendor:'Cintas',reference:m[2],subtotalCents:amount,taxCents:null,items:[{description:'Cintas service',quantity:1,netCents:amount,itemTaxCents:null,evidence:'$'+m[3]}],uncertainties:[]},sourceRepair:{kind:'owner_cintas_invoice_payment',note:'Owner reply1a1bbe3ee49c5e23 says these are all under Cintas; shared-studio category reuse is approved. Original payment confirmation identifies one invoice '+m[2]+' for $'+m[3]+' with no credits. The displayed date is the invoice date. Payment was submitted; bank settlement and separate tax are not asserted. Original email preserved.'}};
}
function correctReviewedUberBookingFee(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'').replace(/<https?:\/\/[^>]+>/g,'').replace(/\n\s*\n/g,'\n');
 if(s?.sourceMessageId!=='1a0a4de6e04e1543'||s.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.attachments?.length||r?.vendor!=='Uber'||r.reference!=='1d5e7c67-9f90-4a63-af79-1c0b5b29d6cf'||r.date!=='2026-09-15'||r.totalCents!==1596||r.paidAmountCents!==1596||r.items?.length!==3||(r.uncertainties||[]).length)return cache;
 const lines=[['Trip fare',1275],['Booking Fee',121],['Tip',200]];
 if(r.items.some((i,n)=>i.description!==lines[n][0]||i.netCents!==lines[n][1])||!t.includes('From: Uber Receipts <noreply@uber.com>')||!t.includes('Total $15.96')||!t.includes('Trip fare $12.75')||!t.includes('Booking Fee\n$1.21')||!t.includes('Tip $2.00')||!t.includes('Mastercard ••••5929 $15.96')||!t.includes('Receipt ID # '+r.reference))return cache;
 return {...cache,receipt:{...r,subtotalCents:null,taxCents:null,items:r.items.map(i=>({...i,itemTaxCents:null,...(i.description==='Booking Fee'?{evidence:'$1.21'}:{})}))},sourceRepair:{kind:'source_verified_booking_fee_not_tax',note:'Original Uber email explicitly lists fare $12.75, booking fee $1.21 and tip $2.00, totaling the paid $15.96. Extraction had also counted the booking fee as tax. No separate tax is printed; all three charges remain itemized. The source link separates the Booking Fee label from its $1.21 amount.'}};
}
function correctReviewedSamsAggregateTax(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.sourceMessageId!=='1a02073e37503ae7'||r?.reference!=='8000000060458803'||r.date!=='2026-08-20'||r.totalCents!==10416||r.subtotalCents!==9789||r.taxCents!==627||r.items?.length!==6||s.attachments?.length!==1||s.attachments[0].filename!=='pro-RD4bLPuI.jpeg'||s.attachments[0].size!==119397)return cache;
 const expected=[1848,1848,1848,1324,828,2093];
 if(r.items.some((i,n)=>i.netCents!==expected[n]||i.itemTaxCents!==0)||(r.uncertainties||[]).length)return cache;
 return {...cache,receipt:{...r,items:r.items.map(i=>({...i,itemTaxCents:null}))},sourceRepair:{kind:'visually_reviewed_aggregate_tax',note:'Original Sam’s order8000000060458803 visually reviewed. Six prices total $97.89; only aggregate tax $6.27 is printed, giving $104.16. Extraction incorrectly inserted zero tax on each line. Item tax is unknown, not zero; use the existing owner-approved proportional allocation, explicitly marked estimated in the summary.'}};
}
function correctOhioPestService(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'');
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='19f48622e1a7ac61'||r?.vendor!=='Ohio Exterminating Co.'||r.reference!=='548178'||r.date!=='2026-07-08'||r.totalCents!==7992||r.subtotalCents!==7400||r.taxCents!==592||r.paidAmountCents!==-7992||s.attachments?.length!==1||s.attachments[0].filename!=='Ohio Exterminating Co Statement.pdf'||s.attachments[0].size!==38902)return cache;
 if(!t.includes('From: Ohio Exterminating Co. <bookkeeper@ohioexterminating.com>')||!t.includes('Invoice #\n548178')||!t.includes('Monthly Pest Control\n74.00')||!t.includes('Subtotal:\n74.00\nTax:\n5.92')||!t.includes('Invoice Total:\n$ 79.92')||!t.includes('CC/ACH EFT Payment XXXX9312\n-79.92\nBalance Due this Invoice:\n$ 0.00')||!t.includes('Materials\nEPA\nDescription\nAmount\nUnits'))return cache;
 const descriptions=['Monthly Pest Control','CONTRAC BLOX Target Pests: Mice','First Strike Target Pests: Mice, Rat','Transport Mikron Gallon Target Pests: General Treatment'];
 if(r.items?.length!==4||r.items.some((i,n)=>i.description!==descriptions[n])||(r.uncertainties||[]).some(u=>u!=='Invoice total and paid amount match, but itemized details for tax and fees are not clearly separated.'))return cache;
 return {...cache,receipt:{...r,paidAmountCents:7992,items:[{description:'Monthly Pest Control',quantity:1,netCents:7400,itemTaxCents:592,evidence:'Service(s): Monthly Pest Control 74.00; tax 5.92; invoice total 79.92'}],uncertainties:[],materialUsage:r.items.slice(1).map(i=>({description:i.description,quantity:i.quantity})),reviewedPrintedAmounts:{paymentLedgerCents:-7992,balanceDueCents:0}},sourceRepair:{kind:'reviewed_pest_service_not_material_prices',note:'Original vendor email reproduces invoice548178: one service $74.00 plus $5.92 tax equals $79.92. Materials section gives blocks/each/gallons used, not additional prices. The negative payment is a credit against the invoice; balance is zero. Original PDF and email retain all material and payment details.'}};
}
function correctZemBrushOrder(cache) {
 const r=cache?.receipt,s=cache?.source,t=String(s?.text||'').replace(/\r/g,'');
 if(r?.vendor!=='ZEM BRUSH MFG'||r.documentKind!=='order_confirmation'||r.date!=null||s.attachments?.length||r.uncertainties?.length)return cache;
 const headers=[...t.matchAll(/From: ZEM BRUSH MFG <info@zembrush\.com>\nSent: [A-Za-z]+, ([A-Za-z]+) (\d{1,2}), (\d{4})[^\n]*\nTo:[^\n]*\nSubject: Your ZEM BRUSH MFG Order Confirmation \(#(\d+)\)/g)];
 if(headers.length!==1||String(r.reference).replace(/^#/,'')!==headers[0][4])return cache;
 const month=['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(headers[0][1])+1;
 const total=t.match(/Grand total:\s*\$([\d,]+\.\d{2})/);
 if(!month||!total||Math.round(Number(total[1].replace(/,/g,''))*100)!==r.totalCents||!r.items?.length||r.items.some(i=>!/^PA10[01] Size #\d+ White Synthetic (?:Round|Flat) Long Handle Pinot's Palette Brush$/.test(i.description)||!t.includes(i.description)||!Number.isSafeInteger(i.netCents)||i.netCents<=0)||r.items.reduce((n,i)=>n+i.netCents,0)!==r.totalCents)return cache;
 const date=headers[0][3]+'-'+String(month).padStart(2,'0')+'-'+headers[0][2].padStart(2,'0');
 if(new Date(date).toISOString().slice(0,10)!==date)return cache;
 return {...cache,receipt:{...r,date},sourceRepair:{kind:'vendor_order_confirmation_date',note:'Order date comes from the original ZEM confirmation Sent header preserved in the forwarded source, not the forwarding date. Printed brush lines reconcile to the printed grand total. Payment completion is not asserted.'}};
}
function correctReviewedHeidelberg(cache) {
 const r=cache?.receipt,s=cache?.source;
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='1a18deac1df19385'||r?.vendor!=='Heidelberg Columbus'||r.reference!=='90008895'||r.totalCents!==35304||r.items?.length!==6||!s.attachments?.some(a=>a.filename==='10.28.26.jpg'&&a.mimeType==='image/jpeg'&&a.size===76769))return cache;
 const printed=[['Modelo Especial 12OZ 24PK Cn Pilsner Style Lager',1,2239],["Barritt's 12OZ 4/6PK Cn Ginger",1,2299],['Malibu 750ML Coconut Rum-12 NV',2,2308],['Tangley Oaks 750ML Chard 12 18',1,5068],["McManis 750ML Pinot Noir 12 25",1,9595],['Maschio 750ML Prosecco Brut 12',1,13595]];
 const items=printed.map(([description,quantity,netCents])=>({description,quantity,netCents,itemTaxCents:null,evidence:'Visually verified printed extended line amount: '+(netCents/100).toFixed(2)}));
 if(items.reduce((n,i)=>n+i.netCents,0)+200!==35304)throw Error('Reviewed Heidelberg arithmetic mismatch');
 const fees=items.map(i=>Math.floor(i.netCents*200/35104)),rank=items.map((i,n)=>({n,r:i.netCents*200%35104})).sort((a,b)=>b.r-a.r||a.n-b.n);
 for(let n=0,left=200-fees.reduce((a,b)=>a+b,0);n<left;n++)fees[rank[n].n]++;
 return {...cache,receipt:{...r,date:'2026-10-28',items:items.map((i,n)=>({...i,netCents:i.netCents+fees[n]})),subtotalCents:35304,taxCents:null,deliveryCents:null,orderDiscountCents:0,otherFeesCents:0,paidAmountCents:null,uncertainties:[],reviewedPrintedAmounts:{totalSalesCents:46279,discountCents:11175,totalContentCents:35104,splitCaseChargeCents:200,totalCents:35304}},sourceRepair:{kind:'visually_reviewed_heidelberg_invoice',note:'Original 10.28.26.jpg reviewed November8 and9. Six extended line amounts already include discounts and sum351.04; printed split-case bottle handling charge2.00 gives invoice total353.04. Handling is allocated proportionally across the product costs with exact-cent rounding, an estimated allocation rather than a claim of item-specific fees. The original printed product amounts and fee remain preserved. Printed date is October28,2026. Tax and payment are not independently stated; neither is invented. Categories still require saved rules.'}};
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
 const unnecessary=new Set(['Total amount charged is monthly; actual paid amount not specified.','Total amount charged is monthly; actual payment details are not provided.','Total amount charged is monthly; actual payment may vary based on subscription duration.']);
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
module.exports={correctReviewedRockbot,correctCintasInvoicePayment,correctReviewedUberBookingFee,correctReviewedSamsAggregateTax,correctOhioPestService,correctZemBrushOrder,correctReviewedTarget,correctReviewedHeidelberg,correctReviewedNorthVernon,correctFishCleaningPayment,correctCanvasDepotPayment,correctBlickUnitAmounts,correctGoogleOneTaxes,correctReviewedAutojateDiscount,correctShippoPayment,correctReviewedCintas,correctOutshineServicePayment};
module.exports.correctReviewedKeg1=correctReviewedKeg1;
module.exports.correctBwcPolicyPayment=correctBwcPolicyPayment;
module.exports.correctReviewedHeidelbergSeptember=correctReviewedHeidelbergSeptember;
module.exports.correctReviewedStorage=correctReviewedStorage;
module.exports.correctReviewedPosterOrder=correctReviewedPosterOrder;
module.exports.correctReviewedMichaelsPaint=correctReviewedMichaelsPaint;
module.exports.correctMichaelsUnitAmounts=correctMichaelsUnitAmounts;
module.exports.correctReviewedGordonFood=correctReviewedGordonFood;
module.exports.correctReviewedKegOctober=correctReviewedKegOctober;
module.exports.correctReviewedSamsOctober=correctReviewedSamsOctober;
function correctReviewedDollarTree(cache) {
 const s=cache?.source,r=cache?.receipt;
 if(s?.mailbox!=='trooperseaselempirereceipts@gmail.com'||s.sourceMessageId!=='1a0633a806f193d3'||r?.vendor!=='Dollar Tree'||r.totalCents!==3180||!s.attachments?.some(a=>a.filename==='pro-m3DtjXu6.jpeg'&&a.size===792070))return cache;
 return {...cache,receipt:{...r,date:'2026-09-02',reference:'5192-031-21490611',currency:'USD',subtotalCents:3000,taxCents:180,totalCents:3180,paidAmountCents:3180,deliveryCents:0,otherFeesCents:0,orderDiscountCents:0,
  items:[{description:'CLASSIC WHITE WINE 15Z',quantity:20,netCents:3000,itemTaxCents:180,evidence:'20 printed units at $1.50; subtotal $30.00, sales tax $1.80, total $31.80.'}],uncertainties:[]},sourceRepair:{kind:'visually_reviewed_dollar_tree',note:'Original photo reviewed November 9: footer 031 21490611 9/02/26 11:33; store 5192. Twenty CLASSIC WHITE WINE 15Z units at $1.50 total $30.00, plus $1.80 tax. Corrected incomplete extraction and wrong year. Product purpose and category still require saved owner evidence; no category inferred from the word wine.'}};
}
module.exports.correctReviewedDollarTree=correctReviewedDollarTree;
