'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planRefresh, verifyReadback, refreshReservations, adoptExistingRows } = require('./refresh.cjs');

const target = { studioCode: 'STM', isPrivate: false, classId: '123', sheetId: 0,
  sheetName: 'Seating Chart Main', spreadsheetId: 'synthetic-copy', masterSpreadsheetId: 'synthetic-master', rowLimit: 6 };
const seat = (id, guest = 'Example Guest') => ({ reservationKey: String(id), perks: '', guest, guestEmail: '',
  purchaser: 'Example Purchaser', purchaserEmail: 'example@example.invalid', purchaserPhone: '', comments: '' });
const source = rows => ({ studioCode: 'STM', classId: '123', complete: true, isPrivate: false, rows, expectedRowCount: rows.length });
const blank = () => Array.from({ length: 6 }, (_, i) => ['', { formulaValue: `=W${i + 1}` }, '', '', '', '', '', '', '', '']);
function apply(cells, request) {
  for (const item of request.data) {
    const row = Number(item.range.match(/!(?:V|AC)(\d+)/)[1]) - 1;
    if (/!V/.test(item.range)) cells[row].splice(2, 6, ...item.values[0]);
    else cells[row][9] = item.values[0][0];
  }
}
function seeded() {
  const cells = blank();
  const initial = planRefresh({ target, source: source([seat(11), seat(12, '')]), ledger: [], cells });
  apply(cells, initial.request);
  cells[0][0] = 'A7'; cells[0][8] = 'Present'; cells[1][0] = 'B4'; cells[1][8] = false;
  return { cells, ledger: initial.ledger };
}

