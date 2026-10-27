'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {minimumHeadcount,sourceDate,parseGrid,parseModal,parseSubmissionAudit}=require('./privateParties.cjs');
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


test('attendance estimates use exact counts and conservative range/open-ended minimums',()=>{
 for(const [input,expected] of [['10',10],['10-15',10],[' 10 – 15 ',10],['15—20',15],['8+',8],['8 +',8],['1,000-1,500',1000],['0',0]]) assert.equal(minimumHeadcount(input),expected,input);
 for(const input of ['',null,'15-10','-8','8.5','about 10','10 or 15','10-','8++','1,00','8+ guests','9007199254740992']) assert.equal(minimumHeadcount(input),null,String(input));
});

test('all five verified quote patterns contribute minimum guest value and retain invalid-field warnings',()=>{
 const fixture=(count,price)=>'<table><tr><td>Location</td><td>One</td><td>Stage</td><td>Manage Party</td></tr></table><input name="PrivatePartyExpectedHeadcount" value="'+count+'"><input name="PricePerPainter" value="'+price+'">';
 const rows=[['10-15',30],['10',30],['10-15',30],['8+',39],['15-20',39]].map(([count,price])=>parseModal(fixture(count,price),42,'One'));
 assert.equal(rows.reduce((sum,row)=>sum+row.expected_headcount*row.quoted_price,0),1797);
 assert.ok(rows.every(row=>row.value_parse_warnings.length===0));
 const invalid=parseModal(fixture('15-10','30'),42,'One');
 assert.equal(invalid.expected_headcount,null);
 assert.deepEqual(invalid.value_parse_warnings,['PrivatePartyExpectedHeadcount']);
});
