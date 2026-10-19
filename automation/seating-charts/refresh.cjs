'use strict';

const { buildRosterRowWrites, guestDisplayName } = require('./roster-writes.cjs');
const { appendPerks } = require('./product-perks.cjs');
const FIELDS = ['perks', 'guest', 'guestEmail', 'purchaser', 'purchaserEmail', 'purchaserPhone', 'comments'];
const text = value => value == null ? '' : String(value);
const valuesOf = row => FIELDS.map(key => {
  if (key === 'guest') return guestDisplayName(row);
  if (row[key] != null && typeof row[key] !== 'string') throw Error('Expected literal reservation text');
  return row[key] ?? '';
});

function validateTarget(target) {
  const legacy=target?.sheetId===0&&target.sheetName==='Seating Chart Main';
  const created=/^[a-f0-9-]{36}$/.test(target?.documentGroupId??'')&&[0,1955136908].includes(target.templateSheetId)&&target.sheetId===100000000+Number(target.classId)&&typeof target.sheetName==='string'&&target.sheetName.length<=100;
  if (target?.studioCode !== 'STM' || target.isPrivate !== false || !(legacy||created)) {
    throw Error('This refresh requires a registered St Matthews class tab');
  }
  if (!target.spreadsheetId || target.spreadsheetId === target.masterSpreadsheetId || !target.masterSpreadsheetId ||
      !/^\d+$/.test(target.classId) || !Number.isSafeInteger(target.rowLimit) || target.rowLimit < 1) {
    throw Error('Missing verified pilot copy or class configuration');
  }
}

function adoptExistingRows({ target, source, cells }) {
  validateTarget(target);
  if (target.allowPilotAdoption !== true) throw Error('Existing pilot adoption is not enabled');
  // This one-time adoption is allowed only before staff have entered seats or
  // attendance, and only when every existing imported row matches fresh source.
  const available = source.rows.map(seat => ({ seat, values: valuesOf(seat) }));
  const ledger = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (!Array.isArray(c) || c.length !== 10 || text(c[0]) || text(c[8])) throw Error('Pilot already has seating or attendance; review adoption');
    const values = [...c.slice(2, 8), c[9]].map(text);
    if (values.every(v => v === '')) continue;
    const match = available.findIndex(item => JSON.stringify(item.values) === JSON.stringify(values));
    if (match < 0) throw Error('Existing pilot import differs from fresh reservations');
    const item = available.splice(match, 1)[0];
    ledger.push({ reservationKey: item.seat.reservationKey, row: i + 1, lastWritten: item.values, status: 'active' });
  }
  if (available.length) throw Error('Existing pilot is not a complete source match');
  return ledger;
}

