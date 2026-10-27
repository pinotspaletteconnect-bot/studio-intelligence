'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sourceDate,parseGrid,parseModal,parseSubmissionAudit}=require('./privateParties.cjs');
const {collectPrivatePartyStudio}=require('./privateParties.cjs');

test('daily refresh reads fresh stages, retains older known leads and includes undated active inquiries', async()=>{
 const selectors='<select name="LocationSelect"><option value="198" selected>Gilbert</option></select>'+
 '<select name="LeadStatusTypeSelect"><option value="1">Inquiry</option></select>'+
 '<select name="LeadDispositionTypeSelect"><option value="1">Active</option></select>';
 let modalReads=0;
 const session={login:async()=>{},request:async(resource)=>({
  json:async()=>resource.startsWith('/Lead/GetIndexGridData')?{records:0,rows:[]}:[],
  text:async()=>{
   if(resource==='/Lead')return selectors;
   if(resource==='/Lead/Management')return selectors+'<a leadid="42"></a><a leadid="43"></a>';
   if(resource.startsWith('/Lead/ManagementModal')){
    modalReads++;const id=Number(new URL(resource,'https://source.test').searchParams.get('leadId'));
    return '<table><tr><td>Location</td><td>Gilbert</td><td>Stage</td><td>'+ (id===42?'Dispositioned':'Inquiry')+'</td></tr></table>'+
     '<input id="lead-identity" value="'+id+'"><select name="LeadDispositionId"><option selected value="1">'+(id===42?'Lost':'Active')+'</option></select>';
   }
   return '';
  },
 })};
 const result=await collectPrivatePartyStudio({credentials:{},target:{studio_id:3,pts_location_id:198},
  knownLeads:[{source_lead_id:42,received_date:'2023-01-01',received_date_basis:'legacy_report'}],sessionFactory:()=>session});
 assert.equal(modalReads,2);
 assert.equal(result.rows.find(r=>r.source_lead_id===42).source_stage,'Dispositioned');
 assert.equal(result.rows.find(r=>r.source_lead_id===43).received_date,null);
 assert.equal(result.rows.length,2);
});
test('original source dates are calendar dates and invalid dates fail',()=>{
  assert.equal(sourceDate('2/3/2014 5:00:00 PM'),'2014-02-03');
  assert.equal(sourceDate(''),null);
  assert.throws(()=>sourceDate('2/30/2026'));
});
test('original-date evidence requires an explicit structured submission, not a generic contact note',()=>{
 const table='<table><thead><tr><th>Date</th><th>Type</th><th>Comments</th></tr></thead><tbody>'+
 '<tr><td>1/2/2024 1:00 PM</td><td>Internal</td><td>We discussed the website today.</td></tr>'+
 '<tr><td>1/1/2024 5:25 PM</td><td>Internal</td><td>Website-Ask-A-Question: Topic: Pricing</td></tr></tbody></table>';
 assert.deepEqual(parseSubmissionAudit(table),{dates:['2024-01-01'],rowCount:2});
});
test('source rows discard all contact information while retaining original date and disposition',()=>{
  const result=parseGrid({records:1,rows:[{id:42,cell:['1/2/2015','3/4/2015','Private Name','Customer','555-1234','private@example.test','Inquiry','Not Responding','Unknown']}]});
  assert.deepEqual(result,[{source_lead_id:42,received_date:'2015-01-02',source_status:'Inquiry',source_disposition:'Not Responding'}]);
  assert.ok(!JSON.stringify(result).includes('private@example.test'));
});
test('source detail rejects another studio and discards default event dates without an associated class',()=>{
  const html='<table><tr><td>Location</td><td>One</td></tr><tr><td>Stage</td><td>None</td></tr></table><input id="lead-identity" value="42"><input name="ClassId" value="0"><input name="ClassDate" value="10/26/2026"><input name="RequestedDate" value="10/26/2026">';
  assert.throws(()=>parseModal(html,42,'Two'));
  assert.throws(()=>parseModal(html,99,'One'));
  const row=parseModal(html,42,'One');
  assert.equal(row.event_date,null); assert.equal(row.requested_date,null);
});
