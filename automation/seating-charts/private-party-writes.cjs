'use strict';

// St. Matthews form anchors verified against the owner-provided filled example.
// Values must be normalized from verified source facts before reaching here.
const FIELD_CELLS = Object.freeze({
  dateAndTime: 'C3',
  hostNameAndPhone: 'C4',
  paintingSummary: 'C5',
  eventName: 'C8',
  pricePerSeat: 'C12',
  paymentArrangement: 'C15',
  expectedHeadcount: 'C22',
});

function scalar(value) {
  return value === null || typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value));
}

function buildPrivatePartyWrites({ isPrivate, sheetName, sourceFields, currentCells, lastWrittenCells = {} }) {
  if (isPrivate !== true) throw new Error('Private Party forms require a verified private event');
  if (typeof sheetName !== 'string' || !sheetName.trim()) throw new Error('Missing verified tab name');
  if (!sourceFields || !currentCells) throw new Error('Missing verified source or current form readback');
  const data = [];
  const needsReview = [];
  const writtenCells = {};
  const tab = `'${sheetName.replace(/'/g, "''")}'`;
  for (const [field, cell] of Object.entries(FIELD_CELLS)) {
    const fact = sourceFields[field];
    if (fact?.verified !== true || fact.value === null || fact.value === undefined || fact.value === '') {
      needsReview.push({ field, cell, reason: 'source_unverified_or_missing' });
      continue;
    }
    if (!scalar(fact.value)) throw new Error(`Invalid source value for ${field}`);
    // null means observed empty. Absent means the cell has NOT been read.
    if (!Object.hasOwn(currentCells, cell)) {
      needsReview.push({ field, cell, reason: 'current_cell_not_read' });
      continue;
    }
    const current = currentCells[cell];
    if (!scalar(current)) {
      needsReview.push({ field, cell, reason: 'formula_or_non_scalar_cell' });
      continue;
    }
    const unchangedOwnedValue = Object.hasOwn(lastWrittenCells, cell) &&
      current === lastWrittenCells[cell];
    if (current !== null && current !== '' && !unchangedOwnedValue) {
      needsReview.push({ field, cell, reason: 'preserve_existing_staff_value' });
      continue;
    }
    if (current === fact.value) continue;
    data.push({ range: `${tab}!${cell}`, values: [[fact.value]] });
    writtenCells[cell] = fact.value;
  }
  // Persist these values only after successful write/readback, never at plan time.
  return { request: { valueInputOption: 'RAW', data }, writtenCells, needsReview };
}

module.exports = { FIELD_CELLS, buildPrivatePartyWrites };
