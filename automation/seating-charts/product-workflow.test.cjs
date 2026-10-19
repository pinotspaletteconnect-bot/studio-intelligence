'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {buildProductWorkflow,buildCombinedWorkflow,buildManualProductWorkflow}=require('./product-workflow.cjs');
const {chartProductState}=require('./product-writes.cjs'),studio=require('./stm-creation-settings.json');
test('product workflows compile, remain manual/called-only, and wait for saved child helpers',()=>{
 for(const w of [buildProductWorkflow(studio),buildCombinedWorkflow({reservationWorkflowId:'guest',productWorkflowId:'products'}),buildManualProductWorkflow({productWorkflowId:'products',targetId:'synthetic-target'})]){
  assert.equal(w.active,false);assert.ok(w.nodes.every(n=>!(/scheduleTrigger|webhook/.test(n.type))));
  for(const n of w.nodes){if(n.parameters.jsCode)assert.doesNotThrow(()=>new Function(n.parameters.jsCode));
   for(const v of Object.values(n.parameters))if(typeof v==='string'&&v.startsWith('='))for(const m of v.matchAll(/\{\{([\s\S]*?)\}\}/g))assert.doesNotThrow(()=>new Function('return ('+m[1]+')'),n.name);
   if(n.type.endsWith('.executeWorkflow')){assert.equal(n.parameters.options.waitForSubWorkflow,true);assert.deepEqual(n.parameters.workflowInputs.value,{});assert.deepEqual(n.parameters.workflowInputs.schema,[]);}
  }
 }
});
test('chart protection covers seating, reservation imports, attendance and validation; only six product literals are excluded',()=>{
 const target={sheetId:123,sheetName:'Class',classId:'456',productMapping:studio.productReservations.templates['0']};
 const rows=Array.from({length:1000},()=>({values:[]}));rows[4].values[17]={userEnteredValue:{numberValue:456}};
 rows[0].values[19]={userEnteredValue:{stringValue:'seat'}};rows[0].values[20]={userEnteredValue:{formulaValue:'=guest()'}};rows[0].values[27]={userEnteredValue:{boolValue:true}};
 rows[24].values[9]={userEnteredValue:{stringValue:'Example (1)'},dataValidation:{condition:{type:'TEXT_CONTAINS',values:[{userEnteredValue:'Example'}]}}};
 const doc={sheets:[{properties:{sheetId:123,title:'Class'},data:[{rowData:rows}]}]},before=chartProductState(doc,target);
 const changed=structuredClone(doc);changed.sheets[0].data[0].rowData[24].values[9].userEnteredValue={stringValue:'Example (2)'};
 assert.deepEqual(chartProductState(changed,target).protectedCells,before.protectedCells);
 changed.sheets[0].data[0].rowData[24].values[9].dataValidation={condition:{type:'BOOLEAN'}};
 assert.notDeepEqual(chartProductState(changed,target).protectedCells,before.protectedCells);
 const wrong=structuredClone(doc);wrong.sheets[0].data[0].rowData[4].values[17].userEnteredValue={numberValue:999};assert.throws(()=>chartProductState(wrong,target));
});

test('combined update passes a verified product reference to guests and still refreshes guests after a product failure',()=>{
 const w=buildCombinedWorkflow({reservationWorkflowId:'guest',productWorkflowId:'products'}),prepare=w.nodes.find(n=>n.name==='Prepare guest input from products'),finish=w.nodes.find(n=>n.name==='Combined verified class result');
 const input={targetId:'target',scheduledStartAt:'2026-10-23T23:00:00Z'},product={productRunId:'stm-products-1',protectedCellsUnchanged:true};
 const compiled=new Function('$input','$',prepare.parameters.jsCode);
 const good=compiled({first:()=>({json:product})},()=>({first:()=>({json:input})}))[0].json;assert.equal(good.productRunId,product.productRunId);assert.equal(good.productFailed,false);
 const failed=compiled({first:()=>({json:{error:'safe source failure'}})},()=>({first:()=>({json:input})}))[0].json;assert.equal(failed.productFailed,true);assert.equal(failed.targetId,'target');assert.equal(failed.productRunId,undefined);
 assert.equal(w.connections['Refresh class product reservations'].main[1][0].node,prepare.name);
 assert.throws(()=>new Function('$input','$',finish.parameters.jsCode)({first:()=>({json:{seatingUnchanged:true}})},()=>({first:()=>({json:failed})})),/reservations and staff refreshed/);
});
