'use strict';
const DAY=86400000;
function groupCalendarCandidates(rows,fromDate,toDate){
 const grouped=new Map();
 for(const row of rows){if(!grouped.has(row.classId))grouped.set(row.classId,[]);grouped.get(row.classId).push(row);}
 const result=[];
 for(const entries of grouped.values()){
  if(!entries.some(e=>e.date>=fromDate&&e.date<=toDate))continue;
  const dates=[...new Set(entries.map(e=>e.date))].sort();
  const first=entries.find(e=>e.date===dates[0]);
  if(entries.some(e=>e.partyStage!==first.partyStage||e.time!==first.time||e.painting!==first.painting))throw Error('Conflicting calendar segments');
  if(dates.length>2||dates.length===2&&Date.parse(dates[1])-Date.parse(dates[0])!==DAY)throw Error('Class dates conflict');
  result.push({...first,calendarDates:dates});
 }
 if(result.length>100)throw Error('Calendar window exceeds manual collection limit');
 return result.sort((a,b)=>a.classId.localeCompare(b.classId));
}
function detailDate(text){
 const m=/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/.exec(text??'');
 if(!m)throw Error('Class date unverified');
 const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[3]);
 const d=new Date(Date.UTC(Number(m[4]),month,Number(m[2])));
 if(d.getUTCFullYear()!==Number(m[4])||d.getUTCMonth()!==month||d.getUTCDate()!==Number(m[2])||['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]!==m[1])throw Error('Class date unverified');
 return d.toISOString().slice(0,10);
}
function minutes(text){const m=/^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(text??'');if(!m||Number(m[1])<1||Number(m[1])>12||Number(m[2])>59)return null;return Number(m[1])%12*60+Number(m[2])+(m[3]==='PM'?720:0);}
function resolveCalendarDate(candidate,details){
 const actual=detailDate(details.dateText),dates=candidate.calendarDates;
 if(!Array.isArray(dates)||!dates.length||dates.length>2)throw Error('Class dates conflict');
 if(dates.length===1&&dates[0]===actual)return actual;
 const start=minutes(details.startTimeText),end=minutes(details.endTimeText);
 const next=new Date(Date.parse(actual)+DAY).toISOString().slice(0,10);
 // A class may be rendered as two calendar segments across midnight. Only
 // its independently read detail page can authorize that interpretation.
 if(start===null||end===null||end>=start||dates.some(d=>d!==actual&&d!==next)||!dates.includes(next))throw Error('Class dates conflict');
 return actual;
}
module.exports={groupCalendarCandidates,resolveCalendarDate};
