'use strict';
function correctReviewedPlumbing(cache) {
 const s=cache?.source,r=cache?.receipt;
 if(s?.mailbox!=='stellaseaselempirereceipts@gmail.com'||s.sourceMessageId!=='19ffd4a77133aedf'||
   r?.vendor!=='Callthatplumber LLC'||r.reference!=='1800'||r.date!=='2026-08-10'||
   r.totalCents!==45000||r.paidAmountCents!==45000||r.subtotalCents!==45000||
   !s.attachments?.some(a=>a.filename==='Invoice-1800.pdf'&&a.size===21019)||
   r.items?.length!==1||r.items[0].netCents!==0||!r.items[0].description.startsWith('Snake sewer drain in the basement'))return cache;
 return {...cache,receipt:{...r,items:[{description:'Drain clearing — invoice 1800 total, paid by Zelle',quantity:1,netCents:45000,itemTaxCents:null,
   evidence:'Paid by Zelle $450.00 $450.00; Total $450.00'}],uncertainties:[]},
   sourceRepair:{kind:'reviewed_plumbing_invoice_total',note:'Original Invoice-1800.pdf visually reviewed November 8. Drain-clearing description is on a zero-dollar descriptive row; the second row records the $450 paid by Zelle and the invoice total is $450. Summary uses that invoice total, not an invented hourly rate. No separately stated tax.'}};
}
module.exports={correctReviewedPlumbing};
