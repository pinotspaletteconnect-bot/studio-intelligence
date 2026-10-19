'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildReservationWorkflow } = require('./reservation-workflow.cjs');
const { buildPreservationTest } = require('./preservation-test.cjs');
const studio = { studioCode: 'STM', googleAccountEmail: 'studio@example.invalid', n8nGoogleCredentialRef: 'synthetic-credential',
  masterSpreadsheetId: 'synthetic-master', destinationFolderId: 'synthetic-folder', timeZone: 'America/New_York' };
const workflow = buildReservationWorkflow({ studio, supabaseUrl: 'https://warehouse.example.invalid', collectorUrl: 'https://collector.example.invalid' });
const compile = node => new Function('$input','$','$execution',node.parameters.jsCode);

test('draft reservation workflow is manual-only, secret-free, and blocked until target registration', () => {
  assert.equal(workflow.active,false); assert.equal(workflow.nodes.some(n=>/schedule|webhook/.test(n.type)),false);
  assert.equal(workflow.settings.saveManualExecutions,false);
  const setup=workflow.nodes.find(n=>n.name==='Pilot run settings');
  assert.throws(()=>compile(setup)(null,null,{id:'test-execution'}),/deployment pending/);
  for(const node of workflow.nodes.filter(n=>n.type.endsWith('code'))) assert.doesNotThrow(()=>compile(node),node.name);
});
test('warehouse source claim and immutable plan precede Google writes; verified readback precedes completion', () => {
  const names=workflow.nodes.map(n=>n.name);
  assert(names.indexOf('Claim warehouse refresh')<names.indexOf('Read chart before refresh'));
  assert(names.indexOf('Stage warehouse plan')<names.indexOf('Write only reservation columns'));
  assert(names.indexOf('Verify reservations and protected staff cells')<names.indexOf('Complete verified warehouse refresh'));
  const write=workflow.nodes.find(n=>n.name==='Write only reservation columns');
  assert.match(write.parameters.url,/values:batchUpdate/); assert.match(write.parameters.jsonBody,/plan.request/);
  assert.equal(workflow.connections['Reservation changes exist'].main[1][0].node,'Read chart after refresh');
});
test('generated n8n planner uses fresh bounded cell metadata and preserves real formulas', () => {
  const target={studioCode:'STM',isPrivate:false,classId:'123',sheetId:0,sheetName:'Seating Chart Main',rowLimit:3,
    spreadsheetId:'synthetic-copy',masterSpreadsheetId:'synthetic-master'};
  const guest={reservationKey:'1',guest:'Synthetic guest',purchaser:'Synthetic buyer'};
  const run={target,ledger:[],source:{complete:true,isPrivate:false,studioCode:'STM',classId:'123',rows:[guest],expectedRowCount:1}};
  const document={spreadsheetId:target.spreadsheetId,sheets:[{properties:{sheetId:0,title:target.sheetName,gridProperties:{rowCount:100}},data:[
    {startColumn:19,rowData:[{values:[{}, {userEnteredValue:{formulaValue:'=W1'}}]}]},
    {startRow:4,startColumn:17,rowData:[{values:[{userEnteredValue:{numberValue:123}}]}]},
  ]}]};
  const node=workflow.nodes.find(n=>n.name==='Prepare immutable reservation plan');
  const result=compile(node)({first:()=>({json:document})},()=>({first:()=>({json:run})}))[0].json;
  assert.deepEqual(result.before[0][1],{formulaValue:'=W1'});
  assert.deepEqual(result.plan.request.data.map(r=>r.range),["'Seating Chart Main'!V1:AA1","'Seating Chart Main'!AC1"]);
  document.sheets[0].data[1].rowData[0].values[0].userEnteredValue.numberValue=999;
  assert.throws(()=>compile(node)({first:()=>({json:document})},()=>({first:()=>({json:run})})),/class ID mismatch/);
});
test('isolated Google test makes its own native copy and all embedded code compiles', () => {
  const w=buildPreservationTest(studio);
  assert.equal(w.active,false); assert.equal(w.nodes.some(n=>/schedule|webhook/.test(n.type)),false);
  assert.match(w.nodes.find(n=>n.name==='Make isolated test copy').parameters.url,/synthetic-master\/copy$/);
  assert(w.nodes.findIndex(n=>n.name==='Require a separate native copy')<w.nodes.findIndex(n=>n.name==='Write test fixtures only'));
  for(const node of w.nodes.filter(n=>n.type.endsWith('code'))) assert.doesNotThrow(()=>compile(node),node.name);
});

test('embedded staffing refresh writes only mapped headers and verifies them beside protected reservation cells',()=>{
 const target={studioCode:'STM',isPrivate:false,classId:'123',sheetId:0,sheetName:'Seating Chart Main',rowLimit:3,spreadsheetId:'copy',masterSpreadsheetId:'master',staffUpdatesEnabled:true};
 const run={target,ledger:[],staffLedger:{},source:{complete:true,isPrivate:false,studioCode:'STM',classId:'123',rows:[],expectedRowCount:0,
 assignedStaff:{complete:true,expectedRowCount:2,rows:[{assignmentId:'1',name:'Haley Zempel',role:'Instructor',status:'Scheduled'},{assignmentId:'2',name:'Kit Kongos',role:'Assistant',status:'Scheduled On-Call'}]}}};
 const cell=stringValue=>({values:[{userEnteredValue:{stringValue}}]});
 const document={spreadsheetId:'copy',sheets:[{properties:{sheetId:0,title:target.sheetName,gridProperties:{rowCount:100}},data:[
 {startColumn:19,rowData:[{values:[{}, {userEnteredValue:{formulaValue:'=W1'}}]}]},
 {startRow:4,startColumn:17,rowData:[{values:[{userEnteredValue:{numberValue:123}}]}]},
 {startRow:4,startColumn:3,rowData:[cell('Stage: '),cell('Floor 1: '),cell('Floor 2:')]},
 {startRow:5,startColumn:6,rowData:[cell('On-Call 1: '),cell('On-Call 2:')]},
 ]}]};
 const prepare=workflow.nodes.find(n=>n.name==='Prepare immutable reservation plan');
 const prepared=compile(prepare)({first:()=>({json:document})},()=>({first:()=>({json:run})}))[0].json;
 assert.deepEqual(prepared.plan.request.data.map(d=>d.range),["'Seating Chart Main'!D5","'Seating Chart Main'!G6"]);
 document.sheets[0].data[2].rowData[0]=cell('Stage: Haley');document.sheets[0].data[3].rowData[0]=cell('On-Call 1: Kit');
 const verify=workflow.nodes.find(n=>n.name==='Verify reservations and protected staff cells');
 const result=compile(verify)({first:()=>({json:document})},name=>({first:()=>({json:name==='Prepare immutable reservation plan'?prepared:run})}))[0].json;
 assert.equal(result.staffVerified,true);assert.equal(result.staffChangedCount,2);assert.equal(result.attendanceUnchanged,true);assert.equal(result.formulasUnchanged,true);
});
