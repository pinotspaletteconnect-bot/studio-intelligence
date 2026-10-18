'use strict';

// Normalize the verified class seating table for ETL; no collection or writes.
const HEADERS = ['Order Id', 'Perks', 'Guest', 'Guest Email', 'Purchaser',
  'Purchaser Email', 'Purchaser Phone', 'Checked In', 'Comments'];
const normalizeHeader = value => String(value).trim().replace(/\s+/g, ' ').toLowerCase();

function normalizeSeatingTable({ isPrivate, complete, expectedRowCount, headers, rows }) {
  if (isPrivate !== false) throw new Error('Only classes have seating rosters');
  if (complete !== true) throw new Error('Incomplete source seating table');
  if (!Array.isArray(headers) || headers.length !== HEADERS.length ||
      headers.some((value, i) => normalizeHeader(value) !== normalizeHeader(HEADERS[i]))) {
    throw new Error('Source seating columns changed; review before importing');
  }
  if (!Array.isArray(rows) || !Number.isSafeInteger(expectedRowCount) ||
      expectedRowCount < 0 || rows.length !== expectedRowCount) {
    throw new Error('Seating row count is unverified or incomplete');
  }
  return rows.map((row, sourceRowIndex) => {
    if (!Array.isArray(row) || row.length !== HEADERS.length) {
      throw new Error('Source seating row has the wrong column count');
    }
    const cells = row.map((value, column) => {
      if (value == null) return '';
      if (typeof value === 'string') return value;
      if (column === 0 && Number.isSafeInteger(value)) return String(value);
      throw new Error('Expected source seating text');
    });
    if (!/^\d+$/.test(cells[0])) throw new Error('Missing source order ID');
    return {
      // Order ID and source row index are context, not durable guest identity.
      sourceOrderId: cells[0], sourceRowIndex,
      perks: cells[1], guest: cells[2], guestEmail: cells[3],
      purchaser: cells[4], purchaserEmail: cells[5], purchaserPhone: cells[6],
      // Checked In at index 7 is intentionally excluded; Comments keeps AC.
      comments: cells[8],
    };
  });
}

module.exports = { HEADERS, normalizeSeatingTable };
