'use strict';
const fs=require('node:fs'),path=require('node:path'),{validateTarget}=require('./refresh.cjs');
function productLibrary(){return validateTarget.toString()+'\n'+fs.readFileSync(path.join(__dirname,'product-writes.cjs'),'utf8').replace(/^'use strict';\s*/m,'').replace(/^module\.exports=.*;\s*$/m,'');}
function buildProductWorkflow(studio){
 const nodes=[],connections={},add=(name,type,parameters,credentials,version)=>{nodes.push({id:'product-'+nodes.length,name,type,typeVersion:version??(type.endsWith('.httpRequest')?4.2:type.endsWith('.code')?2:1),position:[nodes.length*230,0],parameters,...(credentials?{credentials}:{})});};
 const code=(name,jsCode)=>add(name,'n8n-nodes-base.code',{jsCode});
 const creds={warehouse:{supabaseApi:{id:'A32h7eKkq8JEdg0k',name:'Supabase account'}},collector:{httpHeaderAuth:{id:'li7hEi0wisqrbFlP',name:'Studio Intelligence Collector'}},google:{googleDriveOAuth2Api:{id:studio.n8nGoogleCredentialRef,name:'St Matthews Seating Charts — Google Drive'}}};
 const http=(name,auth,method,url,body)=>add(name,'n8n-nodes-base.httpRequest',{method,url,authentication:auth==='collector'?'genericCredentialType':'predefinedCredentialType',[auth==='collector'?'genericAuthType':'nodeCredentialType']:Object.keys(creds[auth])[0],...(body?{sendBody:true,specifyBody:'json',jsonBody:body}:{}),options:{timeout:auth==='collector'?600000:60000}},creds[auth]);
 const db='https://hsosjnwjangtqtskofag.supabase.co/rest/v1/',rpc=(name,fn,body)=>http(name,'warehouse','POST',db+'rpc/'+fn,body),lib=productLibrary();
 add('Product refresh input','n8n-nodes-base.executeWorkflowTrigger',{inputSource:'passthrough'});
 code('Product run settings',`const input=$input.first().json;if(!/^[a-f0-9-]{36}$/.test(input.targetId??''))throw Error('Registered product target required');return [{json:{targetId:input.targetId,runId:input.runId??'stm-products-'+$execution.id}}];`);
 http('Load registered class','warehouse','GET',`=${db}seating_chart_targets?id=eq.{{ $json.targetId }}&select=studio_id,enabled,config`);
 code('Require registered STM class',`${lib}\nconst rows=$input.all().map(i=>i.json);if(rows.length!==1)throw Error('One registered product target required');const t=rows[0].config;validateTarget(t);if(!rows[0].enabled||rows[0].studio_id!==1||t.studioId!==1||t.accountId!==1||t.googleAccountEmail!==${JSON.stringify(studio.googleAccountEmail)}||t.masterSpreadsheetId!==${JSON.stringify(studio.masterSpreadsheetId)})throw Error('Wrong product studio or owner');return [{json:t}];`);
 http('Load product studio mapping','warehouse','GET',db+'seating_chart_creation_settings?studio_id=eq.1&select=enabled,schedule_enabled,config');
 code('Require manual product mapping',`const rows=$input.all().map(i=>i.json);if(rows.length!==1||!rows[0].enabled||rows[0].config.productReservations?.enabled!==true)throw Error('Product schedule or mapping not authorized');const target=$('Require registered STM class').first().json;const mapping=rows[0].config.productReservations.templates[String(target.templateSheetId??target.sheetId)];if(!Array.isArray(mapping)||mapping.length!==3)throw Error('Unmapped product template');return [{json:{...target,productMapping:mapping}}];`);
 http('Collect current class products','collector','POST','https://studio-intelligence-production.up.railway.app/pts/class-products','={{ {accountId:$json.accountId,studioId:$json.studioId,classId:$json.classId,...($json.documentGroupId?{roomId:$json.sourceRoomId}:{})} }}');
 code('Verify complete product source',`${lib}\nconst p=$input.first().json,t=$('Require manual product mapping').first().json,s=p.source;if(p.success!==true||p.accountId!==t.accountId||p.studioId!==t.studioId||s?.classId!==t.classId||s.studioCode!==t.studioCode||s.details?.roomId!==t.sourceRoomId||s.details?.locationLabel!==t.sourceLocationLabel||!t.allowedClassTypeIds.includes(s.details?.classTypeId))throw Error('Wrong product class source');${require('./scheduled-source.cjs').scheduledSourceGuard.toString()}\nscheduledSourceGuard(s.details,$('Product refresh input').first().json.scheduledStartAt);productSummary(s,t.productMapping);return [{json:s}];`);
 rpc('Claim private product refresh','claim_seating_product_refresh','={{ {p_target_id:$("Product run settings").first().json.targetId,p_run_id:$("Product run settings").first().json.runId,p_source:$json} }}');
 code('Require unfinished product run',`if($input.first().json.completed)return [];return $input.all();`);
 http('Check product Google identity','google','GET','https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
 code('Require product Google identity',`if($input.first().json.user?.emailAddress!==${JSON.stringify(studio.googleAccountEmail)})throw Error('Wrong product Google account');return [{json:{verified:true}}];`);
 http('Read product chart ownership','google','GET',`=https://www.googleapis.com/drive/v3/files/{{ $('Claim private product refresh').first().json.target.spreadsheetId }}?fields=id,mimeType,owners(emailAddress),capabilities(canEdit)`);
 code('Verify product chart ownership',`const t=$('Claim private product refresh').first().json.target,f=$input.first().json;if(f.id!==t.spreadsheetId||f.id===t.masterSpreadsheetId||f.mimeType!=='application/vnd.google-apps.spreadsheet'||f.capabilities?.canEdit!==true||!f.owners?.some(o=>o.emailAddress===t.googleAccountEmail))throw Error('Wrong product chart ownership');return [{json:{verified:true}}];`);
 const read=`=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Claim private product refresh').first().json.target.spreadsheetId }}?ranges={{ encodeURIComponent("'"+$('Claim private product refresh').first().json.target.sheetName.replace(/'/g,"''")+"'!A1:AC1000") }}&includeGridData=true&fields=spreadsheetId,sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(userEnteredValue,dataValidation))))`;
 http('Read chart before products','google','GET',read);
 code('Prepare immutable product plan',`${lib}\nconst run=$('Claim private product refresh').first().json,state=chartProductState($input.first().json,run.target);const plan=planProductWrites({source:run.source,mapping:run.target.productMapping,sheetName:run.target.sheetName,cells:state.cells,ledger:run.ledger,pending:run.plan});return [{json:{plan,before:state}}];`);
 rpc('Stage private product plan','stage_seating_product_refresh','={{ {p_run_id:$("Product run settings").first().json.runId,p_plan:$("Prepare immutable product plan").first().json.plan} }}');
 add('Product changes exist','n8n-nodes-base.if',{conditions:{options:{caseSensitive:true,typeValidation:'strict',version:2},combinator:'and',conditions:[{id:'product-write',leftValue:'={{ $("Prepare immutable product plan").first().json.plan.request.data.length > 0 }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}]},options:{}},null,2.2);
 http('Write mapped product cells','google','POST',`=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Claim private product refresh').first().json.target.spreadsheetId }}/values:batchUpdate`,'={{ $("Prepare immutable product plan").first().json.plan.request }}');
 http('Read chart after products','google','GET',read);
 code('Verify products and protected cells',`${lib}\nconst run=$('Claim private product refresh').first().json,after=chartProductState($input.first().json,run.target),p=$('Prepare immutable product plan').first().json;return [{json:verifyProductWrites({plan:p.plan,before:p.before.cells,after:after.cells,protectedBefore:p.before.protectedCells,protectedAfter:after.protectedCells})}];`);
 rpc('Complete private product refresh','complete_seating_product_refresh','={{ {p_run_id:$("Product run settings").first().json.runId,p_result:$json} }}');
 nodes.slice(0,-1).forEach((n,i)=>connections[n.name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]});
 connections['Product changes exist'].main[1]=[{node:'Read chart after products',type:'main',index:0}];
 return {name:'08 - Seating Charts - STM products refresh - HELPER',active:false,nodes,connections,settings:{executionOrder:'v1',timezone:studio.timeZone,saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false}};
}
function buildCombinedWorkflow({reservationWorkflowId,productWorkflowId}){
 const nodes=[{id:'input',name:'Combined class update input',type:'n8n-nodes-base.executeWorkflowTrigger',typeVersion:1,position:[0,0],parameters:{inputSource:'passthrough'}}];
 const call=(name,id)=>nodes.push({id:'combined-'+nodes.length,name,type:'n8n-nodes-base.executeWorkflow',typeVersion:1.2,position:[nodes.length*250,0],parameters:{source:'database',workflowId:{__rl:true,value:id,mode:'id'},workflowInputs:{mappingMode:'defineBelow',value:{},matchingColumns:[],schema:[],attemptToConvertTypes:false,convertFieldsToString:true},mode:'each',options:{waitForSubWorkflow:true}}});
 const code=(name,jsCode)=>nodes.push({id:'combined-'+nodes.length,name,type:'n8n-nodes-base.code',typeVersion:2,position:[nodes.length*250,0],parameters:{jsCode}});
 call('Refresh reservations and staff',reservationWorkflowId);
 code('Pass registered product target',`return [{json:{targetId:$('Combined class update input').first().json.targetId,scheduledStartAt:$('Combined class update input').first().json.scheduledStartAt}}];`);
 call('Refresh class product reservations',productWorkflowId);
 code('Combined verified class result',`return [{json:{reservations:$('Refresh reservations and staff').first().json,products:$input.first().json,scheduledUpdates:!!$('Combined class update input').first().json.scheduledStartAt}}];`);
 const connections={};nodes.slice(0,-1).forEach((n,i)=>connections[n.name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]});
 return {name:'09 - Seating Charts - STM combined class refresh - HELPER',active:false,nodes,connections,settings:{executionOrder:'v1',timezone:'America/New_York',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false}};
}
function buildManualProductWorkflow({productWorkflowId,targetId}){
 const w=buildCombinedWorkflow({reservationWorkflowId:'unused',productWorkflowId});
 w.name='07 - Seating Charts - STM products refresh - MANUAL TEST';
 w.nodes=w.nodes.filter(n=>!['Refresh reservations and staff','Combined verified class result'].includes(n.name));
 w.nodes[0].type='n8n-nodes-base.manualTrigger';w.nodes[0].parameters={};
 w.nodes.find(n=>n.name==='Pass registered product target').parameters.jsCode=`return [{json:{targetId:${JSON.stringify(targetId)}}}];`;
 w.connections={};w.nodes.slice(0,-1).forEach((n,i)=>w.connections[n.name]={main:[[{node:w.nodes[i+1].name,type:'main',index:0}]]});return w;
}
if(require.main===module){const studio=require('./stm-creation-settings.json'),ids=require('./stm-creation-workflows.json');
 for(const [name,w]of [['08-stm-product-refresh.json',buildProductWorkflow(studio)],['09-stm-combined-class-refresh.json',buildCombinedWorkflow({reservationWorkflowId:ids.reservationWorkflowId??'2T7XR2idkCmpE5dc',productWorkflowId:ids.productWorkflowId??'SAVE_PRODUCT_HELPER_FIRST'})],['07-stm-product-refresh-manual.json',buildManualProductWorkflow({productWorkflowId:ids.productWorkflowId??'SAVE_PRODUCT_HELPER_FIRST',targetId:'e28a9f46-373b-4eba-a221-15a1179e83ec'})]])fs.writeFileSync(path.join(__dirname,name),JSON.stringify(w,null,2)+'\n');
}
module.exports={productLibrary,buildProductWorkflow,buildCombinedWorkflow,buildManualProductWorkflow};
