'use strict';
function isSavedSearchPromotion(message) {
 const subject=String(message.subject||'');
 const snippet=String(message.snippet||'');
 const text=subject+' '+snippet;
 if(/\b(receipt|invoice|order confirmation|payment confirmation|your order has|thank you for (?:your )?(?:order|purchase))\b/i.test(text))return false;
 const rawPromotion=(message.labelIds||[]).includes('CATEGORY_PROMOTIONS')&&
   /^Come back[—–-]we saved your search!\s+View in Browser Michaels\b/i.test(snippet);
 const normalizedPromotion=/^Take another look and save BIG with this coupon\b/i.test(subject)&&
   /^Come back[—–-]we saved your search!/i.test(String(message.text||'').trim())&&
   /https:\/\/click\.emdeals\.michaels\.com\//i.test(message.text||'');
 return rawPromotion||normalizedPromotion;
}
module.exports={isSavedSearchPromotion};
