'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HEADERS } = require('./seating-source.cjs');
const { identifyReservations } = require('./source-identity.cjs');
const raw = (guest = '', perks = '') => ['10', perks, guest, '', 'Buyer', '', '', 'No', ''];
const identity = (id, guest = '', status = 'Active') => ({ sourceOrderId: '10', reservationId: String(id), guest, guestEmail: '', comments: '', status });
const source = { isPrivate: false, complete: true, expectedRowCount: 3, headers: HEADERS,
  rows: [raw('Example'), raw(), raw()], reservations: [identity(3), identity(2), identity(1, 'Example'), identity(4, 'Old guest', 'Refunded')] };
test('real seat IDs retain unnamed/repeated guests and exclude refunded seats', () => {
  assert.deepEqual(identifyReservations(source).map(r => r.reservationKey), ['1', '2', '3']);
});
test('ambiguous duplicate perks, duplicate IDs and source-count disagreements stop matching', () => {
  assert.throws(() => identifyReservations({ ...source, rows: [raw('Example'), raw('', 'C'), raw()] }), /Ambiguous/);
  assert.throws(() => identifyReservations({ ...source, reservations: [...source.reservations, identity(1)] }), /duplicate/);
  assert.throws(() => identifyReservations({ ...source, reservations: source.reservations.slice(1) }), /counts disagree/);
});
test('unknown statuses and changed source columns never produce guessed identities', () => {
  assert.throws(() => identifyReservations({ ...source, reservations: [identity(1, '', 'Unknown')] }), /Unknown/);
  assert.throws(() => identifyReservations({ ...source, headers: HEADERS.slice(1) }), /columns changed/);
});
test('source-generated seating comments do not masquerade as reservation identity', () => {
  const rows = source.rows.map(row => [...row.slice(0, 8), 'No special seating requested']);
  assert.equal(identifyReservations({ ...source, rows }).length, 3);
  const ambiguous = structuredClone(source); ambiguous.rows[1][8] = 'Different request';
  assert.throws(() => identifyReservations(ambiguous), /Ambiguous/);
});

test('repeated purchaser display reconciles only identical rows with verified unnamed order guests',()=>{
  const row=['10','C','Buyer','synthetic@example.invalid','Buyer','synthetic@example.invalid','','No','same request'];
  const s={...source,expectedRowCount:2,rows:[row,[...row]],reservations:[{...identity(20,'Buyer'),guestEmail:'synthetic@example.invalid'},identity(21)]};
  const result=identifyReservations(s);
  assert.deepEqual(result.map(r=>[r.reservationKey,r.guest,r.guestEmail]),[['20','Buyer','synthetic@example.invalid'],['21','','']]);
  assert.ok(result.every(r=>r.perks==='C'&&r.comments==='same request'));
  assert.throws(()=>identifyReservations({...s,rows:[row,[...row.slice(0,1),'A',...row.slice(2)]]}),/disagree/);
  assert.throws(()=>identifyReservations({...s,reservations:[s.reservations[0],identity(21,'Different guest')]}),/disagree/);
  assert.throws(()=>identifyReservations({...s,rows:[row]}),/incomplete/);
});
