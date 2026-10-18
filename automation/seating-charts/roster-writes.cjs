'use strict';

// Build RAW value requests only. Caller must resolve the authorized copy/tab,
// stable reservation identities, and existing row positions before using this.
// No request ever includes seating (T), label formulas (U), or attendance (AB).
const IMPORT_FIELDS = ['perks', 'guest', 'guestEmail', 'purchaser', 'purchaserEmail', 'purchaserPhone'];

// Display only: retain the original blank source name for reservation matching.
function guestDisplayName(item) {
  if (item.guest != null && typeof item.guest !== 'string') throw Error('Expected source text for guest');
  if (item.guest?.trim()) return item.guest;
  if (item.purchaser != null && typeof item.purchaser !== 'string') throw Error('Expected source text for purchaser');
  const firstName = (item.purchaser ?? '').trim().split(/\s+/u)[0];
  return firstName ? `${firstName}'s guest` : 'Guest';
}

function buildRosterRowWrites({ isPrivate, sheetName, rowLimit, rows }) {
  if (isPrivate !== false) throw new Error('Seating charts are for verified non-private classes only');
  if (typeof sheetName !== 'string' || !sheetName.trim()) throw new Error('Missing verified tab name');
  if (!Number.isSafeInteger(rowLimit) || rowLimit < 1) throw new Error('Missing verified row limit');
  if (!Array.isArray(rows)) throw new Error('Expected mapped reservation rows');
  const seenRows = new Set();
  const seenKeys = new Set();
  const tab = `'${sheetName.replace(/'/g, "''")}'`;
  const data = [];
  for (const item of rows) {
    if (!Number.isSafeInteger(item.row) || item.row < 1 || item.row > rowLimit) {
      throw new Error('Mapped row is outside the verified tab');
    }
    if (typeof item.reservationKey !== 'string' || !item.reservationKey.trim()) {
      throw new Error('Missing durable reservation identity');
    }
    if (seenRows.has(item.row) || seenKeys.has(item.reservationKey)) {
      throw new Error('Duplicate reservation identity or destination row');
    }
    seenRows.add(item.row);
    seenKeys.add(item.reservationKey);
    const cell = field => {
      if (field === 'guest') return guestDisplayName(item);
      const value = item[field];
      if (value == null) return '';
      if (typeof value !== 'string') throw new Error(`Expected source text for ${field}`);
      return value;
    };
    data.push({ range: `${tab}!V${item.row}:AA${item.row}`, values: [IMPORT_FIELDS.map(cell)] });
    data.push({ range: `${tab}!AC${item.row}`, values: [[cell('comments')]] });
  }
  return { valueInputOption: 'RAW', data };
}

module.exports = { guestDisplayName, buildRosterRowWrites };
