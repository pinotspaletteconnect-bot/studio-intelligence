const test=require('node:test'),assert=require('node:assert/strict');
const {isSavedSearchPromotion}=require('./non-receipt-mail.cjs');
const m={labelIds:['INBOX','CATEGORY_PROMOTIONS'],snippet:'Come back—we saved your search! View in Browser Michaels LOGO SHOP COUPONS'};
test('saved search promotion does not block real receipts',()=>{assert.equal(isSavedSearchPromotion(m),true);});
test('normalized intake retains marketing evidence without Gmail labels or snippet',()=>{
 assert.equal(isSavedSearchPromotion({subject:'Take another look and save BIG with this coupon 💰 💰',text:'Come back—we saved your search!\n[https://click.emdeals.michaels.com/open.aspx?x]'}),true);
});
test('transactional or uncertain email stays eligible',()=>{
 for(const subject of ['Your receipt','Invoice 123','Order confirmation','Payment confirmation'])assert.equal(isSavedSearchPromotion({...m,subject}),false);
 assert.equal(isSavedSearchPromotion({...m,labelIds:['INBOX']}),false);
 assert.equal(isSavedSearchPromotion({subject:'Michaels',snippet:'Thank you for your purchase'}),false);
});
