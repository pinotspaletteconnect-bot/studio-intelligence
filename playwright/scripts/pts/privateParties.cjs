'use strict';
const { PtsHttpSession } = require('../../services/ptsHttpSession.cjs');

const decode = text => String(text ?? '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const plain = html => decode(String(html ?? '').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
}
function sourceDate(value) {
  if (!value?.trim()) return null;
  const m = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  if (!m) throw Error('Unrecognized source date');
  const date = `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  if (new Date(date).toISOString().slice(0,10)!==date) throw Error('Invalid source calendar date');
  return date;
}
function numeric(value) {
  if (!value?.trim()) return null;
  const result = Number(String(value).replace(/[$,]/g,''));
  if (!Number.isFinite(result) || result<0) return null;
  return result;
}
/** Conservative attendance: an exact count, range minimum, or open-ended minimum. */
function minimumHeadcount(value) {
  const text = String(value ?? '').trim().replace(/[\u2013\u2014]/g, '-');
  const count = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)';
  const exact = text.match(new RegExp(`^(${count})\\s*\\+?$`));
  const range = text.match(new RegExp(`^(${count})\\s*-\\s*(${count})$`));
  if (!exact && !range) return null;
  const minimum = Number((exact ?? range)[1].replace(/,/g, ''));
  const maximum = range ? Number(range[2].replace(/,/g, '')) : minimum;
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) return null;
  return minimum;
}

function parseOptions(html, name) {
  const select = [...html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)].find(m=>attributes(m[0]).name===name);
  if (!select) throw Error(`Missing source selector ${name}`);
  return [...select[0].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(m=>({value:attributes(m[1]).value??'',label:plain(m[2])}));
}
function parseGrid(grid) {
  if (!Number.isSafeInteger(Number(grid.records)) || !Array.isArray(grid.rows)) throw Error('Invalid source lead page');
  return grid.rows.map(row=>{
    if (!Number.isSafeInteger(Number(row.id)) || Number(row.id)<=0 || !Array.isArray(row.cell) || row.cell.length<9) throw Error('Invalid source lead row');
    const received_date=sourceDate(plain(row.cell[0]));
    if (!received_date) throw Error('Original inquiry date missing');
    // Deliberately omit lead name, customer, phone, email and contact-history text.
    return { source_lead_id:Number(row.id), received_date, source_status:plain(row.cell[6]), source_disposition:plain(row.cell[7]) };
  });
}
function parseModal(html, leadId, expectedLocation) {
  const firstTable=html.match(/<table\b[\s\S]*?<\/table>/i)?.[0];
  const cells=[...(firstTable??'').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>plain(m[1]));
  if(cells[0]!=='Location'||cells[1]!==expectedLocation||cells[2]!=='Stage'||!cells[3])throw Error('Lead source location or stage mismatch');
  const inputs=[...html.matchAll(/<input\b[^>]*>/gi)].map(m=>attributes(m[0]));
  const identity=inputs.find(a=>a.id==='lead-identity');
  if(identity && Number(identity.value)!==leadId)throw Error('Lead detail identity mismatch');
  const get=name=>inputs.find(a=>a.name===name||a.id===name)?.value??'';
  const selected=name=>{
    const tag=[...html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)].find(m=>attributes(m[0]).name===name||attributes(m[0]).id===name)?.[0];
    const options=[...(tag??'').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)];
    return options.find(m=>/\bselected\b/i.test(m[1]))?.[1];
  };
  const dispositionSelect=[...html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)].find(m=>attributes(m[0]).name==='LeadDispositionId')?.[0];
  const dispositionOption=[...(dispositionSelect??'').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].find(m=>/\bselected\b/i.test(m[1]));
  const mobile=selected('IsMobileParty');
  const closed=[...html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)].find(m=>attributes(m[0]).name==='IsClosed')?.[0];
  const classId=get('ClassId') && get('ClassId')!=='0' ? get('ClassId') : null;
  return {
    source_stage:cells[3], source_disposition:dispositionOption?plain(dispositionOption[2]):null, source_class_id:classId,
    requested_date:classId?sourceDate(get('RequestedDate')):null, event_date:classId?sourceDate(get('ClassDate')):null,
    expected_headcount:minimumHeadcount(get('PrivatePartyExpectedHeadcount')), quoted_price:numeric(get('PricePerPainter')),
    requested_deposit:numeric(get('DepositAmount')), is_mobile:mobile==null?null:['1','true','True'].includes(attributes(mobile).value),
    source_closed:closed ? /<option[^>]*selected[^>]*value="(?:true|1)"|<option[^>]*value="(?:true|1)"[^>]*selected/i.test(closed) : null,
    value_parse_warnings:['PrivatePartyExpectedHeadcount','PricePerPainter','DepositAmount'].filter(name=>get(name).trim() && (name==='PrivatePartyExpectedHeadcount'?minimumHeadcount(get(name)):numeric(get(name)))===null),
  };
}

function parseSubmissionAudit(html) {
  const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
  const table=tables.find(t=>/<th\b[^>]*>\s*Comments\s*<\/th>/i.test(t));
  const rows=[...(table??'').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>plain(c[1]))).filter(c=>c.length===3);
  const dates=rows.filter(c=>c[1]==='Internal'&&/(?:^Website-Ask-A-Question:|\bDate Request Referral Page:)/i.test(c[2])).map(c=>sourceDate(c[0])).filter(Boolean).sort();
  return {dates,rowCount:rows.length};
}

async function readSubmissionDate(session,leadId,locationId,modal) {
  const initial=parseSubmissionAudit(modal);
  if(initial.rowCount<10)return initial.dates[0]??null;
  const dates=[];
  let html=await(await session.request('/Lead/GetSection?sectionName='+encodeURIComponent(`${leadId}|changeRecordPerPage|100`)+'&selectedLocationId='+encodeURIComponent(locationId))).text();
  for(let page=1;page<=50;page++){
    const result=parseSubmissionAudit(html); dates.push(...result.dates);
    if(result.rowCount<100)return dates.sort()[0]??null;
    html=await(await session.request('/Lead/GetSection?sectionName='+encodeURIComponent(`${leadId}|changePage|${page+1}`)+'&selectedLocationId='+encodeURIComponent(locationId))).text();
  }
  throw Error('Source contact audit pagination exceeded safe limit');
}

async function collectPrivatePartyStudio({ credentials, target, onList, onLead, existing = new Map(), knownLeads = [], concurrency = 4, fromDate = '2024-01-01', sessionFactory = value => new PtsHttpSession(value) }) {
  const known = new Map(knownLeads.map(row => [Number(row.source_lead_id), row]));
  const session=sessionFactory(credentials);
  await session.login();
  const index=await (await session.request('/Lead')).text();
  const locations=parseOptions(index,'LocationSelect');
  const location=locations.find(x=>x.value===String(target.pts_location_id));
  if(!location)throw Error('Configured studio is not accessible to source account');
  const statuses=parseOptions(index,'LeadStatusTypeSelect').filter(x=>x.value);
  const dispositions=parseOptions(index,'LeadDispositionTypeSelect').filter(x=>x.value);
  const leads=new Map(); const slices=[];
  for(const status of statuses) for(const disposition of dispositions) {
    let expected=null; const sliceIds=new Set();
    for(let page=1;;page++) {
      const query=new URLSearchParams({search:'1',LocationSelect:location.value,LeadStatusTypeSelect:status.value,LeadDispositionTypeSelect:disposition.value,Search:'',rows:'500',page:String(page),sidx:'CreatedDate',sord:'asc'});
      const grid=await (await session.request('/Lead/GetIndexGridData?'+query)).json();
      if(expected===null)expected=Number(grid.records);
      if(expected!==Number(grid.records))throw Error('Source lead count changed during pagination; retry this studio');
      const rows=parseGrid(grid);
      for(const row of rows){
        if(row.source_status!==status.label||row.source_disposition!==disposition.label)throw Error('Source lead filters were not honored');
        if(sliceIds.has(row.source_lead_id)||leads.has(row.source_lead_id))throw Error('Duplicate lead across source pages/slices');
        sliceIds.add(row.source_lead_id);leads.set(row.source_lead_id,row);
      }
      if(sliceIds.size===expected)break;
      if(!rows.length||page>=1000||sliceIds.size>expected)throw Error('Source lead pagination incomplete');
    }
    slices.push({status:status.label,disposition:disposition.label,count:expected});
  }
  // The legacy grid excludes newer Party Planner records. Union its IDs with
  // the live lifecycle and calendar's explicit lead links, including reviewed parties.
  const initialManagement=await(await session.request('/Lead/Management')).text();
  const originalLocation=[...initialManagement.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)].find(m=>attributes(m[0]).name==='LocationSelect')?.[0];
  const previousLocation=[...(originalLocation??'').matchAll(/<option\b([^>]*)>/gi)].find(m=>/\bselected\b/i.test(m[1]))?.[1];
  const previousId=previousLocation?attributes(previousLocation).value:null;
  await session.request('/Lead/ManageLocation',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({locationSelected:location.value})});
  const management=await(await session.request('/Lead/Management')).text();
  const plannerIds=new Set([...management.matchAll(/\bleadid\s*=\s*["'](\d+)["']/gi)].map(m=>Number(m[1])).filter(n=>n>0));
  if(previousId&&previousId!==location.value)await session.request('/Lead/ManageLocation',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({locationSelected:previousId})});
  const horizon=new Date();horizon.setUTCFullYear(horizon.getUTCFullYear()+2);
  let month=fromDate.slice(0,7)+'-01';
  while(month<=horizon.toISOString().slice(0,10)){
    const next=new Date(month+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
    const end=next.toISOString().slice(0,10);
    const query=new URLSearchParams({locationId:location.value,calendar:'',start:String(Date.parse(month+'T00:00:00Z')/1000),end:String(next.valueOf()/1000)});
    const events=await(await session.request('/Class/GetCalendarData?'+query)).json();
    if(!Array.isArray(events))throw Error('Invalid source calendar response');
    for(const event of events)for(const match of String(event.eventhtml??'').matchAll(/href\s*=\s*["']\/Lead\/Edit\/(\d+)["']/gi))plannerIds.add(Number(match[1]));
    month=end;
  }
  for(const id of plannerIds)if(!leads.has(id))leads.set(id,{source_lead_id:id,received_date:null,source_status:'Party Planner',source_disposition:null});
  for (const [id, row] of known) if (!leads.has(id)) leads.set(id, {
    source_lead_id: id, received_date: row.received_date, source_status: 'Party Planner', source_disposition: null,
  });
  const list=[...leads.values()].filter(row=>!row.received_date||row.received_date>=fromDate||row.source_disposition==='Active'||known.has(row.source_lead_id)).sort((a,b)=>a.source_lead_id-b.source_lead_id);
  await onList?.({target,count:list.length,historyFrom:fromDate,listedAllSourceCount:leads.size,plannerCount:plannerIds.size,slices,leads:list});
  let cursor=0,completed=0;
  const rows=[];
  let failure = null;
  const workers = await Promise.allSettled(Array.from({length:Math.min(concurrency,list.length)},async()=>{
    while(cursor<list.length){
      if (failure) return;
      const source=list[cursor++];
      let row=existing.get(source.source_lead_id);
      if(row?.received_date===null)row=null;
      if(row && source.received_date && row.received_date!==source.received_date)row=null;
      if(!row){
        const modal=await (await session.request('/Lead/ManagementModal?leadId='+source.source_lead_id)).text();
        const details=parseModal(modal,source.source_lead_id,location.label);
        const prior = known.get(source.source_lead_id);
        const received=source.received_date??prior?.received_date??await readSubmissionDate(session,source.source_lead_id,location.value,modal);
        row={studio_id:Number(target.studio_id),...source,...details,source_disposition:details.source_disposition??source.source_disposition??'Unknown',received_date:received,received_date_basis:source.received_date?(prior?.received_date_basis??'legacy_report'):prior?.received_date?prior.received_date_basis:received?'website_submission_audit':'unavailable',retrieved_at:new Date().toISOString()};
        await onLead?.(row,++completed,list.length);
      } else { completed++; if(!row.source_class_id){row={...row,event_date:null,requested_date:null};} }
      if(!row.received_date||row.received_date>=fromDate||known.has(row.source_lead_id)||row.source_disposition==='Active'&&['Inquiry','Date Requested','Date Approved','Manage Party'].includes(row.source_stage))rows.push(row);
    }
  }).map(task => task.catch(error => { failure = error; throw error; })));
  if (workers.some(result => result.status === 'rejected')) throw failure;
  if (knownLeads.some(row => !rows.some(result => result.source_lead_id === Number(row.source_lead_id)))) throw Error('Known lead coverage incomplete');
  return {target,sourceCount:rows.length,enumeratedCount:list.length,plannerCount:plannerIds.size,unknownDateCount:rows.filter(row=>!row.received_date).length,historyFrom:fromDate,slices,rows};
}
module.exports={minimumHeadcount,attributes,sourceDate,numeric,parseOptions,parseGrid,parseModal,parseSubmissionAudit,collectPrivatePartyStudio};
