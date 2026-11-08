const {test}=require('node:test');
const assert=require('node:assert/strict');
const {selectApprovedTicket:select}=require('./approved-budget.cjs');
const legacy=Array.from({length:115},()=>({reservedMicrousd:30000}));
const rows=[...Array.from({length:50},(_,i)=>({id:i+1,approvalId:'gilbert-backlog-20260930-usd5-remaining-'+String(i+1).padStart(2,'0'),reservedMicrousd:30000,status:'complete'})),...Array.from({length:166},(_,i)=>({id:i+51,approvalId:'receipt-studios-20261108-usd5-'+String(i+1).padStart(3,'0'),reservedMicrousd:30000,status:'available'}))];
test('approved extension preserves history and caps reservations at $9.93',()=>{assert.equal(select(rows,legacy,'1234567890abcdef').id,51);assert.equal((rows.length+legacy.length)*30000,9930000);});
test('extra, duplicate, missing or inflated allowances fail closed',()=>{for(const changed of [[...rows,rows[0]],rows.slice(1),rows.map((r,i)=>i===51?{...r,reservedMicrousd:40000}:r)])assert.throws(()=>select(changed,legacy,'1234567890abcdef'));});
test('consumed receipt and exhausted allowance cannot make another request',()=>{assert.equal(select(rows.map(r=>({...r,status:'complete'})),legacy,'1234567890abcdef'),null);assert.equal(select(rows.map((r,i)=>i===0?{...r,sourceMessageId:'1234567890abcdef'}:r),legacy,'1234567890abcdef'),null);});
