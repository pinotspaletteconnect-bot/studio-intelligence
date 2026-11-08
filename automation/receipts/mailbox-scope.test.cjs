'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {mailboxScope, cacheForMailbox, scopedReceiptKey, assertMailboxProfile, savedAnswersForMailbox} = require('./mailbox-scope.cjs');
const registry = require('./receipt-studio-mailboxes.json');
const scopes = registry.studios.map(s => mailboxScope(registry, s.mailbox));
test('four unique ledger scopes retain the legacy Gilbert identity', () => {
  assert.equal(new Set(scopes.map(s => s.scopeId)).size, 4);
  assert.equal(scopes[0].scopeId, '9130357828229216');
  assert.throws(() => mailboxScope(registry, 'unrelated@gmail.com'));
});
test('same native message ID cannot collide across studios', () => {
  assert.equal(new Set(scopes.map(s => scopedReceiptKey(s, '0123456789abcdef'))).size, 4);
  assert.throws(() => scopedReceiptKey(scopes[0], '../messages'));
});
test('wrong authorized mailbox is rejected before writes', () => {
  assert.throws(() => assertMailboxProfile(scopes[1], {emailAddress:scopes[2].mailbox}));
  assert.deepEqual(assertMailboxProfile(scopes[1], {emailAddress:scopes[1].mailbox}), scopes[1]);
});
test('legacy cache is Gilbert-only; new cache has explicit source mailbox', () => {
  const rows = [{resultJson:JSON.stringify({source:{sourceMessageId:'0123456789abcdef'}})},
    {resultJson:JSON.stringify({source:{mailbox:scopes[1].mailbox,sourceMessageId:'0123456789abcdef'}})}];
  assert.deepEqual(cacheForMailbox(rows, scopes[0], scopes[0].mailbox), [rows[0]]);
  assert.deepEqual(cacheForMailbox(rows, scopes[1], scopes[0].mailbox), [rows[1]]);
  assert.deepEqual(cacheForMailbox(rows, scopes[2], scopes[0].mailbox), []);
});
test('saved receipt-specific answers cannot leak to another studio', () => {
  const rows = scopes.map(s => ({companyId:s.scopeId,receiptKey:scopedReceiptKey(s,'0123456789abcdef')}));
  assert.deepEqual(savedAnswersForMailbox(rows,scopes[2]),[rows[2]]);
});
