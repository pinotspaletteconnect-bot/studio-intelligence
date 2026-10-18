'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HEADERS, normalizeSeatingTable: normalize } = require('./seating-source.cjs');
const base = { isPrivate: false, complete: true, headers: HEADERS };
const row = ['100', 'C', 'Example Guest', 'guest@example.invalid', 'Example Buyer',
  'buyer@example.invalid', 'example phone', 'No', 'Example request'];

test('Perks maps first, Order ID is context only, and Checked In is excluded', () => {
  const [result] = normalize({ ...base, rows: [row], expectedRowCount: 1 });
  assert.equal(result.perks, 'C');
  assert.equal(result.guest, 'Example Guest');
  assert.equal(result.comments, 'Example request');
  assert.equal(result.sourceOrderId, '100');
  assert.equal('checkedIn' in result, false);
});

test('blank names and repeated rows are retained as separate reserved seats', () => {
  const unnamed = row.map((value, i) => [1, 2, 3].includes(i) ? '' : value);
  const result = normalize({ ...base, rows: [row, unnamed, unnamed], expectedRowCount: 3 });
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(r => r.guest), ['Example Guest', '', '']);
  assert.deepEqual(result.map(r => r.sourceRowIndex), [0, 1, 2]);
  assert.equal(result[1].purchaser, 'Example Buyer');
  assert.equal('reservationKey' in result[1], false);
});

test('changed headers, missing cells, truncated sources and private parties stop normalization', () => {
  for (const overrides of [
    { headers: HEADERS.slice(1) }, { rows: [row.slice(1)] },
    { expectedRowCount: 2 }, { complete: false }, { isPrivate: true },
  ]) assert.throws(() => normalize({ ...base, rows: [row], expectedRowCount: 1, ...overrides }));
});

test('a verified zero-seat class is empty without inventing guests', () => {
  assert.deepEqual(normalize({ ...base, rows: [], expectedRowCount: 0 }), []);
});
