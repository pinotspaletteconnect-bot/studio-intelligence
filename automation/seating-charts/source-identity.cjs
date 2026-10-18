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
  const seatGroups = new Map();
  for (const seat of seats) {
    const key = signature(seat);
    if (!seatGroups.has(key)) seatGroups.set(key, []);
    seatGroups.get(key).push(seat);
  }
  if (groups.size !== seatGroups.size) throw Error('Order and seating sources disagree');
  const byIndex = new Map();
  for (const [key, values] of seatGroups) {
    const reservations = groups.get(key);
    if (!reservations || reservations.length !== values.length) throw Error('Order and seating seat counts disagree');
    // Indistinguishable guests are safe only if EVERY imported field is equal.
    // Different perks/details on duplicate names cannot be guessed onto IDs.
    const payload = s => JSON.stringify([s.perks, s.guest, s.guestEmail, s.purchaser, s.purchaserEmail, s.purchaserPhone, s.comments]);
    if (new Set(values.map(payload)).size !== 1) throw Error('Ambiguous duplicate guest details');
    reservations.sort((a, b) => a.reservationId.localeCompare(b.reservationId, 'en', { numeric: true }));
    values.forEach((seat, i) => byIndex.set(seat.sourceRowIndex, { ...seat, reservationKey: reservations[i].reservationId }));
  }
  return seats.map(seat => byIndex.get(seat.sourceRowIndex));
}

module.exports = { identifyReservations };
