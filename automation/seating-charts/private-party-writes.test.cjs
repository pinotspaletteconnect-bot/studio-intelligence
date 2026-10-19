'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FIELD_CELLS, buildPrivatePartyWrites: build, verifiedDepositFact, partyNoteFacts } = require('./private-party-writes.cjs');
const base = { isPrivate: true, sheetName: 'Private Party' };

test('class events cannot receive Private Party form writes', () => {
  assert.throws(() => build({ ...base, isPrivate: false, sourceFields: {}, currentCells: {} }), /verified private event/);
});

test('only verified party facts target the mapped form cells', () => {
  const sourceFields = Object.fromEntries(Object.keys(FIELD_CELLS).map(field =>
    [field, { verified: true, value: `Synthetic ${field}` }]));
  sourceFields.attendance = { verified: true, value: 12 };
  sourceFields.seat = { verified: true, value: '35' };
  sourceFields.depositReceived = { verified: true, value: 100 };
  const currentCells = Object.fromEntries(Object.values(FIELD_CELLS).map(cell => [cell, null]));
  const result = build({ ...base, sourceFields, currentCells });
  assert.deepEqual(result.request.data.map(d => d.range), Object.values(FIELD_CELLS).map(cell=>`'Private Party'!${cell}`));
  assert.equal(result.request.valueInputOption, 'RAW');
  assert.equal(result.needsReview.length, 0);
});

test('staff edits survive refresh while unchanged automation values can update', () => {
  const result = build({ ...base,
    sourceFields: {
      eventName: { verified: true, value: 'New source event name' },
      expectedHeadcount: { verified: true, value: 14 },
    },
    currentCells: { C8: 'Manager edited title', C22: 12 },
    lastWrittenCells: { C8: 'Old source event name', C22: 12 },
  });
  assert.deepEqual(result.request.data, [{ range: "'Private Party'!C22", values: [[14]] }]);
  assert.ok(result.needsReview.some(r => r.cell === 'C8' && r.reason === 'preserve_existing_staff_value'));
});

test('missing facts do not clear fields or turn expected guests into attendance', () => {
  const result = build({ ...base, sourceFields: {
    expectedHeadcount: { verified: false, value: 12 },
    pricePerSeat: { verified: true, value: null },
  }, currentCells: { C22: 10, C12: 39 } });
  assert.deepEqual(result.request.data, []);
  assert.equal(result.needsReview.length, 8);
});

test('deposit uses one explicit linked amount, including zero, without inferring payments', () => {
  const record={amountText:'$100.00',orderId:'12345',dateText:'9/7/2026 4:06:14 PM'};
  for(const amountText of ['$100.00','$0.00','$1,000.25'])
    assert.deepEqual(verifiedDepositFact([{...record,amountText}]),{verified:true,value:amountText});
  for(const records of [undefined,[],[record,record],[{...record,orderId:null}],[{...record,dateText:''}],
    ...['100.00','$100.00 refunded','$-100.00','$1,00.00','$1e3.00'].map(amountText=>[{...record,amountText}])])
    assert.deepEqual(verifiedDepositFact(records),{verified:false,value:null});
  const sourceFields={depositReceived:verifiedDepositFact([record])};
  const result=build({...base,sourceFields,currentCells:{C9:null}});
  assert.deepEqual(result.request.data,[{range:"'Private Party'!C9",values:[['$100.00']]}]);
  assert.equal(build({...base,sourceFields,currentCells:{C9:'Manager note'}}).request.data.length,0);
  assert.equal(build({...base,sourceFields,currentCells:{C9:{formulaValue:'=example()'}}}).request.data.length,0);
});

test('POS staff notes preserve exact minimums and route only explicit facts to matching form cells',()=>{
  const comments='Minimum needs to pay for 12 painters, even if fewer attend.\nFood: Bringing pizza\nMusic: 90s\nBar charge: $75.00\nApply deposit: Host seats\nPlease call host on arrival';
  const facts=partyNoteFacts(comments);
  assert.equal(facts.seatNotes.value,'Minimum needs to pay for 12 painters, even if fewer attend.');
  assert.deepEqual(facts.minimumNeedsToPay,{verified:true,value:12});
  assert.deepEqual(partyNoteFacts('Minimum payment $500').minimumNeedsToPay,{verified:false,value:null});
  assert.deepEqual(partyNoteFacts('Minimum 12 paid seats\nMinimum 14 paid seats').minimumNeedsToPay,{verified:false,value:null});
  assert.equal(facts.food.value,'Bringing pizza');assert.equal(facts.music.value,'90s');
  assert.equal(facts.barCharge.value,'$75.00');assert.equal(facts.applyDeposit.value,'Host seats');
  assert.equal(facts.otherNotes.value,comments);
  assert.equal(facts.expectedHeadcount,undefined);assert.equal(facts.depositReceived,undefined);
  assert.equal(partyNoteFacts('Bar charge: perhaps $75').barCharge,undefined);
  assert.deepEqual(partyNoteFacts(''),{});
  const currentCells=Object.fromEntries(Object.values(FIELD_CELLS).map(cell=>[cell,null]));
  currentCells.C17='Manager food instructions';
  const planned=build({...base,sourceFields:facts,currentCells});
  assert.ok(planned.request.data.some(d=>d.range.endsWith('!C13')));
  assert.ok(!planned.request.data.some(d=>/!C(?:9|12|14|17|22)$/.test(d.range)));
  assert.ok(planned.needsReview.some(r=>r.cell==='C17'&&r.reason==='preserve_existing_staff_value'));
});

test('unread cells and formulas are never overwritten', () => {
  const result = build({ ...base,
    sourceFields: { eventName: { verified: true, value: 'Event' }, pricePerSeat: { verified: true, value: 39 } },
    currentCells: { C12: { formulaValue: '=example()' } },
  });
  assert.deepEqual(result.request.data, []);
  assert.ok(result.needsReview.some(r => r.cell === 'C8' && r.reason === 'current_cell_not_read'));
  assert.ok(result.needsReview.some(r => r.cell === 'C12' && r.reason === 'formula_or_non_scalar_cell'));
});
