'use strict';
const {readClass}=require('./classRoster.cjs');
const BASE='https://admin.pinotspalette.com';
const DAY=86400000;
function validWindow(from,to){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from??'')||!/^\d{4}-\d{2}-\d{2}$/.test(to??'')||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||new Date(from).toISOString().slice(0,10)!==from||new Date(to).toISOString().slice(0,10)!==to||Date.parse(to)<Date.parse(from)||Date.parse(to)-Date.parse(from)>12*DAY)throw Error('Bounded calendar dates required');
}
// Reads rendered dates/links only. The legacy calendar positions each event over
// its date cell; actual ClassDate is independently checked on every detail page.
function calendarDOM(){
 const label=document.querySelector('#lblDate')?.textContent.trim();
 const match=/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/.exec(label??'');
 if(!match)throw Error('Calendar month missing');
 const month=['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(match[1]);
 const first=new Date(Date.UTC(+match[2],month,1)); first.setUTCDate(1-first.getUTCDay());
 const days=Array.from(document.querySelectorAll('td[class*="fc-day"]')).flatMap(e=>{
  const n=/\bfc-day(\d+)\b/.exec(e.className);if(!n)return [];
  const date=new Date(first);date.setUTCDate(first.getUTCDate()+Number(n[1]));
  if(Number(e.querySelector('.fc-day-number')?.textContent)!==date.getUTCDate())throw Error('Calendar day mismatch');
  const r=e.getBoundingClientRect();return [{date:date.toISOString().slice(0,10),x:r.x,y:r.y,w:r.width,h:r.height}];
 });
 if(days.length<28||days.length>42)throw Error('Incomplete month grid');
 const events=Array.from(document.querySelectorAll('a.fc-event[href^="/Class/Edit/"]')).map(e=>{
  const id=/^\/Class\/Edit\/(\d+)$/.exec(e.getAttribute('href'));const r=e.getBoundingClientRect();
  const day=days.filter(d=>r.x+r.width/2>d.x&&r.x+r.width/2<d.x+d.w&&r.y+2>d.y&&r.y+2<d.y+d.h);
  if(!id||day.length!==1)throw Error('Ambiguous calendar event date');
  const workflow=/^wflow_(\d+)_/.exec(e.querySelector('.calevent-partyplanner')?.id??'');
  return {classId:id[1],date:day[0].date,partyStage:workflow?.[1]??null,time:e.querySelector('.calevent-time')?.textContent.trim()??'',painting:e.querySelector('.calevent-painting-name')?.textContent.trim()??''};
 });
 return {month:`${match[2]}-${String(month+1).padStart(2,'0')}`,locationId:document.querySelector('#LocationSelect')?.value,roomId:document.querySelector('#RoomSelect')?.value,partyStage:document.querySelector('#PartyStageSelect')?.value,events};
}
async function readCalendar(page,target,fromDate,toDate){
 const ready=()=>page.waitForFunction(()=>{
  const search=document.querySelector('#searchBtn');
  return search&&!search.disabled&&search.textContent.trim()==='Search'&&document.querySelectorAll('td[class*="fc-day"]').length>=28;
 },null,{timeout:60000});
 await page.goto(`${BASE}/Class/CalendarView`,{waitUntil:'domcontentloaded'});
 // The grid and month label precede the delayed event request. Network idle and
 // two immediate DOM reads can both observe an empty, still-loading calendar.
 await ready();
 await page.locator('#LocationSelect').selectOption(String(target.sourceLocationId));
 await page.locator('#RoomSelect').selectOption('-1');
 await page.locator('#PartyStageSelect').selectOption('0');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.waitForLoadState('networkidle',{timeout:30000});
 await ready();
 await page.locator('#lblDate').waitFor();
 // Search reloads the source page. Wait for the calendar's rendered grid, then
 // take two equal observations to avoid adopting a partially rendered event set.
 await page.waitForFunction(()=>document.querySelectorAll('td[class*="fc-day"]').length>=28);
 const wanted=[...new Set([fromDate.slice(0,7),toDate.slice(0,7)])]; const all=[];
 for(const month of wanted){
  let current;
  for(let i=0;i<25;i++){
   current=await page.evaluate(calendarDOM);
   if(current.month===month)break;
   // The source renders identical month controls above and below the calendar.
   await page.getByRole('button',{name:current.month<month?'Next Month':'Previous Month',exact:true}).first().click();
   await page.waitForFunction(previous=>document.querySelector('#lblDate')?.textContent.trim()!==previous,current.monthLabel??new Date(current.month+'-01T12:00:00Z').toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}));
   await page.waitForLoadState('networkidle',{timeout:30000});
   await ready();
  }
  if(current.month!==month||current.locationId!==String(target.sourceLocationId)||current.roomId!=='-1'||current.partyStage!=='0')throw Error('Calendar filters/month unverified');
  const stable=await page.evaluate(calendarDOM);if(JSON.stringify(stable)!==JSON.stringify(current))throw Error('Calendar changed during reading');
  all.push(...current.events.filter(e=>e.date>=fromDate&&e.date<=toDate));
 }
 const map=new Map();for(const e of all){if(map.has(e.classId)&&map.get(e.classId).date!==e.date)throw Error('Class dates conflict');map.set(e.classId,e);}
 if(map.size>100)throw Error('Calendar window exceeds manual collection limit');
 return [...map.values()].sort((a,b)=>a.classId.localeCompare(b.classId));
}
async function collectSeatingEvents({page,target,fromDate,toDate}){
 validWindow(fromDate,toDate);
 if(!target.sourceLocationId||!target.sourceLocationLabel)throw Error('Verified studio binding required');
 let stage='calendar-before';
 try{
  const before=await readCalendar(page,target,fromDate,toDate);const events=[];
  for(const candidate of before){
   stage='event-detail';const details=await readClass(page,candidate.classId);
   if(details.locationLabel!==target.sourceLocationLabel)throw Error('Wrong class location');
   events.push({classId:candidate.classId,calendarDate:candidate.date,calendarPartyStage:candidate.partyStage,...details});
  }
  stage='calendar-after';const after=await readCalendar(page,target,fromDate,toDate);
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Calendar changed during collection');
  return {studioCode:target.studioCode,complete:true,fromDate,toDate,retrievedAt:new Date().toISOString(),events};
 }catch{throw Object.assign(new Error('Event source collection failed'),{sourceStage:stage});}
}
module.exports={validWindow,calendarDOM,readCalendar,collectSeatingEvents};
