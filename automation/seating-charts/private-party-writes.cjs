'use strict';

// St. Matthews form anchors verified against the owner-provided filled example.
// Values must be normalized from verified source facts before reaching here.
const FIELD_CELLS = Object.freeze({
  dateAndTime: 'C3',
  hostNameAndPhone: 'C4',
  paintingSummary: 'C5',
  eventName: 'C8',
  depositReceived: 'C9',
  pricePerSeat: 'C12',
  paymentArrangement: 'C15',
  expectedHeadcount: 'C22',
  doorsOpenClose: 'C7',
  applyDeposit: 'C10',
  seatNotes: 'C13',
  minimumNeedsToPay: 'H4',
  music: 'C16',
  food: 'C17',
  barOrdered: 'C18',
  barCharge: 'C19',
  barPayment: 'C20',
  extraTime: 'C21',
  otherNotes: 'C23',
});

// Preserve the explicit displayed amount; missing/ambiguous records are not $0.
// Multiple linked deposits need review rather than an inferred financial total.
function verifiedDepositFact(records) {
  const record = Array.isArray(records) && records.length === 1 ? records[0] : null;
  const verified = !!record && /^\d+$/.test(record.orderId ?? '') &&
    typeof record.dateText === 'string' && record.dateText.trim() !== '' &&
    /^\$(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)\.\d{2}$/.test(record.amountText ?? '');
  return { verified, value: verified ? record.amountText : null };
}

// POS comments are source data, never instructions to execute. Copy explicit
// labelled facts verbatim; keep the complete note for context and review.
// Minimum paid seats belong in seat notes, separate from expected headcount.
function partyNoteFacts(comments) {
  if (typeof comments !== 'string' || !comments.trim()) return {};
  const notes=comments.trim(), fields={otherNotes:{verified:true,value:notes}}, minimums=[];
  const add=(field,value)=>{
    fields[field]={verified:true,value:[fields[field]?.value,value].filter(Boolean).join('\n')};
  };
  const labels=[
    [/^(?:doors?(?: open\s*\/\s*close)?|doors? open|doors? close|door times?)\s*:\s*(.+)$/i,'doorsOpenClose'],
    [/^(?:apply deposit|deposit application)\s*:\s*(.+)$/i,'applyDeposit'],
    [/^(?:notes? for seats?|seating notes?)\s*:\s*(.+)$/i,'seatNotes'],
    [/^(?:music|music selection)\s*:\s*(.+)$/i,'music'],
    [/^(?:food|food notes?)\s*:\s*(.+)$/i,'food'],
    [/^(?:bar|bar ordered)\s*:\s*(.+)$/i,'barOrdered'],
    [/^(?:bar (?:to be charged|charge|total))\s*:\s*(\$(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)\.\d{2})$/i,'barCharge'],
    [/^(?:bar payment|bar how paying)\s*:\s*(.+)$/i,'barPayment'],
    [/^(?:extra time|additional time)\s*:\s*(.+)$/i,'extraTime'],
  ];
  for(const raw of notes.split(/\r?\n/)){
    const line=raw.trim().replace(/^[-*•]\s*/, '');
    // Preserve the entire minimum statement, including currency/count/context.
    if(/\b(?:minimum|min\.)\b/i.test(line)&&/\b(?:pay|paid|payment|painters?|seats?|guests?|people|persons?)\b/i.test(line)){
      add('seatNotes',line);
      const match=/^minimum\s+(?:(?:needs?\s+to\s+pay(?:\s+for)?|of|is|required|paid\s+seats?)\s*)?[:=]?\s*(\d+)\s*(?:paid\s+)?(?:painters?|seats?|guests?|people|persons?)\b/i.exec(line)
        ?? /^minimum\s+needs?\s+to\s+pay\s*[:=]\s*(\d+)\s*$/i.exec(line);
      minimums.push(match&&Number.isSafeInteger(Number(match[1]))?Number(match[1]):null);continue;
    }
    for(const [pattern,field]of labels){const match=pattern.exec(line);if(match){add(field,match[1]);break;}}
  }
  if(minimums.length)fields.minimumNeedsToPay={verified:minimums.every(n=>n!==null&&n===minimums[0]),value:minimums.every(n=>n!==null&&n===minimums[0])?minimums[0]:null};
  return fields;
}

function minimumPaidSeatsFact(party, policy, noteFacts = partyNoteFacts(party?.posStaffComments)) {
  // An explicit exception (including an ambiguous one) takes precedence over
  // defaults. Never derive the minimum from expected headcount or attendance.
  if (Object.hasOwn(noteFacts, 'minimumNeedsToPay')) return noteFacts.minimumNeedsToPay;
  const category = policy?.partyTypes?.[party?.partyType];
  const count = ['adult','kids'].includes(category) ? policy?.[category] : null;
  return { verified: Number.isSafeInteger(count) && count > 0,
    value: Number.isSafeInteger(count) && count > 0 ? count : null };
}

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
    if (fact === undefined && ['doorsOpenClose','applyDeposit','seatNotes','minimumNeedsToPay','music','food','barOrdered','barCharge','barPayment','extraTime','otherNotes'].includes(field)) continue;
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

module.exports = { FIELD_CELLS, buildPrivatePartyWrites, verifiedDepositFact, partyNoteFacts, minimumPaidSeatsFact };
