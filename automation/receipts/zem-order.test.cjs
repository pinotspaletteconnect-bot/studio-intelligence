const test=require('node:test'),assert=require('node:assert/strict');
const {correctZemBrushOrder:repair}=require('./receipt-source-repairs.cjs');
test('brush order uses original vendor header date, never forwarding date or ambiguous evidence',()=>{
 const description="PA100 Size #0 White Synthetic Round Long Handle Pinot's Palette Brush";
 const c={source:{attachments:[],text:"From: ZEM BRUSH MFG <info@zembrush.com>\nSent: Monday, August 31, 2026 8:25 PM\nTo: studio\nSubject: Your ZEM BRUSH MFG Order Confirmation (#4757)\n"+description+'\nGrand total:\n$123.12'},receipt:{vendor:'ZEM BRUSH MFG',documentKind:'order_confirmation',reference:'#4757',date:null,uncertainties:[],totalCents:12312,items:[{description,netCents:12312}]}};
 assert.equal(repair(c).receipt.date,'2026-08-31');
 assert.equal(repair({...c,source:{...c.source,text:c.source.text.replace('info@zembrush.com','other@example.com')}}).receipt.date,null);
 assert.equal(repair({...c,receipt:{...c.receipt,totalCents:12313}}).receipt.date,null);
 assert.equal(repair({...c,source:{...c.source,text:c.source.text+'\n'+c.source.text}}).receipt.date,null);
});
