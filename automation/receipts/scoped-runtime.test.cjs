'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scopeReceiptRules}=require('./scoped-runtime.cjs');
const rules={companyId:'9130357828229216',rules:[{id:'general',account:'supplies'},{id:'specific',sourceMessageId:'0123456789abcdef',account:'giveaway'},{id:'chat',ownerChatDecision:{receiptKey:'original'},account:'food'}],candleOrderContext:['specific-order']};
test('new studios cannot silently inherit Gilbert account policy',()=>{
 assert.throws(()=>scopeReceiptRules(rules,{studio:'Short North',scopeId:'north'}),/Confirm/);
});
test('if owner approves shared COA, exact-receipt decisions remain local',()=>{
 const result=scopeReceiptRules(rules,{studio:'Short North',scopeId:'north',useSharedCoa:true});
 assert.equal(result.companyId,'north');assert.deepEqual(result.rules,[rules.rules[0]]);
 assert.deepEqual(result.candleOrderContext,[]);assert.equal(rules.rules.length,3);
});
test('Gilbert retains all existing scoped owner rules',()=>{
 assert.deepEqual(scopeReceiptRules(rules,{studio:'Gilbert',scopeId:'9130357828229216'}),rules);
});
