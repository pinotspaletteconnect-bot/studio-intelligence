const{test}=require('node:test'),assert=require('node:assert/strict'),{assessExecutions}=require('./dataset-freshness.cjs');const feed={id:'products',label:'Product sales',workflowId:'prod123',deadlineMinute:660};const good=(change={})=>({id:'123',workflowId:'prod123',mode:'trigger',status:'success',finished:true,startedAt:'2026-10-15T12:00:00Z',stoppedAt:'2026-10-15T13:00:00Z',...change});const response=(data=[],nextCursor=null)=>({statusCode:200,body:{data,nextCursor}});const base={catalog:[feed],today:'2026-10-15',minuteOfDay:700,localDate:s=>s.slice(0,10),executions:{products:response()}};function run(r=response(),change={},state={}){return assessExecutions({...base,executions:{products:r},...change},state)[0];}
test('missing completion after deadline alerts',()=>assert.equal(run().action,'alert'));
test('before deadline stays quiet',()=>assert.equal(run(response(),{minuteOfDay:500}).action,'quiet'));
test('successful empty import is healthy without source rows',()=>assert.equal(run(response([good()])).action,'quiet'));
test('manual test cannot prove production health',()=>assert.equal(run(response([good({mode:'manual'})])).action,'alert'));
test('old scheduled completion is stale',()=>assert.equal(run(response([good({stoppedAt:'2026-10-14T13:00:00Z'})])).action,'alert'));
test('unfinished success cannot prove completion',()=>assert.equal(run(response([good({finished:false})])).action,'alert'));
test('failed newest import alerts immediately',()=>assert.equal(run(response([good({status:'error',finished:false})]),{minuteOfDay:0}).action,'alert'));
test('running import before deadline is allowed',()=>assert.equal(run(response([good({status:'running',finished:false,stoppedAt:null})]),{minuteOfDay:500}).action,'quiet'));
test('running after deadline does not conceal missing completed refresh',()=>assert.equal(run(response([good({status:'running',finished:false,stoppedAt:null})])).action,'alert'));
test('success after failure recovers',()=>assert.equal(run(response([good()]),{}, {feeds:{products:{issue:'failed',failedAt:'2026-10-15T12:00:00Z'}}}).action,'recovered'));
test('success before newer failure cannot clear issue',()=>assert.equal(run(response([good()]),{}, {feeds:{products:{issue:'failed',failedAt:'2026-10-15T14:00:00Z'}}}).action,'quiet'));
test('repeated issue remains quiet',()=>assert.equal(run(response(),{}, {feeds:{products:{issue:'stale',notifiedAt:'2026-10-15T12:00:00Z'}}}).action,'quiet'));
test('different workflow cannot prove health',()=>assert.equal(run(response([good({workflowId:'other'})])).action,'alert'));
test('wrong or malformed timestamp fails closed',()=>assert.equal(run(response([good({stoppedAt:'bad'})])).action,'alert'));
test('unavailable history generates an alert',()=>assert.equal(run({statusCode:401}).action,'alert'));
test('pagination cannot conceal missing completed imports',()=>assert.equal(run(response([good({mode:'manual'})],'cursor'),{minuteOfDay:0}).action,'alert'));
test('unknown immediate errors ignored',()=>assert.equal(assessExecutions({...base,kind:'error',failedWorkflowId:'other'}).length,0));
test('known immediate errors alert',()=>assert.equal(run(response(),{kind:'error',failedWorkflowId:'prod123',minuteOfDay:0}).action,'alert'));
test('API responses with execution contents are not required',()=>assert.equal(run(response([good()])).successAt,'2026-10-15T13:00:00Z'));

test('completion date uses Eastern midnight',()=>{const {easternDate}=require('./dataset-freshness.cjs');assert.equal(easternDate('2026-10-15T02:00:00Z'),'2026-10-14');assert.equal(easternDate('2026-10-15T05:00:00Z'),'2026-10-15');});
test('Eastern daylight saving transition remains correct',()=>{const {easternDate}=require('./dataset-freshness.cjs');assert.equal(easternDate('2026-11-02T04:30:00Z'),'2026-11-01');assert.equal(easternDate('2026-11-02T05:30:00Z'),'2026-11-02');});
