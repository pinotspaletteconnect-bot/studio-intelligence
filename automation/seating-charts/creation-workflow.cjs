'use strict';
const fs=require('node:fs'),path=require('node:path');
const {buildReservationWorkflow}=require('./reservation-workflow.cjs');
function creationLibrary(){return ['planner.cjs','staff-writes.cjs','private-party-writes.cjs','creation.cjs'].map(file=>fs.readFileSync(path.join(__dirname,file),'utf8')
 .replace(/^'use strict';\s*/m,'').replace(/^const .*?=\s*require\([^\n]+\);\s*$/gm,'').replace(/^module\.exports\s*=.*;\s*$/gm,'')).join('\n');}
function factory(name,trigger='child'){
 const nodes=[],connections={};
 const add=(name,type,parameters,credentials,version)=>{const n={id:`node-${nodes.length}`,name,type,typeVersion:version??(type.endsWith('httpRequest')?4.2:type.endsWith('code')?2:1),position:[nodes.length*240,0],parameters,...(credentials?{credentials}:{})};nodes.push(n);return n;};
 const code=(name,jsCode)=>add(name,'n8n-nodes-base.code',{jsCode});
 const creds={google:{googleDriveOAuth2Api:{id:'Fmbjd7IWMJeb4vZQ',name:'St Matthews Seating Charts — Google Drive'}},warehouse:{supabaseApi:{id:'A32h7eKkq8JEdg0k',name:'Supabase account'}},collector:{httpHeaderAuth:{id:'li7hEi0wisqrbFlP',name:'Studio Intelligence Collector'}}};
 const http=(name,auth,method,url,body)=>add(name,'n8n-nodes-base.httpRequest',{method,url,authentication:auth==='collector'?'genericCredentialType':'predefinedCredentialType',[auth==='collector'?'genericAuthType':'nodeCredentialType']:Object.keys(creds[auth])[0],...(body?{sendBody:true,specifyBody:'json',jsonBody:body}:{}),options:{timeout:auth==='collector'?600000:60000}},creds[auth]);
 const rpc=(name,fn,body)=>http(name,'warehouse','POST',`https://hsosjnwjangtqtskofag.supabase.co/rest/v1/rpc/${fn}`,body);
 const branch=(name,condition)=>add(name,'n8n-nodes-base.if',{conditions:{options:{caseSensitive:true,typeValidation:'strict',version:2},combinator:'and',conditions:[{id:'condition',leftValue:condition,rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}]},options:{}},null,2.2);
 const call=(name,workflow)=>add(name,'n8n-nodes-base.executeWorkflow',{source:'parameter',workflowJson:JSON.stringify(workflow),mode:'each',options:{waitForSubWorkflow:true}},null,1.2);
 const connect=(a,b,index=0)=>{connections[a]??={main:[]};connections[a].main[index]=[{node:b,type:'main',index:0}];};
 const finish=()=>({name,active:false,nodes,connections,settings:{executionOrder:'v1',timezone:'America/New_York',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false}});
 add('Creation input',trigger==='manual'?'n8n-nodes-base.manualTrigger':'n8n-nodes-base.executeWorkflowTrigger',trigger==='manual'?{}:{inputSource:'passthrough'});
 return {nodes,code,http,rpc,branch,call,connect,finish};
}
function buildGroupWorkflow(studio){
 const f=factory('STM create one overlap workbook'),{code,http,rpc,branch,call,connect}=f;
 const lib=creationLibrary(),ctx=`const context=$('Claim workbook').first().json;const studio=context.config,plan=context.plan,group=context.source;`;
 rpc('Claim workbook','claim_seating_chart_workbook','={{ {p_studio_id:$json.studio.studioId,p_run_id:"stm-create-"+$execution.id,p_group:$json.group,p_plan:$json.plan} }}');
 branch('Workbook already ready','={{ $json.ready === true }}');
 http('Google account','google','GET','https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
 code('Verify studio Google account',`${ctx}if($input.first().json.user?.emailAddress!==studio.googleAccountEmail)throw Error('Wrong studio Google account');return [{json:{verified:true}}];`);
 const fields='id,name,mimeType,parents,owners(emailAddress),capabilities(canCopy,canEdit),appProperties';
 http('Read master','google','GET',`=https://www.googleapis.com/drive/v3/files/{{ $('Claim workbook').first().json.config.masterSpreadsheetId }}?fields=${encodeURIComponent(fields)}`);
 code('Verify master',`${ctx}const file=$input.first().json;if(file.id!==studio.masterSpreadsheetId||file.mimeType!=='application/vnd.google-apps.spreadsheet'||file.capabilities?.canCopy!==true||!file.owners?.some(o=>o.emailAddress===studio.googleAccountEmail))throw Error('Master ownership/copy permission mismatch');return [{json:{verified:true}}];`);
 http('Read folder','google','GET',`=https://www.googleapis.com/drive/v3/files/{{ $('Claim workbook').first().json.config.destinationFolderId }}?fields=${encodeURIComponent(fields)}`);
 code('Verify folder',`${ctx}const file=$input.first().json;if(file.id!==studio.destinationFolderId||file.mimeType!=='application/vnd.google-apps.folder'||file.capabilities?.canEdit!==true||!file.owners?.some(o=>o.emailAddress===studio.googleAccountEmail))throw Error('Folder owner/edit permission mismatch');return [{json:{verified:true}}];`);
 http('Find prior copy','google','GET',`=https://www.googleapis.com/drive/v3/files?q={{ encodeURIComponent("trashed = false and appProperties has { key='seatingGroupId' and value='"+$('Claim workbook').first().json.groupId+"' }") }}&pageSize=100&fields=${encodeURIComponent(`nextPageToken,incompleteSearch,files(${fields})`)}`);
 code('Resolve copy safely',`${ctx}const found=$input.first().json;if(found.nextPageToken||found.incompleteSearch||!Array.isArray(found.files)||found.files.length>1)throw Error('Ambiguous workbook copy; review required');
 if(found.files.length){const file=found.files[0];if(context.fileId&&file.id!==context.fileId)throw Error('Mapped workbook differs');return [{json:{...file,needsCopy:false}}];}
 if(context.state!=='planned'||context.fileId)throw Error('Copy outcome uncertain or mapped file missing; never issue a second copy automatically');return [{json:{needsCopy:true}}];`);
 branch('Copy needed','={{ $json.needsCopy === true }}');
 rpc('Record copy request','advance_seating_chart_workbook','={{ {p_group_id:$("Claim workbook").first().json.groupId,p_run_id:"stm-create-"+$execution.id,p_action:"copy-issued",p_data:{}} }}');
 http('Copy studio master','google','POST',`=https://www.googleapis.com/drive/v3/files/{{ $('Claim workbook').first().json.config.masterSpreadsheetId }}/copy?fields=${encodeURIComponent(fields)}`,
  '={{ {name:$("Claim workbook").first().json.plan.title,parents:[$("Claim workbook").first().json.config.destinationFolderId],appProperties:{seatingGroupId:$("Claim workbook").first().json.groupId,seatingMasterId:$("Claim workbook").first().json.config.masterSpreadsheetId}} }}');
 rpc('Record verified copy','advance_seating_chart_workbook','={{ {p_group_id:$("Claim workbook").first().json.groupId,p_run_id:"stm-create-"+$execution.id,p_action:"copied",p_data:$json} }}');
 http('Read workbook tabs','google','GET',"=https://sheets.googleapis.com/v4/spreadsheets/{{ $json.fileId }}?fields=spreadsheetId,properties(timeZone),sheets(properties(sheetId,title,hidden,gridProperties))");
 code('Prepare event tabs',`${ctx}const document=$input.first().json;if(document.spreadsheetId!==$('Record verified copy').first().json.fileId||document.properties?.timeZone!==studio.timeZone)throw Error('Copy spreadsheet mismatch');
 for(const id of [0,1955136908,studio.privatePartyFormMapping.sheetId])if(!document.sheets?.some(s=>s.properties.sheetId===id))throw Error('Master templates missing');
 const present=plan.tabs.filter(t=>document.sheets.some(s=>s.properties.sheetId===t.sheetId));if(present.length&&present.length!==plan.tabs.length)throw Error('Partial/foreign tab structure; review required');
 if(present.some(t=>document.sheets.find(s=>s.properties.sheetId===t.sheetId).properties.title!==t.sheetName))throw Error('Tab ID/name conflict');
 return [{json:{fileId:document.spreadsheetId,requests:present.length?[]:plan.structure.requests}}];`);
 branch('Event tabs needed','={{ $json.requests.length > 0 }}');
 http('Create native event tabs','google','POST',"=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Prepare event tabs').first().json.fileId }}:batchUpdate",'={{ {requests:$("Prepare event tabs").first().json.requests} }}');
 const readURL="=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Prepare event tabs').first().json.fileId }}?{{ $('Claim workbook').first().json.plan.tabs.flatMap(t=>[\"ranges=\"+encodeURIComponent(\"'\"+t.sheetName.replace(/'/g,\"''\")+\"'!A1:AC32\"),...(!t.isPrivate?[\"ranges=\"+encodeURIComponent(\"'\"+t.sheetName.replace(/'/g,\"''\")+\"'!T1:AC1000\")]:[])]).join('&') }}&includeGridData=true&fields=spreadsheetId,sheets(properties(sheetId,title,hidden,gridProperties),data(startRow,startColumn,rowData(values(userEnteredValue,dataValidation))))";
 http('Read initial event cells','google','GET',readURL);
 code('Verify event tab structure',`${ctx}const document=$input.first().json;for(const t of plan.tabs){const s=document.sheets?.find(s=>s.properties.sheetId===t.sheetId);if(s?.properties.title!==t.sheetName||s.properties.hidden===true||s.properties.gridProperties.rowCount<1000)throw Error('Event tab structure not verified');}return [{json:{verified:true}}];`);
 rpc('Record event structure','advance_seating_chart_workbook','={{ {p_group_id:$("Claim workbook").first().json.groupId,p_run_id:"stm-create-"+$execution.id,p_action:"structured",p_data:$json} }}');
 code('Prepare initial event values',`${lib}\n${ctx}const document=$('Read initial event cells').first().json;
 const pending=context.valuesPlan;let values;
 if(pending){for(const tab of plan.tabs.filter(t=>!t.isPrivate)){const range={row:0,column:19,rows:1000,columns:10};if(JSON.stringify(cellsFrom(pending.before,tab.sheetId,range))!==JSON.stringify(cellsFrom(document,tab.sheetId,range)))throw Error('Protected cells changed during initial retry');}for(const [key,wanted]of Object.entries(pending.expected)){const [id,cell]=key.split(':');const live=headerValue(document,+id,cell),prior=headerValue(pending.before,+id,cell);if(JSON.stringify(live)!==JSON.stringify(prior)&&JSON.stringify(live)!==JSON.stringify(wanted))throw Error('Initial cell edited manually during retry');}values=pending;}
 else values={...buildInitialValues({group,plan,studio,document,now:new Date().toISOString()}),before:document};
 return [{json:values}];`);
 rpc('Stage initial values','advance_seating_chart_workbook','={{ {p_group_id:$("Claim workbook").first().json.groupId,p_run_id:"stm-create-"+$execution.id,p_action:"values-staged",p_data:$("Prepare initial event values").first().json} }}');
 http('Fill mapped event headers','google','POST',"=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Prepare event tabs').first().json.fileId }}/values:batchUpdate",'={{ $("Prepare initial event values").first().json.request }}');
 http('Read completed event cells','google','GET',readURL);
 code('Verify event values and protected cells',`${lib}\n${ctx}const values=$('Prepare initial event values').first().json;const result=verifyInitialValues({before:values.before,after:$input.first().json,plan,values});return [{json:result}];`);
 rpc('Complete workbook creation','advance_seating_chart_workbook','={{ {p_group_id:$("Claim workbook").first().json.groupId,p_run_id:"stm-create-"+$execution.id,p_action:"completed",p_data:$json} }}');
 code('Class targets to refresh','const targets=$input.first().json.targets??[];return targets.length?targets.map(targetId=>({json:{targetId}})):[{json:{privatePartyOnly:true}}];');
 branch('Class refresh needed','={{ typeof $json.targetId === "string" }}');
 call('Fill class reservations safely',buildReservationWorkflow({studio,supabaseUrl:'https://hsosjnwjangtqtskofag.supabase.co',collectorUrl:'https://studio-intelligence-production.up.railway.app',childMode:true}));
 code('Creation result',`const claim=$('Claim workbook').first().json;return [{json:{status:'created-and-refreshed',groupId:claim.groupId,classCount:claim.plan.tabs.filter(t=>!t.isPrivate).length,privatePartyCount:claim.plan.tabs.filter(t=>t.isPrivate).length,scheduledUpdates:false,results:$input.all().map(i=>i.json)}}];`);
 const sequence=['Creation input','Claim workbook','Workbook already ready','Google account','Verify studio Google account','Read master','Verify master','Read folder','Verify folder','Find prior copy','Resolve copy safely','Copy needed','Record copy request','Copy studio master','Record verified copy','Read workbook tabs','Prepare event tabs','Event tabs needed','Create native event tabs','Read initial event cells','Verify event tab structure','Record event structure','Prepare initial event values','Stage initial values','Fill mapped event headers','Read completed event cells','Verify event values and protected cells','Complete workbook creation','Class targets to refresh','Class refresh needed','Fill class reservations safely','Creation result'];
 sequence.slice(0,-1).forEach((a,i)=>connect(a,sequence[i+1]));
 connect('Workbook already ready','Class targets to refresh',0);connect('Workbook already ready','Google account',1);
 connect('Copy needed','Record copy request',0);connect('Copy needed','Record verified copy',1);
 connect('Event tabs needed','Create native event tabs',0);connect('Event tabs needed','Read initial event cells',1);
 connect('Class refresh needed','Fill class reservations safely',0);connect('Class refresh needed','Creation result',1);
 return f.finish();
}
function buildCreationWorkflow({studio,selectedClassIds=[],authorized=false}){
 const f=factory('04 - Seating Charts - STM create overlap files - MANUAL TEST','manual'),{code,http,call,connect}=f;
 code('Manual creation settings',`if(${JSON.stringify(authorized)}!==true)throw Error('Manual creation deployment pending');const now=new Date();const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(now);const base=Date.parse(date+'T12:00:00Z');const day=n=>new Date(base+n*86400000).toISOString().slice(0,10);return [{json:{fromDate:day(-1),toDate:day(9),selectedClassIds:${JSON.stringify(selectedClassIds)}}}];`);
 http('Load studio creation settings','warehouse','GET','https://hsosjnwjangtqtskofag.supabase.co/rest/v1/seating_chart_creation_settings?studio_id=eq.1&select=studio_id,config,enabled,schedule_enabled');
 code('Require manual STM settings',`const records=$input.all();if(records.length!==1)throw Error('One studio configuration required');const row=records[0].json;if(!row.enabled||row.schedule_enabled||row.studio_id!==1||row.config.studioCode!=='STM'||row.config.accountId!==1||row.config.googleAccountEmail!==${JSON.stringify(studio.googleAccountEmail)}||row.config.masterSpreadsheetId!==${JSON.stringify(studio.masterSpreadsheetId)})throw Error('Unverified manual studio settings');return [{json:row.config}];`);
 http('Discover current classes and parties','collector','POST','https://studio-intelligence-production.up.railway.app/pts/seating-events','={{ {accountId:$json.accountId,studioId:$json.studioId,fromDate:$("Manual creation settings").first().json.fromDate,toDate:$("Manual creation settings").first().json.toDate} }}');
 code('Plan complete overlap groups',`${creationLibrary()}\nconst studio=$('Require manual STM settings').first().json;const settings=$('Manual creation settings').first().json;const planned=normalizeDiscovery($input.first().json,studio);const groups=planned.groups.filter(g=>!settings.selectedClassIds.length||g.events.some(e=>settings.selectedClassIds.includes(e.classId)));if(settings.selectedClassIds.some(id=>!groups.some(g=>g.events.some(e=>e.classId===id))))throw Error('Selected test class not in a complete eligible group');return groups.map(group=>({json:{studio,group,plan:creationPlan(group,studio)}}));`);
 call('Create each overlap workbook',buildGroupWorkflow(studio));
 code('Manual creation summary',`return [{json:{status:'manual-creation-completed',scheduledUpdates:false,groups:$input.all().map(i=>i.json)}}];`);
 f.nodes.slice(0,-1).forEach((n,i)=>connect(n.name,f.nodes[i+1].name));return f.finish();
}
if(require.main===module){const studio=JSON.parse(fs.readFileSync(path.join(__dirname,'stm-creation-settings.json'),'utf8'));fs.writeFileSync(path.join(__dirname,'04-stm-create-overlap-files.json'),JSON.stringify(buildCreationWorkflow({studio,selectedClassIds:process.argv.slice(2).filter(x=>/^\d+$/.test(x)),authorized:process.argv.includes('--authorized')}),null,2)+'\n');}
module.exports={creationLibrary,buildGroupWorkflow,buildCreationWorkflow};
