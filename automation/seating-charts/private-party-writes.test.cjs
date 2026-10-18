'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FIELD_CELLS, buildPrivatePartyWrites: build } = require('./private-party-writes.cjs');
const base = { isPrivate: true, sheetName: 'Private Party' };

test('class events cannot receive Private Party form writes', () => {
  assert.throws(() => build({ ...base, isPrivate: false, sourceFields: {}, currentCells: {} }), /verified private event/);
});

test('only verified party facts target the mapped form cells', () => {
  const sourceFields = Object.fromEntries(Object.keys(FIELD_CELLS).map(field =>
    [field, { verified: true, value: `Synthetic ${field}` }]));
  sourceFields.attendance = { verified: true, value: 12 };
  sourceFields.seat = { verified: true, value: '35' };
  sourceFields.depositReceived = { verified: true, value: 100 };
  const currentCells = Object.fromEntries(Object.values(FIELD_CELLS).map(cell => [cell, null]));
  const result = build({ ...base, sourceFields, currentCells });
  assert.deepEqual(result.request.data.map(d => d.range), [
    "'Private Party'!C3", "'Private Party'!C4", "'Private Party'!C5",
    "'Private Party'!C8", "'Private Party'!C12", "'Private Party'!C15", "'Private Party'!C22",
  ]);
  assert.equal(result.request.valueInputOption, 'RAW');
  assert.equal(result.needsReview.length, 0);
});

test('staff edits survive refresh while unchanged automation values can update', () => {
  const result = build({ ...base,
    sourceFields: {
      eventName: { verified: true, value: 'New source event name' },
      expectedHeadcount: { verified: true, value: 14 },
    },
    currentCells: { C8: 'Manager edited title', C22: 12 },
    lastWrittenCells: { C8: 'Old source event name', C22: 12 },
  });
  assert.deepEqual(result.request.data, [{ range: "'Private Party'!C22", values: [[14]] }]);
  assert.ok(result.needsReview.some(r => r.cell === 'C8' && r.reason === 'preserve_existing_staff_value'));
});

test('missing facts do not clear fields or turn expected guests into attendance', () => {
  const result = build({ ...base, sourceFields: {
    expectedHeadcount: { verified: false, value: 12 },
    pricePerSeat: { verified: true, value: null },
  }, currentCells: { C22: 10, C12: 39 } });
  assert.deepEqual(result.request.data, []);
  assert.equal(result.needsReview.length, 7);
});

test('unread cells and formulas are never overwritten', () => {
  const result = build({ ...base,
    sourceFields: { eventName: { verified: true, value: 'Event' }, pricePerSeat: { verified: true, value: 39 } },
    currentCells: { C12: { formulaValue: '=example()' } },
  });
  assert.deepEqual(result.request.data, []);
  assert.ok(result.needsReview.some(r => r.cell === 'C8' && r.reason === 'current_cell_not_read'));
  assert.ok(result.needsReview.some(r => r.cell === 'C12' && r.reason === 'formula_or_non_scalar_cell'));
});