test('renamed/reordered guests keep durable rows, seats, attendance and label formulas', () => {
  const { cells, ledger } = seeded(); const before = structuredClone(cells);
  const plan = planRefresh({ target, source: source([seat(12, 'New guest name'), seat(11, 'Corrected name'), seat(13, 'Added guest')]), ledger, cells });
  apply(cells, plan.request);
  assert.equal(cells[0][3], 'Corrected name'); assert.equal(cells[1][3], 'New guest name'); assert.equal(cells[2][3], 'Added guest');
  assert.deepEqual(plan.ledger.map(e => [e.reservationKey, e.row]), [['11', 1], ['12', 2], ['13', 3]]);
  assert.equal(verifyReadback({ target, before, after: cells, plan }).seatingUnchanged, true);
  assert.equal(cells[0][0], 'A7'); assert.equal(cells[0][8], 'Present'); assert.equal(cells[1][8], false);
});
test('repeat refresh is idempotent even if the source order is reversed', () => {
  const { cells, ledger } = seeded();
  const plan = planRefresh({ target, source: source([seat(12, ''), seat(11)]), ledger, cells });
  assert.equal(plan.request.data.length, 0); assert.equal(plan.ledger.length, 2);
});
test('removed/zero-seat source retains staff work and reserves the old row for review', () => {
  const { cells, ledger } = seeded(); const before = structuredClone(cells);
  const plan = planRefresh({ target, source: source([]), ledger, cells });
  assert.equal(plan.request.data.length, 0); assert.equal(plan.review.length, 2);
  assert.deepEqual(cells, before);
  const next = planRefresh({ target, source: source([seat(15)]), ledger: plan.ledger, cells });
  assert.equal(next.ledger.find(e => e.reservationKey === '15').row, 3);
});
test('staff changes in imported fields stop before any write', () => {
  const { cells, ledger } = seeded(); cells[0][9] = 'Manager note';
  assert.throws(() => planRefresh({ target, source: source([seat(11)]), ledger, cells }), /manually/);
});
test('new guests skip manual rows, and a full chart never shifts any rows', () => {
  const cells = blank(); cells[0][8] = true; cells[1][0] = 'Seat 1'; cells[2][9] = 'Manual note';
  const plan = planRefresh({ target, source: source([seat(1)]), ledger: [], cells });
  assert.equal(plan.ledger[0].row, 4);
  assert.throws(() => planRefresh({ target, source: source([seat(1), seat(2), seat(3), seat(4)]), ledger: [], cells }), /No unused/);
});
test('wrong studio/class, incomplete source, master target and duplicate identity all stop', () => {
  const good = { target, source: source([seat(1)]), ledger: [], cells: blank() };
  for (const mutation of [
    { source: { ...good.source, studioCode: 'GIL' } }, { source: { ...good.source, classId: '456' } },
    { source: { ...good.source, complete: false } }, { source: { ...good.source, isPrivate: true } },
    { target: { ...target, spreadsheetId: target.masterSpreadsheetId } }, { source: source([seat(1), seat(1)]) },
  ]) assert.throws(() => planRefresh({ ...good, ...mutation }));
});
test('literal formula-looking source text remains valid while destination formulas are protected', () => {
  const cells = blank(); const row = { ...seat(1), guest: '=literal guest text' };
  const plan = planRefresh({ target, source: source([row]), ledger: [], cells }); apply(cells, plan.request);
  assert.equal(plan.request.valueInputOption, 'RAW');
  assert.equal(planRefresh({ target, source: source([row]), ledger: plan.ledger, cells }).changedCount, 0);
  cells[0][3] = { formulaValue: '=NOW()' };
  assert.throws(() => planRefresh({ target, source: source([row]), ledger: plan.ledger, cells }), /Formula/);
});
test('verification rejects protected-cell changes and incorrect guest readback', () => {
  const before = blank(); const plan = planRefresh({ target, source: source([seat(1)]), ledger: [], cells: before });
  const after = structuredClone(before); apply(after, plan.request);
  for (const column of [0, 1, 8]) {
    const changed = structuredClone(after); changed[0][column] = 'Changed';
    assert.throws(() => verifyReadback({ target, before, after: changed, plan }), /Protected/);
  }
  after[0][3] = 'Wrong name';
  assert.throws(() => verifyReadback({ target, before, after, plan }), /readback mismatch/);
});
test('source and immutable plan are staged before Google, then completion follows verified readback', async () => {
  const calls = []; const cells = blank();
  const store = { claim: async () => ({ target, source: source([seat(1)]), ledger: [] }),
    stage: async () => calls.push('stage'), complete: async () => calls.push('complete'), fail: async () => calls.push('fail') };
  const sheets = { read: async () => { calls.push('read'); return structuredClone(cells); },
    write: async (_, request) => { calls.push('write'); apply(cells, request); } };
  const result = await refreshReservations({ targetId: 'test', runId: 'run', source: source([]), store, sheets });
  assert.deepEqual(calls, ['read', 'stage', 'write', 'read', 'complete']); assert.equal(result.status, 'updated');
});
test('retry of a staged run recovers a lost acknowledgement without moving guests', async () => {
  const cells = blank(); const plan = planRefresh({ target, source: source([seat(1)]), ledger: [], cells }); apply(cells, plan.request);
  const store = { claim: async () => ({ target, plan, ledger: [] }), complete: async () => {}, fail: async () => {} };
  const sheets = { read: async () => structuredClone(cells), write: async (_, request) => apply(cells, request) };
  assert.equal((await refreshReservations({ targetId: 'test', runId: 'run', store, sheets })).status, 'updated');
  cells[0][9] = 'Staff changed this during recovery'; let writes = 0;
  sheets.write = async () => writes++;
  await assert.rejects(refreshReservations({ targetId: 'test', runId: 'run', store, sheets }), /staff edit/);
  assert.equal(writes, 0);
});
test('a failed readback never advances the successful warehouse ledger', async () => {
  const cells = blank(); let completed = false, failed = false;
  const store = { claim: async () => ({ target, source: source([seat(1)]), ledger: [] }), stage: async () => {},
    complete: async () => { completed = true; }, fail: async () => { failed = true; } };
  await assert.rejects(refreshReservations({ targetId: 'test', runId: 'run', store,
    sheets: { read: async () => structuredClone(cells), write: async () => {} } }), /readback/);
  assert.equal(completed, false); assert.equal(failed, true);
});
test('one-time pilot adoption requires a complete exact source match and no staff seats or attendance', () => {
  const cells = blank(); const s = source([seat(1), seat(2, '')]);
  apply(cells, planRefresh({ target, source: s, ledger: [], cells }).request);
  const input = { target: { ...target, allowPilotAdoption: true }, source: s, cells };
  assert.deepEqual(adoptExistingRows(input).map(e => [e.reservationKey,e.row]), [['1',1],['2',2]]);
  assert.throws(() => adoptExistingRows({ ...input, target }), /not enabled/);
  cells[0][8] = true; assert.throws(() => adoptExistingRows(input), /attendance/); cells[0][8] = '';
  cells[0][3] = 'Staff edited name'; assert.throws(() => adoptExistingRows(input), /differs/);
});

test('unnamed guest label updates with purchaser name and becomes a real name on the same protected row', () => {
  const cells = blank(); let raw = { ...seat(1, ''), purchaser: 'Linda Smyth' };
  let plan = planRefresh({ target, source: source([raw]), ledger: [], cells }); apply(cells, plan.request);
  assert.equal(cells[0][3], "Linda's guest"); cells[0][0] = 11; cells[0][8] = true;
  let before = structuredClone(cells);
  raw = { ...raw, purchaser: 'Addison Coyle' };
  plan = planRefresh({ target, source: source([raw]), ledger: plan.ledger, cells }); apply(cells, plan.request);
  assert.equal(cells[0][3], "Addison's guest");
  assert.equal(verifyReadback({ target, before, after: cells, plan }).attendanceUnchanged, true);
  before = structuredClone(cells); raw = { ...raw, guest: 'Actual Guest Name' };
  plan = planRefresh({ target, source: source([raw]), ledger: plan.ledger, cells }); apply(cells, plan.request);
  assert.equal(cells[0][3], 'Actual Guest Name');
  assert.equal(plan.ledger[0].row, 1);
  assert.equal(verifyReadback({ target, before, after: cells, plan }).seatingUnchanged, true);
});
