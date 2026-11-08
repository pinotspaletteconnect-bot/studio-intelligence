'use strict';
function canvasDepotTextCache(message, scope) {
 const text=String(message?.text||'');
 if(!/^[a-f0-9]{16}$/.test(message?.id||'')||!text.includes('outgoing@safewebservices.com')||!text.includes('DYNAMIC WHOLESALE SIGNS')||!text.includes('Your Card Sale is complete!')||!/^Description\s*\nThe Canvas Depot\s*$/m.test(text))return null;
 const amounts=[...text.matchAll(/\$([\d,]+\.\d{2})/g)],refs=[...text.matchAll(/^Order ID\s*\n(INV\s+\d+)\s*$/gm)],dates=[...text.matchAll(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})\s*$/gm)],transactions=[...text.matchAll(/^Transaction ID\s*\n(\d+)\s*$/gm)];
 if(amounts.length!==1||refs.length!==1||dates.length!==1||transactions.length!==1)return null;
 const cents=Math.round(Number(amounts[0][1].replace(/,/g,''))*100),month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(dates[0][1])+1;
 if(!Number.isSafeInteger(cents)||cents<=0||!month)return null;
 const date=dates[0][3]+'-'+String(month).padStart(2,'0')+'-'+dates[0][2].padStart(2,'0');
 if(new Date(date).toISOString().slice(0,10)!==date)return null;
 return {source:{sourceMessageId:message.id,threadId:message.threadId||message.id,mailbox:scope.mailbox,studio:scope.studio,subject:message.subject,date:message.date,text,attachments:[]},receipt:{documentKind:'receipt',vendor:'Canvas Depot',reference:refs[0][1],date,currency:'USD',studioEvidence:'Owner-assigned receipt inbox: '+scope.studio,subtotalCents:cents,taxCents:null,deliveryCents:null,otherFeesCents:null,orderDiscountCents:null,totalCents:cents,paidAmountCents:cents,items:[{description:'The Canvas Depot',quantity:1,netCents:cents,itemTaxCents:null,evidence:amounts[0][0]}],uncertainties:[]},sourceRepair:{kind:'deterministic_canvas_depot_payment',note:'Parsed one completed Canvas Depot card-sale receipt with one amount, invoice reference, transaction ID and date. Owner-approved vendor category applies to the printed gross payment. Separate tax and item-level prices are not stated or invented.'}};
}
module.exports={canvasDepotTextCache};

