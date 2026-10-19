'use strict';
const {groupOverlappingEvents}=require('./planner.cjs');
const {planStaffRefresh}=require('./staff-writes.cjs');
const {buildPrivatePartyWrites,FIELD_CELLS}=require('./private-party-writes.cjs');
const DAY=86400000;
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function parseDay(value){const m=/^(?:[A-Za-z]{3}, )?(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(value??'');if(!m||!months.includes(m[2]))throw Error('Unverified class date');const iso=`${m[3]}-${String(months.indexOf(m[2])+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;if(new Date(iso).toISOString().slice(0,10)!==iso)throw Error('Invalid class date');return iso;}
function localInstant(date,time,zone){
 const t=/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time??'');if(!t||+t[1]<1||+t[1]>12||+t[2]>59)throw Error('Unverified class time');
 const wanted=[...date.split('-').map(Number),(+t[1]%12)+(t[3].toUpperCase()==='PM'?12:0),+t[2]];
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const parts=ms=>{const p=fmt.formatToParts(new Date(ms));return ['year','month','day','hour','minute'].map(n=>+p.find(x=>x.type===n).value);};
 const utc=Date.UTC(wanted[0],wanted[1]-1,wanted[2],wanted[3],wanted[4]);let candidate=utc;
 for(let i=0;i<3;i++){const p=parts(candidate);candidate+=utc-Date.UTC(p[0],p[1]-1,p[2],p[3],p[4]);}
 const same=ms=>JSON.stringify(parts(ms))===JSON.stringify(wanted);
 if(!same(candidate)||same(candidate-DAY/24)||same(candidate+DAY/24))throw Error('Missing or ambiguous DST class time');
 return new Date(candidate).toISOString();
}
function normalizeDiscovery(payload,studio,{now=new Date().toISOString()}={}){
 if(payload.success!==true||payload.accountId!==studio.accountId||payload.studioId!==studio.studioId||payload.source?.complete!==true||payload.source.studioCode!==studio.studioCode||!Array.isArray(payload.source.events))throw Error('Incomplete studio event discovery');
 const raw=payload.source;const stamp=Date.parse(raw.retrievedAt),at=Date.parse(now);
 if(!Number.isFinite(stamp)||stamp<at-600000||stamp>at+60000)throw Error('Stale event source');
 const seen=new Set(),events=[],review=[];
 for(const item of raw.events){
  if(!/^\d+$/.test(item.classId)||seen.has(item.classId)||item.locationLabel!==studio.sourceLocationLabel)throw Error('Wrong or duplicate class source');seen.add(item.classId);
  const date=parseDay(item.dateText);if(date!==item.calendarDate)throw Error('Calendar/detail date mismatch');
  const room=studio.creation.rooms[item.roomId];
  const type=studio.creation.classTypes[item.classTypeId];
  if(!room||!type||type.label!==item.classTypeLabel){review.push({classId:item.classId,reason:'unsupported-room-or-event-type'});continue;}
  // Unpublished public drafts and requested/inquiry party placeholders are not
  // operational events. A real assigned painting and both times are required.
  if(item.isPublished!==true){review.push({classId:item.classId,reason:'not-published'});continue;}
  if(type.isPrivate&&item.calendarPartyStage==='200200'){review.push({classId:item.classId,reason:'party-date-only-requested'});continue;}
  const assignedPainting=item.title?.split(' - ').slice(2).join(' - ').trim();
  const painting=assignedPainting&&!/^coming soon$/i.test(assignedPainting)?assignedPainting:(type.isPrivate?item.privateParty?.eventName:null);
  if(!painting||!type.isPrivate&&!item.paintingSummary){review.push({classId:item.classId,reason:'painting-not-assigned'});continue;}
  const startAt=localInstant(date,item.startTimeText,studio.timeZone);let endAt=localInstant(date,item.endTimeText,studio.timeZone);
  if(Date.parse(endAt)<=Date.parse(startAt))endAt=localInstant(new Date(Date.parse(date)+DAY).toISOString().slice(0,10),item.endTimeText,studio.timeZone);
  if(Date.parse(endAt)-Date.parse(startAt)>12*3600000)throw Error('Long event needs review');
  const event={organizationId:String(studio.organizationId),studioId:String(studio.studioId),classId:item.classId,timeZone:studio.timeZone,painting,roomLabel:room.label,sourceRoomId:item.roomId,classTypeId:item.classTypeId,isPrivate:type.isPrivate,startAt,endAt,details:item};
  events.push(event);
 }
 let groups=groupOverlappingEvents(events).filter(g=>Date.parse(g.endAt)>at&&Date.parse(g.startAt)<=at+7*DAY);
 // A source gap must not silently split an overlap group. Unknown events inside
 // this bounded window hold creation until their eligibility can be reviewed.
 groups=groups.filter(group=>{const blocked=review.filter(r=>r.reason==='unsupported-room-or-event-type').some(r=>{
  const item=raw.events.find(e=>e.classId===r.classId);try{const start=localInstant(parseDay(item.dateText),item.startTimeText,studio.timeZone),end=localInstant(parseDay(item.dateText),item.endTimeText,studio.timeZone);return Date.parse(start)<Date.parse(group.endAt)&&Date.parse(end)>Date.parse(group.startAt);}catch{return item.calendarDate===new Intl.DateTimeFormat('en-CA',{timeZone:studio.timeZone}).format(new Date(group.startAt));}
 });if(blocked)review.push(...group.events.map(e=>({classId:e.classId,reason:'overlaps-unsupported-event'})));return !blocked;});
 for(const group of groups){
  if(group.events.length>8)throw Error('Large overlap group needs review');
  const lastDate=new Intl.DateTimeFormat('en-CA',{timeZone:studio.timeZone}).format(new Date(group.endAt));
  if(lastDate>=raw.toDate||group.events.some(e=>e.startAt.slice(0,10)<raw.fromDate))throw Error('Overlap group touches discovery boundary');
  group.groupKey=`stm-v1-${group.events.map(e=>e.classId).sort().join('-')}`;
  group.sourceRetrievedAt=raw.retrievedAt;
 }
 return {groups,review};
}
function tabName(event){const time=new Intl.DateTimeFormat('en-US',{timeZone:event.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(event.startAt)).replace(':','.');return `${event.isPrivate?'PP ':''}${event.roomLabel} ${time} - ${event.classId}`;}
function creationPlan(group,studio){
 const sheets=new Set(),names=new Set();
 const tabs=group.events.map(event=>{
  const templateSheetId=event.isPrivate?studio.privatePartyFormMapping.sheetId:studio.creation.rooms[event.sourceRoomId]?.templateSheetId;
  const sheetId=100000000+Number(event.classId),sheetName=tabName(event);
  if(!Number.isSafeInteger(templateSheetId)||!Number.isSafeInteger(sheetId)||sheetId>=2147483647||sheets.has(sheetId)||names.has(sheetName)||sheetName.length>100||/[\[\]*?:/\\]/.test(sheetName))throw Error('Invalid event tab mapping');
  sheets.add(sheetId);names.add(sheetName);
  return {classId:event.classId,isPrivate:event.isPrivate,sheetId,sheetName,templateSheetId,sourceRoomId:event.sourceRoomId,classTypeId:event.classTypeId,startAt:event.startAt,endAt:event.endAt};
 });
 return {version:1,groupKey:group.groupKey,title:group.title,tabs,
  structure:{requests:[...tabs.map(t=>({duplicateSheet:{sourceSheetId:t.templateSheetId,newSheetId:t.sheetId,newSheetName:t.sheetName}})),
   ...[...new Set([0,1955136908,studio.privatePartyFormMapping.sheetId])].map(sheetId=>({updateSheetProperties:{properties:{sheetId,hidden:true},fields:'hidden'}}))]},
 };
}
function cellValue(v){return v?.formulaValue?{formulaValue:v.formulaValue}:v?.stringValue??v?.numberValue??v?.boolValue??'';}
function cellsFrom(document,sheetId,range){const sheet=document.sheets?.find(s=>s.properties.sheetId===sheetId);if(!sheet)throw Error('Missing mapped tab');const b=sheet.data?.find(d=>(d.startRow??0)===range.row&&(d.startColumn??0)===range.column);if(!b)throw Error('Missing bounded cell read');return Array.from({length:range.rows},(_,i)=>Array.from({length:range.columns},(_,j)=>b.rowData?.[i]?.values?.[j]??{}));}
function headerValue(document,sheetId,cell){const m=/^([A-Z]+)(\d+)$/.exec(cell);let col=0;for(const ch of m[1])col=col*26+ch.charCodeAt(0)-64;const grid=cellsFrom(document,sheetId,{row:0,column:0,rows:32,columns:29});return cellValue(grid[+m[2]-1][col-1].userEnteredValue);}
function buildInitialValues({group,plan,studio,document,now}){
 const data=[],expected={},staffLedgers={},review=[];
 const add=(tab,cell,value)=>{data.push({range:`'${tab.sheetName.replace(/'/g,"''")}'!${cell}`,values:[[value]]});expected[`${tab.sheetId}:${cell}`]=value;};
 const displayDate=at=>new Intl.DateTimeFormat('en-US',{timeZone:studio.timeZone,month:'numeric',day:'numeric',year:'numeric'}).format(new Date(at));
 for(const tab of plan.tabs){
  const event=group.events.find(e=>e.classId===tab.classId);
  const sheet=document.sheets?.find(s=>s.properties.sheetId===tab.sheetId);
  if(sheet?.properties.title!==tab.sheetName)throw Error('Tab ID/name mismatch');
  if(!event.isPrivate){
   const grid=cellsFrom(document,tab.sheetId,{row:0,column:19,rows:1000,columns:10});
   if(grid.some(r=>[r[0],...r.slice(2)].some(c=>cellValue(c.userEnteredValue)!=='')))throw Error('Copied master has seating, attendance or reservation inputs; review required');
   const clock=at=>new Intl.DateTimeFormat('en-US',{timeZone:studio.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(at));
   for(const [cell,value] of Object.entries({A3:displayDate(event.startAt),D3:`${new Intl.DateTimeFormat('en-US',{timeZone:studio.timeZone,weekday:'long'}).format(new Date(event.startAt))}, ${clock(event.startAt)}-${clock(event.endAt)}`,J3:event.painting,P3:`Public/${event.roomLabel}`,R5:event.classId,C6:displayDate(now),C7:'Automatic'}))add(tab,cell,value);
   const current=Object.fromEntries(['D5','D6','D7','G6','G7'].map(c=>[c,headerValue(document,tab.sheetId,c)]));
   const staff=planStaffRefresh({source:event.details.assignedStaff,sheetName:tab.sheetName,cells:current,ledger:{}});
   data.push(...staff.data);staffLedgers[tab.classId]=staff.lastWritten;review.push(...staff.review);
   for(const [cell,value]of Object.entries(staff.expected))expected[`${tab.sheetId}:${cell}`]=value;
  }else{
   const p=event.details.privateParty;if(!p)throw Error('Missing private party facts');
   const sourceFields={dateAndTime:{verified:true,value:`${displayDate(event.startAt)} ${event.details.startTimeText}-${event.details.endTimeText}`},
    hostNameAndPhone:{verified:!!p.hostName&&!!p.hostPhone,value:[p.hostName,p.hostPhone].filter(Boolean).join(' - ')},paintingSummary:{verified:true,value:event.details.paintingSummary},eventName:{verified:!!p.eventName,value:p.eventName},pricePerSeat:{verified:/^\d+(\.\d{1,2})?$/.test(p.pricePerSeat??''),value:p.pricePerSeat},paymentArrangement:{verified:!!p.paymentArrangement,value:p.paymentArrangement},expectedHeadcount:{verified:!!p.expectedHeadcount,value:p.expectedHeadcount}};
   const current=Object.fromEntries(Object.values(FIELD_CELLS).map(c=>[c,headerValue(document,tab.sheetId,c)||null]));
   const party=buildPrivatePartyWrites({isPrivate:true,sheetName:tab.sheetName,sourceFields,currentCells:current});
   data.push(...party.request.data);for(const [cell,value]of Object.entries(party.writtenCells))expected[`${tab.sheetId}:${cell}`]=value;
   review.push(...party.needsReview.map(r=>({classId:event.classId,...r})));
   // Only known sample placeholders on the brand-new form are cleared.
   for(const [cell,value]of Object.entries({G2:displayDate(now),H2:'Automatic',C7:'',C19:''}))add(tab,cell,value);
  }
 }
 return {request:{valueInputOption:'RAW',data},expected,staffLedgers,review};
}
function verifyInitialValues({before,after,plan,values}){
 for(const [key,wanted]of Object.entries(values.expected)){const [id,cell]=key.split(':');if(JSON.stringify(headerValue(after,+id,cell))!==JSON.stringify(wanted))throw Error('Creation header readback mismatch');}
 for(const tab of plan.tabs.filter(t=>!t.isPrivate)){
  const a=cellsFrom(before,tab.sheetId,{row:0,column:19,rows:1000,columns:10}),b=cellsFrom(after,tab.sheetId,{row:0,column:19,rows:1000,columns:10});
  // Header initialization must leave the entire import and protected area intact.
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Creation changed reservation/seating/attendance/formula cells');
 }
 return {verified:true,protectedCellsUnchanged:true,reviewCount:values.review.length};
}
module.exports={parseDay,localInstant,normalizeDiscovery,creationPlan,tabName,buildInitialValues,verifyInitialValues,cellsFrom,headerValue};
