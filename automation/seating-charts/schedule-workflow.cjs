'use strict';
const fs=require('node:fs'),path=require('node:path');
const {creationLibrary}=require('./creation-workflow.cjs');
const {creationPlan}=require('./creation.cjs');
function scheduledDiscovery(planned,known,studio,now=new Date().toISOString()){
 const canonical=v=>JSON.stringify((function sort(x){return Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;})(v));
 const groups=[],review=[...planned.review];
 for(const group of planned.groups){
  if(Date.parse(group.startAt)<Date.parse(now)+75*60000)continue;
  const plan=creationPlan(group,studio),existing=known.find(w=>w.groupKey===group.groupKey);
  if(existing){if(canonical(existing.plan)!==canonical(plan))review.push({groupKey:group.groupKey,reason:'existing-workbook-plan-changed'});else if(existing.state!=='ready')review.push({groupKey:group.groupKey,reason:'unfinished-workbook-requires-recovery'});continue;}
  if(known.some(w=>w.plan.tabs.some(t=>group.events.some(e=>e.classId===t.classId)))){review.push({groupKey:group.groupKey,reason:'overlap-membership-changed'});continue;}
  groups.push({studio,group,plan});
 }
 return {groups,review};
}
function buildScheduleWorkflow(ids){
 const nodes=[],connections={},add=(name,type,parameters,extra={},version)=>nodes.push({id:'schedule-'+nodes.length,name,type,typeVersion:version??(type.endsWith('httpRequest')?4.2:type.endsWith('code')?2:1),position:[nodes.length*240,0],parameters,...extra});
 const code=(name,jsCode)=>add(name,'n8n-nodes-base.code',{jsCode});
 const rpc=(name,fn,jsonBody)=>add(name,'n8n-nodes-base.httpRequest',{method:'POST',url:'https://hsosjnwjangtqtskofag.supabase.co/rest/v1/rpc/'+fn,authentication:'predefinedCredentialType',nodeCredentialType:'supabaseApi',sendBody:true,specifyBody:'json',jsonBody,options:{timeout:30000}},{credentials:{supabaseApi:{id:'A32h7eKkq8JEdg0k',name:'Supabase account'}}});
 const branch=(name,expression)=>add(name,'n8n-nodes-base.if',{conditions:{options:{caseSensitive:true,typeValidation:'strict',version:2},combinator:'and',conditions:[{id:'condition',leftValue:expression,rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}]},options:{}},{},2.2);
 const call=(name,id)=>add(name,'n8n-nodes-base.executeWorkflow',{source:'database',workflowId:{__rl:true,value:id,mode:'id'},workflowInputs:{mappingMode:'defineBelow',value:{},matchingColumns:[],schema:[],attemptToConvertTypes:false,convertFieldsToString:true},mode:'each',options:{waitForSubWorkflow:true}},{onError:'continueErrorOutput'},1.2);
 const connect=(a,b,i=0)=>{connections[a]??={main:[]};connections[a].main[i]=[{node:b,type:'main',index:0}];};
 add('Every minute','n8n-nodes-base.scheduleTrigger',{rule:{interval:[{field:'minutes',minutesInterval:1}]}},{},1.2);
 add('Manual scheduled check','n8n-nodes-base.manualTrigger',{});
 rpc('Claim due STM work','claim_seating_schedule','={{ {p_execution_id:$execution.id} }}');
 code('Due work only',`return $input.first().json.idle?[]:$input.all();`);
 branch('Discover upcoming events','={{ $json.kind === "discovery" }}');
 add('Discover seven-day classes and parties','n8n-nodes-base.httpRequest',{method:'POST',url:'https://studio-intelligence-production.up.railway.app/pts/seating-events',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:'={{ {accountId:$json.config.accountId,studioId:$json.config.studioId,fromDate:$json.fromDate,toDate:$json.toDate} }}',options:{timeout:600000}},{credentials:{httpHeaderAuth:{id:'li7hEi0wisqrbFlP',name:'Studio Intelligence Collector'}},onError:'continueErrorOutput'},4.2);
 code('Plan only new overlap files',`${creationLibrary()}\n${scheduledDiscovery.toString()}\nconst task=$('Claim due STM work').first().json;const planned=normalizeDiscovery($input.first().json,task.config);return [{json:scheduledDiscovery(planned,task.knownWorkbooks,task.config)}];`);
 // Capture validation failures too, so the studio lane is released with an audit.
 nodes.at(-1).onError='continueErrorOutput';
 branch('New overlap files exist','={{ $json.groups.length > 0 }}');
 code('New groups to create',`return $input.first().json.groups.map(json=>({json}));`);
 call('Create safe overlap files',ids.groupWorkflowId);
 code('Discovery result',`const planned=$('Plan only new overlap files').first().json;return [{json:{createdGroups:planned.groups.length,review:planned.review}}];`);
 code('Registered class to refresh',`const t=$('Claim due STM work').first().json;return [{json:{targetId:t.targetId,scheduledStartAt:t.scheduledStartAt}}];`);
 call('Refresh guests staff and products',ids.combinedWorkflowId);
 rpc('Record verified scheduled result','complete_seating_schedule','={{ {p_job_id:$("Claim due STM work").first().json.jobId,p_execution_id:$execution.id,p_result:$json} }}');
 rpc('Record scheduled failure for review','complete_seating_schedule','={{ {p_job_id:$("Claim due STM work").first().json.jobId,p_execution_id:$execution.id,p_result:{reason:"scheduled-operation-failed",executionId:$execution.id},p_failed:true} }}');
 connect('Every minute','Claim due STM work');connect('Manual scheduled check','Claim due STM work');connect('Claim due STM work','Due work only');connect('Due work only','Discover upcoming events');
 connect('Discover upcoming events','Discover seven-day classes and parties');connect('Discover upcoming events','Registered class to refresh',1);
 connect('Discover seven-day classes and parties','Plan only new overlap files');connect('Discover seven-day classes and parties','Record scheduled failure for review',1);
 connect('Plan only new overlap files','New overlap files exist');connect('Plan only new overlap files','Record scheduled failure for review',1);
 connect('New overlap files exist','New groups to create');connect('New overlap files exist','Discovery result',1);connect('New groups to create','Create safe overlap files');connect('Create safe overlap files','Discovery result');connect('Create safe overlap files','Record scheduled failure for review',1);connect('Discovery result','Record verified scheduled result');
 connect('Registered class to refresh','Refresh guests staff and products');connect('Refresh guests staff and products','Record verified scheduled result');connect('Refresh guests staff and products','Record scheduled failure for review',1);
 return {name:'10 - Seating Charts - STM scheduled creation and updates',active:false,nodes,connections,settings:{executionOrder:'v1',timezone:'America/New_York',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false}};
}
if(require.main===module)fs.writeFileSync(path.join(__dirname,'10-stm-scheduled-updates.json'),JSON.stringify(buildScheduleWorkflow(require('./stm-creation-workflows.json')),null,2)+'\n');
module.exports={scheduledDiscovery,buildScheduleWorkflow};
