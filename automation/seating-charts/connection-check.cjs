'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Read-only workflow. All Google identity and studio IDs come from config.
function buildConnectionCheck(studio, credential, credentialType = 'googleDriveOAuth2Api') {
  if (!['googleDriveOAuth2Api', 'googleSheetsOAuth2Api'].includes(credentialType)) {
    throw new Error('Unsupported existing Google credential type');
  }
  for (const key of ['googleAccountEmail', 'masterSpreadsheetId', 'destinationFolderId']) {
    if (!studio[key]) throw new Error(`Missing studio configuration: ${key}`);
  }
  if (!credential?.id || !credential?.name) throw new Error('Missing existing credential reference');
  const nodes = [];
  const add = (name, type, parameters, extra = {}) => {
    const index = nodes.length;
    nodes.push({ id: `seating-check-${index}`, name, type,
      typeVersion: type.endsWith('httpRequest') ? 4.2 : type.endsWith('code') ? 2 : 1,
      position: [index * 240, 0], parameters, ...extra });
  };
  const read = (name, url) => add(name, 'n8n-nodes-base.httpRequest', {
    method: 'GET', url, authentication: 'predefinedCredentialType',
    nodeCredentialType: credentialType, options: { timeout: 30000 },
  }, { credentials: { [credentialType]: credential }, retryOnFail: true, maxTries: 2, waitBetweenTries: 2000 });
  const code = (name, jsCode) => add(name, 'n8n-nodes-base.code', { jsCode });
  add('Manual connection check', 'n8n-nodes-base.manualTrigger', {});
  read('Read connected Google identity', 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
  code('Require studio account', `const expected=${JSON.stringify(studio.googleAccountEmail)};
const actual=String($input.first().json.user?.emailAddress||'').toLowerCase();
if(actual!==expected.toLowerCase())throw new Error('Google account mismatch: expected '+expected+'; connected '+(actual||'unknown'));
return [{json:{studioCode:${JSON.stringify(studio.studioCode)},accountVerified:true}}];`);
  const fields = encodeURIComponent('id,name,mimeType,parents,owners(emailAddress),capabilities(canCopy,canEdit)');
  read('Verify master access', `https://www.googleapis.com/drive/v3/files/${studio.masterSpreadsheetId}?fields=${fields}`);
  code('Require studio master', `const file=$input.first().json;
if(file.id!==${JSON.stringify(studio.masterSpreadsheetId)}||file.mimeType!=='application/vnd.google-apps.spreadsheet'||file.capabilities?.canCopy!==true)throw new Error('Master cannot be verified or copied');
if(!file.owners?.some(o=>o.emailAddress?.toLowerCase()===${JSON.stringify(studio.googleAccountEmail.toLowerCase())}))throw new Error('Master owner does not match the studio');
return [{json:{masterVerified:true}}];`);
  read('Verify destination folder', `https://www.googleapis.com/drive/v3/files/${studio.destinationFolderId}?fields=${fields}`);
  code('Require studio folder', `const folder=$input.first().json;
if(folder.id!==${JSON.stringify(studio.destinationFolderId)}||folder.mimeType!=='application/vnd.google-apps.folder'||folder.capabilities?.canEdit!==true)throw new Error('Destination folder is not writable');
if(!folder.owners?.some(o=>o.emailAddress?.toLowerCase()===${JSON.stringify(studio.googleAccountEmail.toLowerCase())}))throw new Error('Destination folder owner mismatch');
return [{json:{folderVerified:true}}];`);
  read('Verify Sheets API access', `https://sheets.googleapis.com/v4/spreadsheets/${studio.masterSpreadsheetId}?fields=spreadsheetId,properties(title,timeZone),sheets(properties(sheetId,title))`);
  code('Connection check result', `const sheet=$input.first().json;
if(sheet.spreadsheetId!==${JSON.stringify(studio.masterSpreadsheetId)}||sheet.properties?.timeZone!==${JSON.stringify(studio.timeZone)})throw new Error('Spreadsheet identity or timezone mismatch');
return [{json:{studioCode:${JSON.stringify(studio.studioCode)},status:'connection_verified',writesPerformed:0,scheduleEnabled:false,masterTitle:sheet.properties.title,sheetCount:sheet.sheets.length}}];`);
  const connections = {};
  for (let i = 0; i < nodes.length - 1; i++) {
    connections[nodes[i].name] = { main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]] };
  }
  return {
    name: `00 - Seating Charts - ${studio.studioCode} connection check`,
    active: false, nodes, connections,
    settings: { executionOrder: 'v1', timezone: studio.timeZone,
      saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none',
      saveManualExecutions: false },
  };
}

if (require.main === module) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'studios.example.json'), 'utf8'));
  const studio = config.studios.find(s => s.studioCode === process.argv[2]);
  if (!studio) throw new Error('Unknown studio');
  const workflow = buildConnectionCheck(studio, { id: process.argv[3], name: process.argv[4] }, process.argv[5]);
  fs.writeFileSync(path.join(__dirname, '00-stm-connection-check.json'), JSON.stringify(workflow, null, 2) + '\n');
}

module.exports = { buildConnectionCheck };
