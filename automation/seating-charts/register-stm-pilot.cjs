'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const configPath = path.join(__dirname, 'stm-pilot-target.json');
const studio = JSON.parse(fs.readFileSync(path.join(__dirname, 'studios.example.json'), 'utf8')).studios.find(s => s.studioCode === 'STM');
const target = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {
  id: randomUUID(), studioId: 1, accountId: 1, studioCode: 'STM', isPrivate: false,
  classId: '931955', spreadsheetId: '1h0X3zNWCxkG3p7x71LPeFBE-FbC5dLLVj0swto8KwiQ',
  masterSpreadsheetId: studio.masterSpreadsheetId, googleAccountEmail: studio.googleAccountEmail,
  sheetId: 0, sheetName: 'Seating Chart Main', rowLimit: 1000, allowPilotAdoption: true,
  sourceLocationLabel: studio.sourceLocationLabel, sourceRoomId: studio.sourceRoomId,
  allowedClassTypeIds: studio.allowedClassTypeIds,
};
fs.writeFileSync(configPath, JSON.stringify(target, null, 2) + '\n');
const { id, ...config } = target;
const sql = `begin;
insert into public.seating_chart_targets(id,studio_id,config,enabled)
values ('${id}'::uuid,1,'${JSON.stringify(config).replace(/'/g, "''")}'::jsonb,true)
on conflict(id) do nothing;
select id,studio_id,enabled,revision,jsonb_array_length(ledger) as ledger_count,
  config->>'classId' as class_id, config->>'spreadsheetId' as spreadsheet_id
from public.seating_chart_targets where id='${id}'::uuid;
commit;
`;
fs.writeFileSync(path.join(__dirname, 'database-register-pilot.sql'), sql);
const { buildReservationWorkflow } = require('./reservation-workflow.cjs');
const workflow = buildReservationWorkflow({ studio, supabaseUrl: 'https://hsosjnwjangtqtskofag.supabase.co',
  collectorUrl: 'https://studio-intelligence-production.up.railway.app', targetId: id });
workflow.name = '02 - Seating Charts - STM reservation refresh - MANUAL PILOT';
fs.writeFileSync(path.join(__dirname, '02-stm-reservation-refresh.json'), JSON.stringify(workflow, null, 2) + '\n');
