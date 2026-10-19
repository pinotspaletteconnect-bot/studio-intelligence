'use strict';

const { normalizeSeatingTable } = require('./seating-source.cjs');

// The order grid's reservationCheckbox value is the real per-seat ID. Kendo's
// data-uid, display order, purchaser name and order ID are not guest identities.
function identifyReservations(source) {
  const seats = normalizeSeatingTable(source);
  if (!Array.isArray(source.reservations)) throw Error('Missing reservation identities');
  const groups = new Map();
  const ids = new Set();
  // Seating's Comments can include Pinot-generated text not present in the
  // order's Seating Requests control (observed on the real pilot). Match on
  // order/name/email; require all imported fields identical within duplicates.
  const signature = r => JSON.stringify([r.sourceOrderId, r.guest, r.guestEmail]);
  for (const r of source.reservations) {
    if (!/^\d+$/.test(r.reservationId) || !/^\d+$/.test(r.sourceOrderId) || ids.has(r.reservationId)) {
      throw Error('Missing or duplicate reservation ID');
    }
    ids.add(r.reservationId);
    if (!['Active', 'On Hold', 'Refunded'].includes(r.status)) throw Error('Unknown reservation status');
    if (r.status !== 'Active') continue;
    for (const key of ['guest', 'guestEmail', 'comments']) if (typeof r[key] !== 'string') throw Error('Incomplete reservation detail');
    const key = signature(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const byIndex = new Map();
  const payload = s => JSON.stringify([s.perks, s.guest, s.guestEmail, s.purchaser, s.purchaserEmail, s.purchaserPhone, s.comments]);
  // Admin sometimes repeats the purchaser's name/email on every seating row,
  // while the actual order retains an unnamed guest. Reconcile only when all
  // seating fields are identical, counts agree, and the order contains that
  // purchaser plus genuinely blank guests. The order's real IDs/names remain
  // authoritative; differing perks or other named guests still stop matching.
  for (const orderId of new Set(seats.map(s => s.sourceOrderId))) {
    const values = seats.filter(s => s.sourceOrderId === orderId);
    const reservations = [...groups.values()].flat().filter(r => r.sourceOrderId === orderId);
    const sample = values[0];
    const named = reservations.filter(r => signature(r) === signature(sample));
    const blank = reservations.filter(r => r.guest === '' && r.guestEmail === '');
    if (values.length < 2 || reservations.length !== values.length || !sample.guest ||
        sample.guest !== sample.purchaser || sample.guestEmail !== sample.purchaserEmail ||
        new Set(values.map(payload)).size !== 1 || !named.length || !blank.length ||
        named.length + blank.length !== reservations.length) continue;
    reservations.sort((a,b) => a.reservationId.localeCompare(b.reservationId,'en',{numeric:true}));
    values.forEach((seat,i) => byIndex.set(seat.sourceRowIndex, {...seat,
      guest:reservations[i].guest,guestEmail:reservations[i].guestEmail,reservationKey:reservations[i].reservationId}));
    for (const [key,rows] of groups) if (rows[0].sourceOrderId === orderId) groups.delete(key);
  }
  const seatGroups = new Map();
  for (const seat of seats) {
    if (byIndex.has(seat.sourceRowIndex)) continue;
    const key = signature(seat);
    if (!seatGroups.has(key)) seatGroups.set(key, []);
    seatGroups.get(key).push(seat);
  }
  if (groups.size !== seatGroups.size) throw Error('Order and seating sources disagree');
  for (const [key, values] of seatGroups) {
    const reservations = groups.get(key);
    if (!reservations || reservations.length !== values.length) throw Error('Order and seating seat counts disagree');
    // Indistinguishable guests are safe only if EVERY imported field is equal.
    // Different perks/details on duplicate names cannot be guessed onto IDs.
    if (new Set(values.map(payload)).size !== 1) throw Error('Ambiguous duplicate guest details');
    reservations.sort((a, b) => a.reservationId.localeCompare(b.reservationId, 'en', { numeric: true }));
    values.forEach((seat, i) => byIndex.set(seat.sourceRowIndex, { ...seat, reservationKey: reservations[i].reservationId }));
  }
  return seats.map(seat => byIndex.get(seat.sourceRowIndex));
}

module.exports = { identifyReservations };
