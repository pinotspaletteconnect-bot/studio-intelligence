'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildConnectionCheck } = require('./connection-check.cjs');
const studio = {
  studioCode: 'TEST', googleAccountEmail: 'studio@example.invalid',
  masterSpreadsheetId: 'synthetic-master', destinationFolderId: 'synthetic-folder',
  timeZone: 'America/New_York',
};
const credential = { id: 'synthetic-credential', name: 'Synthetic credential' };
const runCode = (workflow, name, input) => new Function('$input',
  workflow.nodes.find(n => n.name === name).parameters.jsCode)({ first: () => ({ json: input }) });

test('connection checks have a manual trigger and GET-only Google calls, never a schedule or write', () => {
  const workflow = buildConnectionCheck(studio, credential);
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes.length, 9);
  assert.equal(workflow.nodes.filter(n => n.type.endsWith('manualTrigger')).length, 1);
  assert.equal(workflow.nodes.some(n => /schedule|webhook/i.test(n.type)), false);
  for (const node of workflow.nodes.filter(n => n.type.endsWith('httpRequest'))) {
    assert.equal(node.parameters.method, 'GET');
    assert.match(node.parameters.url, /^https:\/\/(www.googleapis.com|sheets.googleapis.com)\//);
  }
});

test('account guard stops a different Google account before file checks', () => {
  const workflow = buildConnectionCheck(studio, credential);
  assert.throws(() => runCode(workflow, 'Require studio account', {
    user: { emailAddress: 'other@example.invalid' },
  }), /account mismatch/);
  assert.equal(runCode(workflow, 'Require studio account', {
    user: { emailAddress: studio.googleAccountEmail },
  })[0].json.accountVerified, true);
});

test('master and folder ownership must match the configured studio', () => {
  const workflow = buildConnectionCheck(studio, credential);
  assert.throws(() => runCode(workflow, 'Require studio master', {
    id: studio.masterSpreadsheetId, mimeType: 'application/vnd.google-apps.spreadsheet',
    capabilities: { canCopy: true }, owners: [{ emailAddress: 'other@example.invalid' }],
  }), /owner/);
  assert.throws(() => runCode(workflow, 'Require studio folder', {
    id: studio.destinationFolderId, mimeType: 'application/vnd.google-apps.folder',
    capabilities: { canEdit: false }, owners: [{ emailAddress: studio.googleAccountEmail }],
  }), /not writable/);
});

test('an existing Sheets credential can be checked without creating or changing credentials', () => {
  const workflow = buildConnectionCheck(studio, credential, 'googleSheetsOAuth2Api');
  const calls = workflow.nodes.filter(n => n.type.endsWith('httpRequest'));
  assert.ok(calls.every(n => n.parameters.nodeCredentialType === 'googleSheetsOAuth2Api'));
  assert.ok(calls.every(n => n.credentials.googleSheetsOAuth2Api.id === credential.id));
  assert.throws(() => buildConnectionCheck(studio, credential, 'unknown'), /Unsupported/);
});
