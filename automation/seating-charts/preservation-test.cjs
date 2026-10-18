'use strict';
const fs = require('node:fs');
const path = require('node:path');

function refreshLibrary() {
  const strip = file => fs.readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/^'use strict';\s*/m, '')
    .replace(/^const \{ buildRosterRowWrites(?:, guestDisplayName)? \} = require\('.\/roster-writes.cjs'\);\s*/m, '')
    .replace(/^module\.exports = .*;\s*$/m, '');
  return `const structuredClone = value => JSON.parse(JSON.stringify(value));\n${strip('roster-writes.cjs')}\n${strip('refresh.cjs')}\n`;
}

function buildPreservationTest(studio) {
  if (studio.studioCode !== 'STM' || !studio.n8nGoogleCredentialRef || !studio.destinationFolderId) throw Error('Verified STM config is required');
  const nodes = [], connections = {};
  const add = (name, type, parameters, credentials) => {
    nodes.push({ id: `stm-preserve-${nodes.length}`, name, type, typeVersion: type.endsWith('httpRequest') ? 4.2 : type.endsWith('code') ? 2 : 1,
      position: [nodes.length * 240, 0], parameters, ...(credentials ? { credentials } : {}) });
  };
  const google = { googleDriveOAuth2Api: { id: studio.n8nGoogleCredentialRef, name: 'St Matthews Seating Charts — Google Drive' } };
  const http = (name, method, url, body) => add(name, 'n8n-nodes-base.httpRequest', {
    method, url, authentication: 'predefinedCredentialType', nodeCredentialType: 'googleDriveOAuth2Api',
    ...(body ? { sendBody: true, specifyBody: 'json', jsonBody: body } : {}), options: { timeout: 30000 },
  }, google);
  const code = (name, jsCode) => add(name, 'n8n-nodes-base.code', { jsCode });
  const lib = refreshLibrary();
  const targetCode = `const target={studioCode:'STM',isPrivate:false,classId:'123',sheetId:0,sheetName:'Seating Chart Main',rowLimit:6,
spreadsheetId:$('Make isolated test copy').first().json.id,masterSpreadsheetId:${JSON.stringify(studio.masterSpreadsheetId)}};`;
  const fixtures = `const seat=(id,guest)=>({reservationKey:String(id),perks:'',guest,guestEmail:'',purchaser:'Synthetic test purchaser',purchaserEmail:'test@example.invalid',purchaserPhone:'',comments:''});
const initial=[seat(11,'Test guest A'),seat(12,'')];
const incoming=[seat(12,'Test guest B'),seat(11,'Test guest A corrected'),seat(13,'New test guest')];
const source=rows=>({studioCode:'STM',classId:'123',complete:true,isPrivate:false,rows,expectedRowCount:rows.length});`;
  const cellsCode = `const block=$input.first().json.sheets?.find(s=>s.properties.sheetId===0)?.data?.[0];
if(!block)throw Error('Missing test-copy cell data');
const cells=Array.from({length:6},(_,i)=>Array.from({length:10},(_,j)=>{const v=block.rowData?.[i]?.values?.[j]?.userEnteredValue;
return v?.formulaValue?{formulaValue:v.formulaValue}:v?.stringValue??v?.numberValue??v?.boolValue??'';}));`;
  const readUrl = `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Make isolated test copy').first().json.id }}?ranges=${encodeURIComponent("'Seating Chart Main'!T1:AC6")}&includeGridData=true&fields=spreadsheetId,sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(userEnteredValue))))`;
  const writeUrl = `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Make isolated test copy').first().json.id }}/values:batchUpdate`;
  add('Manual isolated preservation test', 'n8n-nodes-base.manualTrigger', {});
  http('Verify STM Google identity', 'GET', 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
  code('Require STM Google account', `if($input.first().json.user?.emailAddress!==${JSON.stringify(studio.googleAccountEmail)})throw Error('Wrong studio Google account');return [{json:{accountVerified:true}}];`);
  http('Make isolated test copy', 'POST', `https://www.googleapis.com/drive/v3/files/${studio.masterSpreadsheetId}/copy`,
    JSON.stringify({ name: 'TEST ONLY - STM reservation refresh safeguards', parents: [studio.destinationFolderId] }));
  code('Require a separate native copy', `${targetCode}
if(!target.spreadsheetId||target.spreadsheetId===target.masterSpreadsheetId)throw Error('No verified test copy');return [{json:{copyVerified:true}}];`);
  code('Seed synthetic guests in test copy', `${lib}\n${targetCode}\n${fixtures}
const cells=Array.from({length:6},()=>Array(10).fill(''));
const plan=planRefresh({target,source:source(initial),ledger:[],cells});
plan.request.data.push({range:"'Seating Chart Main'!T1:T2",values:[['TEST A7'],['TEST B4']]},
{range:"'Seating Chart Main'!AB1:AB2",values:[[true],[false]]});
return [{json:{request:plan.request,ledger:plan.ledger}}];`);
  http('Write test fixtures only', 'POST', writeUrl, '={{ $json.request }}');
  http('Read before reservation refresh', 'GET', readUrl);
  code('Plan reservation refresh', `${lib}\n${targetCode}\n${fixtures}\n${cellsCode}
const ledger=$('Seed synthetic guests in test copy').first().json.ledger;
const plan=planRefresh({target,source:source(incoming),ledger,cells});
return [{json:{target,before:cells,plan,incoming}}];`);
  http('Refresh only reservation columns', 'POST', writeUrl, '={{ $json.plan.request }}');
  http('Read after reservation refresh', 'GET', readUrl);
  code('Verify staff work and repeat refresh', `${lib}\n${fixtures}\n${cellsCode}
const run=$('Plan reservation refresh').first().json;
const result=verifyReadback({target:run.target,before:run.before,after:cells,plan:run.plan});
const repeat=planRefresh({target:run.target,source:source(run.incoming.slice().reverse()),ledger:run.plan.ledger,cells});
if(repeat.request.data.length!==0)throw Error('Repeat refresh is not idempotent');
if(cells[0][0]!=='TEST A7'||cells[1][0]!=='TEST B4'||cells[0][8]!==true||cells[1][8]!==false)throw Error('Test staff values changed');
return [{json:{...result,status:'preservation_test_passed',syntheticGuestsOnly:true,repeatWriteCount:0,
testSpreadsheetId:run.target.spreadsheetId,originalPilotUntouched:true,scheduleEnabled:false}}];`);
  nodes.forEach((node, i) => { if (i + 1 < nodes.length) connections[node.name] = { main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]] }; });
  return { name: '01 - Seating Charts - STM isolated refresh test', active: false, nodes, connections,
    settings: { executionOrder: 'v1', timezone: studio.timeZone, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none', saveManualExecutions: false } };
}

if (require.main === module) {
  const studio = JSON.parse(fs.readFileSync(path.join(__dirname, 'studios.example.json'), 'utf8')).studios.find(s => s.studioCode === 'STM');
  fs.writeFileSync(path.join(__dirname, '01-stm-isolated-refresh-test.json'), JSON.stringify(buildPreservationTest(studio), null, 2) + '\n');
}
module.exports = { refreshLibrary, buildPreservationTest };
