const test=require('node:test'),assert=require('node:assert/strict');
const {selectAcquiredEvidence:f}=require('./evidence-claim-progress.cjs');
const jobs=['source','summary'].map(kind=>({json:{sourceMessageId:'receipt',kind,leaseToken:kind+'-token'}}));
test('a busy sibling never abandons successfully acquired work or changes its token',()=>{
 const out=f(jobs,[{json:{outcome:'busy'}},{json:{outcome:'acquired'}}]);
 assert.equal(out.length,1);assert.equal(out[0].json.kind,'summary');assert.equal(out[0].json.leaseToken,'summary-token');assert.deepEqual(out[0].pairedItem,{item:1});
 assert.equal(f(jobs,[{json:{outcome:'acquired'}},{json:{outcome:'busy'}}])[0].json.kind,'source');
});
test('only acquired files can continue; complete and uncertain uploads are not recreated',()=>{
 for(const status of ['busy','complete','reconcile_upload'])assert.throws(()=>f(jobs,[{json:{outcome:status}},{json:{outcome:status}}]),/No acquired/);
 assert.throws(()=>f(jobs,[{json:{outcome:'acquired'}}]),/count/);
 assert.throws(()=>f(jobs,[{json:{outcome:'acquired'}},{json:{outcome:'anything'}}]),/Unknown/);
 assert.equal(f(jobs,[{json:{data:[{outcome:'acquired'}]}},{json:{outcome:'complete'}}]).length,1);
});
