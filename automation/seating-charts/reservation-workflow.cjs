'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { refreshLibrary } = require('./preservation-test.cjs');

function buildReservationWorkflow({ studio, supabaseUrl, collectorUrl, targetId = null, runId = null }) {
  if (studio.studioCode !== 'STM' || !studio.n8nGoogleCredentialRef) throw Error('Verified STM connection required');
  const nodes = [], connections = {};
  const add = (name, type, parameters, credentials, version) => nodes.push({ id: `stm-refresh-${nodes.length}`, name, type,
    typeVersion: version ?? (type.endsWith('httpRequest') ? 4.2 : type.endsWith('code') ? 2 : 1),
    position: [nodes.length * 240, 0], parameters, ...(credentials ? { credentials } : {}) });
  const code = (name, jsCode) => add(name, 'n8n-nodes-base.code', { jsCode });
  const credentials = {
    google: { googleDriveOAuth2Api: { id: studio.n8nGoogleCredentialRef, name: 'St Matthews Seating Charts — Google Drive' } },
    warehouse: { supabaseApi: { id: 'A32h7eKkq8JEdg0k', name: 'Supabase account' } },
    collector: { httpHeaderAuth: { id: 'li7hEi0wisqrbFlP', name: 'Studio Intelligence Collector' } },
  };
  const http = (name, auth, method, url, body) => {
    const creds = credentials[auth], type = Object.keys(creds)[0];
    add(name, 'n8n-nodes-base.httpRequest', { method, url,
      authentication: auth === 'collector' ? 'genericCredentialType' : 'predefinedCredentialType',
      [auth === 'collector' ? 'genericAuthType' : 'nodeCredentialType']: type,
      ...(body ? { sendBody: true, specifyBody: 'json', jsonBody: body } : {}), options: { timeout: auth === 'collector' ? 180000 : 30000 } }, creds);
  };
  const rpc = (name, fn, body) => http(name, 'warehouse', 'POST', `${supabaseUrl}/rest/v1/rpc/${fn}`, body);
  const library = refreshLibrary();
  const staffLibrary = fs.readFileSync(path.join(__dirname,'staff-writes.cjs'),'utf8').replace(/^'use strict';\s*/m,'').replace(/^module\.exports = .*;\s*$/m,'');
  const identityLibrary = ['seating-source.cjs','source-identity.cjs'].map(file => fs.readFileSync(path.join(__dirname,file),'utf8')
    .replace(/^'use strict';\s*/m,'').replace(/^const \{ normalizeSeatingTable \} = require\(.*\);\s*/m,'').replace(/^module\.exports = .*;\s*$/m,'')).join('\n');
  const cells = `const run=$('Claim warehouse refresh').first().json;
const target=run.target; const document=$input.first().json;
const sheet=document.sheets?.find(s=>s.properties.sheetId===target.sheetId);
if(document.spreadsheetId!==target.spreadsheetId||sheet?.properties.title!==target.sheetName||sheet.properties.gridProperties.rowCount<target.rowLimit)throw Error('Spreadsheet/tab shape mismatch');
const grid=sheet.data?.find(d=>(d.startRow??0)===0&&d.startColumn===19);
const classCell=sheet.data?.find(d=>d.startRow===4&&d.startColumn===17)?.rowData?.[0]?.values?.[0]?.userEnteredValue;
if(String(classCell?.stringValue??classCell?.numberValue??'')!==target.classId)throw Error('Chart header class ID mismatch');
if(!grid)throw Error('Missing bounded chart read');
const cells=Array.from({length:target.rowLimit},(_,i)=>Array.from({length:10},(_,j)=>{const v=grid.rowData?.[i]?.values?.[j]?.userEnteredValue;
return v?.formulaValue?{formulaValue:v.formulaValue}:v?.stringValue??v?.numberValue??v?.boolValue??'';}));`;
  const staffCells = `const staffCells={};if(target.staffUpdatesEnabled){
for(const [cell,row,column] of [['D5',4,3],['D6',5,3],['D7',6,3],['G6',5,6],['G7',6,6]]){
const block=sheet.data?.find(d=>d.startRow=== (column===3?4:5) && d.startColumn===column);
if(!block)throw Error('Missing staff header range');
const value=block.rowData?.[row-block.startRow]?.values?.[0]?.userEnteredValue;
staffCells[cell]=value?.formulaValue?{formulaValue:value.formulaValue}:value?.stringValue??value?.numberValue??value?.boolValue??'';}}`;
  const readUrl = `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Claim warehouse refresh').first().json.target.spreadsheetId }}?ranges={{ encodeURIComponent("'Seating Chart Main'!T1:AC"+$('Claim warehouse refresh').first().json.target.rowLimit) }}&ranges={{ encodeURIComponent("'Seating Chart Main'!R5") }}&ranges={{ encodeURIComponent("'Seating Chart Main'!D5:D7") }}&ranges={{ encodeURIComponent("'Seating Chart Main'!G6:G7") }}&includeGridData=true&fields=spreadsheetId,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),data(startRow,startColumn,rowData(values(userEnteredValue,dataValidation))))`;
  add('Manual STM reservation refresh', 'n8n-nodes-base.manualTrigger', {});
  code('Pilot run settings', `const targetId=${JSON.stringify(targetId)};
if(!/^[a-f0-9-]{36}$/.test(targetId||''))throw Error('Pilot deployment pending: register the approved warehouse target first');
return [{json:{targetId,runId:${JSON.stringify(runId)}||'stm-pilot-'+$execution.id}}];`);
  http('Load warehouse target', 'warehouse', 'GET', `=${supabaseUrl}/rest/v1/seating_chart_targets?id=eq.{{ $json.targetId }}&select=studio_id,config,enabled`);
  code('Validate STM pilot target', `${library}
const items=$input.all().map(i=>i.json); if(items.length!==1)throw Error('Exactly one pilot target required');
const record=items[0], target=record.config; validateTarget(target);
if(!record.enabled||record.studio_id!==target.studioId||target.googleAccountEmail!==${JSON.stringify(studio.googleAccountEmail)}||target.masterSpreadsheetId!==${JSON.stringify(studio.masterSpreadsheetId)}||!Number.isSafeInteger(target.accountId))throw Error('Warehouse source/account configuration mismatch');
return [{json:target}];`);
  http('Collect class reservations', 'collector', 'POST', `${collectorUrl}/pts/class-roster`,
    '={{ {accountId:$json.accountId,studioId:$json.studioId,classId:$json.classId} }}');
  code('Validate and identify source seats', `${identityLibrary}
const payload=$input.first().json,target=$('Validate STM pilot target').first().json;
if(payload.success!==true||payload.accountId!==target.accountId||payload.studioId!==target.studioId||payload.source?.classId!==target.classId||payload.source?.studioCode!==target.studioCode)throw Error('Wrong or incomplete source account/class');
const raw=payload.source;
if(raw.details?.locationLabel!==target.sourceLocationLabel||raw.details?.roomId!==target.sourceRoomId||!target.allowedClassTypeIds?.includes(raw.details?.classTypeId))throw Error('Source room/type/location configuration mismatch');
const rows=identifyReservations(raw);
return [{json:{classId:raw.classId,studioCode:raw.studioCode,isPrivate:false,complete:true,expectedRowCount:rows.length,retrievedAt:raw.retrievedAt,rows,
...(target.staffUpdatesEnabled?{assignedStaff:raw.details.assignedStaff}:{})}}];`);
  rpc('Claim warehouse refresh','claim_seating_chart_refresh', '={{ {p_target_id:$("Pilot run settings").first().json.targetId,p_run_id:$("Pilot run settings").first().json.runId,p_source:$json} }}');
  code('Require unfinished refresh', 'if($input.first().json.completed)return [];return $input.all();');
  http('Verify studio Google identity','google','GET','https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
  code('Require studio Google identity', `if($input.first().json.user?.emailAddress!==${JSON.stringify(studio.googleAccountEmail)})throw Error('Wrong Google account');return [{json:{verified:true}}];`);
  http('Read chart ownership','google','GET', `=https://www.googleapis.com/drive/v3/files/{{ $('Claim warehouse refresh').first().json.target.spreadsheetId }}?fields=id,mimeType,owners(emailAddress),capabilities(canEdit)`);
  code('Require studio-owned chart copy', `const target=$('Claim warehouse refresh').first().json.target,file=$input.first().json;
if(file.id!==target.spreadsheetId||file.id===target.masterSpreadsheetId||file.mimeType!=='application/vnd.google-apps.spreadsheet'||file.capabilities?.canEdit!==true||!file.owners?.some(o=>o.emailAddress===target.googleAccountEmail))throw Error('Chart ownership or edit permission mismatch');return [{json:{verified:true}}];`);
  http('Read chart before refresh','google','GET',readUrl);
  code('Prepare immutable reservation plan', `${library}\n${staffLibrary}\n${cells}\n${staffCells}
const plan=prepareRun(run,cells);
if(target.staffUpdatesEnabled){
const staff=planStaffRefresh({source:run.source.assignedStaff,sheetName:target.sheetName,cells:staffCells,ledger:run.staffLedger??{},pending:run.plan?.staff});
if(!run.plan){plan.staff=staff;plan.request.data.push(...staff.data);}
}
return [{json:{plan,before:cells}}];`);
  rpc('Stage warehouse plan','stage_seating_chart_refresh', '={{ {p_run_id:$("Pilot run settings").first().json.runId,p_plan:$("Prepare immutable reservation plan").first().json.plan} }}');
  add('Reservation changes exist','n8n-nodes-base.if',{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},combinator:'and',conditions:[{
    id:'reservation-write-needed',leftValue:'={{ $("Prepare immutable reservation plan").first().json.plan.request.data.length > 0 }}',rightValue:true,
    operator:{type:'boolean',operation:'true',singleValue:true}}]},options:{}},null,2.2);
  http('Write only reservation columns','google','POST',`=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Claim warehouse refresh').first().json.target.spreadsheetId }}/values:batchUpdate`,
    '={{ $("Prepare immutable reservation plan").first().json.plan.request }}');
  http('Read chart after refresh','google','GET',readUrl);
  code('Verify reservations and protected staff cells',`${library}\n${staffLibrary}\n${cells}\n${staffCells}
const prepared=$('Prepare immutable reservation plan').first().json;
const result=verifyReadback({target,before:prepared.before,after:cells,plan:prepared.plan});
if(target.staffUpdatesEnabled){Object.assign(result,verifyStaffReadback(prepared.plan.staff,staffCells));
result.reviewCount+=result.staffReviewCount;if(result.reviewCount)result.status='updated-needs-review';}
return [{json:result}];`);
  rpc('Complete verified warehouse refresh','complete_seating_chart_refresh','={{ {p_run_id:$("Pilot run settings").first().json.runId,p_result:$json} }}');
  nodes.forEach((node,i)=>{if(i+1<nodes.length)connections[node.name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]};});
  connections['Reservation changes exist']={main:[[{node:'Write only reservation columns',type:'main',index:0}],[{node:'Read chart after refresh',type:'main',index:0}]]};
  return {name:'02 - Seating Charts - STM reservation refresh - DEPLOYMENT PENDING',active:false,nodes,connections,
    settings:{executionOrder:'v1',timezone:studio.timeZone,saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false}};
}
if(require.main===module){
  const studio=JSON.parse(fs.readFileSync(path.join(__dirname,'studios.example.json'),'utf8')).studios.find(s=>s.studioCode==='STM');
  fs.writeFileSync(path.join(__dirname,'02-stm-reservation-refresh.json'),JSON.stringify(buildReservationWorkflow({studio,supabaseUrl:'https://hsosjnwjangtqtskofag.supabase.co',collectorUrl:'https://studio-intelligence-production.up.railway.app'}),null,2)+'\n');
}
module.exports={buildReservationWorkflow};
