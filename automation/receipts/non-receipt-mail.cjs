'use strict';
function isSavedSearchPromotion(message) {
 const subject=String(message.subject||'');
 const snippet=String(message.snippet||'');
 const text=subject+' '+snippet;
 if(/\b(receipt|invoice|order confirmation|payment confirmation|your order has|thank you for (?:your )?(?:order|purchase))\b/i.test(text))return false;
 return (message.labelIds||[]).includes('CATEGORY_PROMOTIONS')&&
   /^Come back[—–-]we saved your search!\s+View in Browser Michaels\b/i.test(snippet);
}
module.exports={isSavedSearchPromotion};
