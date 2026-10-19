'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {scheduledSourceGuard}=require('./scheduled-source.cjs');
const {buildScheduleWorkflow,scheduledDiscovery}=require('./schedule-workflow.cjs');
const {creationPlan}=require('./creation.cjs');
const studio=require('./stm-creation-settings.json');
test('scheduled source requires actual published class time and stops after final grace',()=>{
 const details={isPublished:true,dateText:'Mon, 19 Oct 2026',startTimeText:'6:30 PM'},start='2026-10-19T22:30:00Z';
 assert.doesNotThrow(()=>scheduledSourceGuard(details,start,'2026-10-19T21:15:00Z'));
 assert.throws(()=>scheduledSourceGuard(details,start,'2026-10-19T21:21:00Z'));
 assert.throws(()=>scheduledSourceGuard({...details,isPublished:false},start,'2026-10-19T20:00:00Z'));
 assert.throws(()=>scheduledSourceGuard({...details,startTimeText:'7:00 PM'},start,'2026-10-19T20:00:00Z'));
 assert.doesNotThrow(()=>scheduledSourceGuard({},null));
});
test('dispatcher compiles, has one-minute clock, waits for preserved helpers, and audits both error branches',()=>{
 const w=buildScheduleWorkflow({groupWorkflowId:'group',combinedWorkflowId:'combined'});
 assert.equal(w.active,false);assert.equal(w.settings.timezone,'America/New_York');
 assert.deepEqual(w.nodes.find(n=>n.type.endsWith('scheduleTrigger')).parameters.rule.interval,[{field:'minutes',minutesInterval:1}]);
 for(const n of w.nodes){if(n.parameters.jsCode)assert.doesNotThrow(()=>new Function(n.parameters.jsCode));
  if(n.type.endsWith('executeWorkflow')){assert.equal(n.parameters.options.waitForSubWorkflow,true);assert.equal(n.onError,'continueErrorOutput');assert.equal(w.connections[n.name].main[1][0].node,'Record scheduled failure for review');}
 }
 assert.equal(w.nodes.filter(n=>n.type.endsWith('executeWorkflow')).length,2);
 assert.ok(w.nodes.every(n=>!n.credentials?.googleDriveOAuth2Api)); // all writes stay in existing bounded helpers
});
test('discovery never recopies existing groups, accepts JSONB key order, and holds changed overlap membership',()=>{
 const e={classId:'999',sourceRoomId:'21',classTypeId:'100',isPrivate:false,startAt:'2026-10-20T22:00:00Z',endAt:'2026-10-21T00:00:00Z',roomLabel:'Main',timeZone:studio.timeZone};
 const group={groupKey:'test',title:'Example',startAt:e.startAt,events:[e]},planned={groups:[group],review:[]},now='2026-10-19T20:00:00Z';
 const plan=creationPlan(group,studio),reorder=x=>Array.isArray(x)?x.map(reorder):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).reverse().map(([k,v])=>[k,reorder(v)])):x;
 assert.equal(scheduledDiscovery(planned,[],studio,now).groups.length,1);
 assert.deepEqual(scheduledDiscovery(planned,[{groupKey:'test',plan:reorder(plan),state:'ready'}],studio,now),{groups:[],review:[]});
 assert.equal(scheduledDiscovery(planned,[{groupKey:'changed',plan}],studio,now).review[0].reason,'overlap-membership-changed');
 assert.equal(scheduledDiscovery(planned,[],studio,'2026-10-20T21:00:00Z').groups.length,0);
});
