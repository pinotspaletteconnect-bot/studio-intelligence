'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRosterRowWrites: build } = require('./roster-writes.cjs');
const base = { isPrivate: false, sheetName: 'Seating Chart Main', rowLimit: 1011 };

test('private parties and unknown event types cannot receive seating-chart writes', () => {
  assert.throws(() => build({ ...base, isPrivate: true, rows: [] }), /non-private classes only/);
  assert.throws(() => build({ ...base, isPrivate: undefined, rows: [] }), /non-private classes only/);
});

test('first guest is row 1, with no header, and attendance/seating are never targeted', () => {
  const request = build({ ...base, rows: [{
    row: 1, reservationKey: 'synthetic-reservation-1', perks: 'C', guest: 'Example Guest',
    guestEmail: 'guest@example.invalid', purchaser: 'Example Purchaser',
    purchaserEmail: 'buyer@example.invalid', purchaserPhone: 'example-phone',
    comments: 'Sit with Example Friend', checkedIn: 'Yes', attendance: true, seat: '35',
  }] });
  assert.deepEqual(request, {
    valueInputOption: 'RAW', data: [
      { range: "'Seating Chart Main'!V1:AA1", values: [[
        'C', 'Example Guest', 'guest@example.invalid', 'Example Purchaser',
        'buyer@example.invalid', 'example-phone',
      ]] },
      { range: "'Seating Chart Main'!AC1", values: [['Sit with Example Friend']] },
    ],
  });
});

test('existing guest rows are retained even when supplied in a different order', () => {
  const request = build({ ...base, rows: [
    { row: 12, reservationKey: 'b', guest: 'Guest B' },
    { row: 3, reservationKey: 'a', guest: 'Guest A' },
  ] });
  assert.deepEqual(request.data.map(d => d.range), [
    "'Seating Chart Main'!V12:AA12", "'Seating Chart Main'!AC12",
    "'Seating Chart Main'!V3:AA3", "'Seating Chart Main'!AC3",
  ]);
});

test('unresolved or conflicting reservation mappings fail before any request exists', () => {
  for (const rows of [
    [{ row: 1 }],
    [{ row: 0, reservationKey: 'a' }],
    [{ row: 1012, reservationKey: 'a' }],
    [{ row: 1, reservationKey: 'a' }, { row: 1, reservationKey: 'b' }],
    [{ row: 1, reservationKey: 'a' }, { row: 2, reservationKey: 'a' }],
  ]) assert.throws(() => build({ ...base, rows }));
});

test('text remains literal, blank fields retain their columns, and tab names are escaped', () => {
  const request = build({ ...base, sheetName: "Room's chart", rows: [{
    row: 4, reservationKey: 'a', guest: '=untrusted source text', comments: '+literal note',
  }] });
  assert.equal(request.valueInputOption, 'RAW');
  assert.equal(request.data[0].range, "'Room''s chart'!V4:AA4");
  assert.deepEqual(request.data[0].values[0], ['', '=untrusted source text', '', '', '', '']);
  assert.equal(request.data[1].values[0][0], '+literal note');
});

test('an empty input never clears an existing chart', () => {
  assert.deepEqual(build({ ...base, rows: [] }), { valueInputOption: 'RAW', data: [] });
});

test('unnamed reservations display the purchaser first name followed by guest without changing source identity', () => {
  const rows = [
    { row: 2, reservationKey: 'linda-guest', guest: '', purchaser: 'Linda Smyth' },
    { row: 4, reservationKey: 'addison-guest', guest: '   ', purchaser: ' Addison   Coyle ' },
    { row: 5, reservationKey: 'named', guest: 'Laquan', purchaser: 'Aryanna Hartlage' },
    { row: 6, reservationKey: 'unknown', guest: '', purchaser: '' },
  ];
  const request = build({ ...base, rows });
  assert.deepEqual(request.data.filter((_, i) => i % 2 === 0).map(r => r.values[0][1]), ["Linda's guest", "Addison's guest", 'Laquan', 'Guest']);
  assert.equal(rows[0].guest, '');
});
