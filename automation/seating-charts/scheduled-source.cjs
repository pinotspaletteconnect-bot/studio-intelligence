'use strict';
function scheduledSourceGuard(details,scheduledStartAt,now=new Date().toISOString()){
 if(!scheduledStartAt)return;
 const start=Date.parse(scheduledStartAt),at=Date.parse(now);
 if(!Number.isFinite(start)||!Number.isFinite(at)||at>start-70*60000||details?.isPublished!==true)throw Error('Scheduled class is unpublished, late or unverified');
 const m=/^(?:[A-Za-z]{3}, )?(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(details.dateText??'');
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const actual=m&&months.includes(m[2])?`${m[3]}-${String(months.indexOf(m[2])+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`:null;
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date(start));
 const clock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(new Date(start));
 if(actual!==day||details.startTimeText?.replace(/\s+/g,' ').trim()!==clock)throw Error('Class time changed; review the workbook before scheduled updates');
}
module.exports={scheduledSourceGuard};