// Each destination row is read as T:AC. Only V:AA and AC can be written.
// The caller supplies a complete fresh, bounded read plus the warehouse ledger.
function planRefresh({ target, source, ledger, cells }) {
  validateTarget(target);
  if (source?.complete !== true || source.isPrivate !== false || source.studioCode !== target.studioCode ||
      source.classId !== target.classId || !Array.isArray(source.rows) || source.rows.length !== source.expectedRowCount) {
    throw Error('Incomplete or wrong studio/class source');
  }
  if (!Array.isArray(ledger) || !Array.isArray(cells) || cells.length !== target.rowLimit || cells.some(row => !Array.isArray(row) || row.length !== 10)) throw Error('Missing complete ledger or destination read');
  const rowsById = new Map();
  const occupied = new Set();
  const nextLedger = structuredClone(ledger);
  for (const entry of nextLedger) {
    if (!/^\d+$/.test(entry.reservationKey) || rowsById.has(entry.reservationKey) || occupied.has(entry.row) ||
        !Number.isSafeInteger(entry.row) || entry.row < 1 || entry.row > target.rowLimit ||
        !Array.isArray(entry.lastWritten) || entry.lastWritten.length !== FIELDS.length) throw Error('Invalid reservation row ledger');
    rowsById.set(entry.reservationKey, entry); occupied.add(entry.row);
  }
  const current = row => {
    const values = cells[row - 1];
    if (!Array.isArray(values) || values.length !== 10) throw Error('Incomplete T:AC cell read');
    return values;
  };
  const imported = row => { const c = current(row); return [...c.slice(2, 8), c[9]].map(text); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const seen = new Set();
  const writes = [];
  const review = [...(source.productPerksReview??[])];
  const allocate = () => {
    // Do not reuse a removed guest's row or appropriate an existing manual row.
    for (let row = 1; row <= target.rowLimit; row++) {
      if (occupied.has(row)) continue;
      const c = current(row);
      if ([c[0], ...c.slice(2)].some(value => text(value) !== '')) continue;
      occupied.add(row); return row;
    }
    throw Error('No unused guest row remains; no rows were shifted');
  };
  for (const seat of source.rows) {
    if (!/^\d+$/.test(seat.reservationKey) || seen.has(seat.reservationKey)) throw Error('Missing or duplicate source reservation ID');
    seen.add(seat.reservationKey);
    const desired = valuesOf(seat);
    let entry = rowsById.get(seat.reservationKey);
    if (!entry) {
      entry = { reservationKey: seat.reservationKey, row: allocate(), lastWritten: Array(7).fill(''), status: 'active' };
      rowsById.set(entry.reservationKey, entry); nextLedger.push(entry);
    }
    const live = imported(entry.row);
    if ([...current(entry.row).slice(2, 8), current(entry.row)[9]].some(v => v && typeof v === 'object')) throw Error('Formula found in an owned import cell; review required');
    desired[0]=appendPerks(live[0],desired[0],seat.productPerks??[]);
    // A previous write may have succeeded before its acknowledgement was lost.
    if (!same(live.slice(1), entry.lastWritten.slice(1)) && !same(live.slice(1), desired.slice(1))) throw Error('Imported guest data was changed manually; review required');
    if (!same(live, desired)) writes.push({ ...seat, perks:desired[0],row: entry.row });
    entry.lastWritten = desired; entry.status = 'active';
  }
  for (const entry of nextLedger) {
    if (seen.has(entry.reservationKey)) continue;
    entry.status = 'removed-review';
    // Never erase or reuse a removed guest's row; keep their staff work attached.
    review.push({ reservationKey: entry.reservationKey, row: entry.row, reason: 'reservation-no-longer-active' });
  }
  const request = buildRosterRowWrites({ isPrivate: false, sheetName: target.sheetName, rowLimit: target.rowLimit, rows: writes });
  return { request, ledger: nextLedger, review, activeCount: source.rows.length, changedCount: writes.length };
}

function verifyReadback({ target, before, after, plan }) {
  validateTarget(target);
  if (before.length !== target.rowLimit || after.length !== target.rowLimit) throw Error('Incomplete verification read');
  for (let i = 0; i < target.rowLimit; i++) {
    if (before[i]?.length !== 10 || after[i]?.length !== 10) throw Error('Incomplete verification cells');
    // T seat, U label formula and AB attendance: compare user-entered values,
    // not computed formula results (which should change when names change).
    for (const column of [0, 1, 8]) if (JSON.stringify(before[i][column] ?? '') !== JSON.stringify(after[i][column] ?? '')) {
      throw Error('Protected seating, formula or attendance cell changed; do not mark success');
    }
  }
  for (const entry of plan.ledger.filter(e => e.status === 'active')) {
    const c = after[entry.row - 1];
    if (JSON.stringify([...c.slice(2, 8), c[9]].map(text)) !== JSON.stringify(entry.lastWritten)) throw Error('Reservation readback mismatch');
  }
  return { status: plan.review.length ? 'updated-needs-review' : 'updated', activeCount: plan.activeCount,
    changedCount: plan.changedCount, reviewCount: plan.review.length, seatingUnchanged: true, attendanceUnchanged: true, formulasUnchanged: true };
}

// A real store stages the complete source and immutable plan BEFORE Google.
// A durable run ID lets retries recover the same allocation after a lost reply.
function prepareRun(run, before) {
    validateTarget(run.target);
    let ledger = run.ledger;
    if (!run.plan && !ledger.length && run.target.allowPilotAdoption) ledger = adoptExistingRows({ target: run.target, source: run.source, cells: before });
    const plan = run.plan ?? planRefresh({ target: run.target, source: run.source, ledger, cells: before });
    if (run.plan) {
      // A staged plan can be retried after a partial/lost Google response, but
      // cannot overwrite a third value entered by staff since it was staged.
      for (const entry of plan.ledger.filter(e => e.status === 'active')) {
        const old = run.ledger.find(e => e.reservationKey === entry.reservationKey)?.lastWritten ?? Array(7).fill('');
        const live = before[entry.row - 1];
        const imported = [...live.slice(2, 8), live[9]];
        if (imported.some((v, i) => v && typeof v === 'object' || text(v) !== old[i] && text(v) !== entry.lastWritten[i])) {
          throw Error('Pending refresh conflicts with a staff edit; review required');
        }
      }
    }
    return plan;
}

async function refreshReservations({ targetId, runId, source, store, sheets }) {
  const run = await store.claim({ targetId, runId, source });
  if (run.completed) return run.result;
  try {
    const before = await sheets.read(run.target);
    const plan = prepareRun(run, before);
    if (!run.plan) await store.stage({ runId, plan });
    if (plan.request.data.length) await sheets.write(run.target, plan.request);
    const after = await sheets.read(run.target);
    const result = verifyReadback({ target: run.target, before, after, plan });
    await store.complete({ runId, plan, result });
    return result;
  } catch (error) {
    await store.fail({ runId, reason: 'refresh-failed-review-required' });
    throw error;
  }
}

module.exports = { FIELDS, validateTarget, adoptExistingRows, planRefresh, prepareRun, verifyReadback, refreshReservations };
