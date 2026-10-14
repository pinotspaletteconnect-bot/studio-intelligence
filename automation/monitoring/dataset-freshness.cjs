'use strict';
function easternDate(value) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function assessExecutions(input,previous={}) {
 const state=previous.feeds||{},events=[];
 for(const feed of input.catalog){
  const prior=state[feed.id]||{};let issue='',successAt='',latestAttemptAt='';
  if(input.kind==='error') {if(input.failedWorkflowId!==feed.workflowId)continue;issue='The import failed. Review its n8n execution.';}
  else {
   const response=input.executions[feed.id];
   if(!response||response.error||response.statusCode!==200||!Array.isArray(response.body?.data))issue='The monitor could not read this import’s execution history.';
   else {
    const relevant=response.body.data.filter(r=>r.workflowId===feed.workflowId&&['trigger','integrated','retry','webhook'].includes(r.mode));
    const successes=relevant.filter(r=>r.status==='success'&&r.finished===true&&Number.isFinite(Date.parse(r.stoppedAt)));
    const success=successes.sort((a,b)=>Date.parse(b.stoppedAt)-Date.parse(a.stoppedAt))[0];successAt=success?.stoppedAt||'';
    const attempts=relevant.filter(r=>Number.isFinite(Date.parse(r.startedAt))).sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt));
    const latest=attempts[0];latestAttemptAt=latest?.startedAt||'';
    if(latest&&['error','crashed','canceled'].includes(latest.status)&&(!successAt||Date.parse(latest.stoppedAt||latest.startedAt)>Date.parse(successAt)))issue='The latest production import failed or was canceled.';
    else if(input.minuteOfDay>=feed.deadlineMinute&&(!successAt||input.localDate(successAt)!==input.today))issue='No successful completed refresh was recorded after today’s scheduled import.';
    else if(prior.issue&&(!successAt||Date.parse(successAt)<=Date.parse(prior.failedAt||prior.notifiedAt)))issue=prior.issue;
    else if(!success&&response.body.nextCursor)issue='Import history is incomplete; no production completion could be verified.';
   }
  }
  let action='quiet';if(issue&&!prior.issue)action='alert';else if(!issue&&prior.issue&&successAt)action='recovered';
  events.push({feedId:feed.id,label:feed.label,workflowId:feed.workflowId,action,issue,successAt,latestAttemptAt,subject:action==='recovered'?`SASHA: ${feed.label} refresh recovered`:`SASHA: ${feed.label} refresh needs attention`,text:action==='recovered'?`${feed.label} completed a successful production refresh at ${successAt}. The import alert has cleared.`:`${feed.label}: ${issue}\n\nDashboard values may be incomplete. Missing data is not verified zero activity. A completed empty import is accepted as healthy.\n\nReview: https://primary-production-a88c.up.railway.app/workflow/${feed.workflowId}/executions`});
 }
 return events;
}
module.exports={assessExecutions,easternDate};
