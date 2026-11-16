const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
function run(file, items, nodes = {}) {
  const code = fs.readFileSync(path.join(__dirname, '../../automation/eulerity-recovery', file), 'utf8');
  return new Function('$input', '$', '$now', code)(
    { all: () => items.map(json => ({ json })) },
    name => ({ all: () => (nodes[name] || []).map(json => ({ json })) }),
    { setZone: zone => { assert.equal(zone, 'America/New_York'); return { minus: () => ({ toISODate: () => '2026-11-15' }) }; } }
  );
}
const mappings = [{ account_id: 1, studio_id: 11, selector_key: 'id' }, { account_id: 2, studio_id: 22, selector_key: 'id' }];
const nodes = { 'List Eulerity Accounts': [{ account_id: 1 }, { account_id: 2 }], 'Snapshot Expected Eulerity Targets': mappings };
test('discovery guard rejects no-op and action-only discovery before sync', () => {
  const valid = id => ({ success: true, accountId: id, locations: [{ sourceKey: 'id', displayName: 'Studio' }] });
  assert.equal(run('validate-discovery.js', [valid(1), valid(2)], nodes).length, 2);
  for (const input of [[], [valid(1)], [{ ...valid(1), locations: [] }, valid(2)], [{ ...valid(1), locations: [{ sourceKey: 'label:bulk delete', displayName: 'Bulk Delete' }] }, valid(2)]]) assert.throws(() => run('validate-discovery.js', input, nodes), /Eulerity/);
});
test('target guard requires exact expected account/studio mappings', () => {
  assert.equal(run('collect-mapped-accounts.js', mappings, nodes).length, 2);
  for (const input of [[], [{}], [mappings[0]], [mappings[0], mappings[0]], [mappings[0], { account_id: 2, studio_id: 99 }]]) assert.throws(() => run('collect-mapped-accounts.js', input, nodes), /Eulerity/);
});
test('result guard rejects empty metrics and omitted studios', () => {
  const result = (a, s) => ({ success: true, accountId: a, studioCount: 1, results: [{ studioId: s, metrics: [{ report_date: '2026-11-09' }], spend: [{ report_date: '2026-11-09', spend: 0 }] }] });
  assert.equal(run('validate-results.js', [result(1, 11), result(2, 22)], nodes).length, 2);
  for (const input of [[], [result(1, 11)], [{ ...result(1, 11), results: [] }], [{ ...result(1, 11), results: [{ studioId: 11, metrics: [], spend: [] }] }, result(2, 22)]]) assert.throws(() => run('validate-results.js', input, nodes), /Eulerity/);
});
test('recovery excludes earlier dates and today; preserves allowed records', () => {
  const input = ['2026-11-08', '2026-11-09', '2026-11-15', '2026-11-16'].map(report_date => ({ report_date, studio_id: 1, spend_total: 5 }));
  assert.deepEqual(run('bound-recovery-dates.js', input).map(i => i.json), input.slice(1, 3));
  assert.throws(() => run('bound-recovery-dates.js', [input[0]]), /no metrics/);
  assert.throws(() => run('bound-recovery-dates.js', [{ studio_id: 5, report_date: '2026-11-09' }]), /outside approved/);
  assert.throws(() => run('bound-recovery-dates.js', [{ studio_id: 1, report_date: '2026-02-30' }]), /invalid report date/);
});

test('recovery scope rejects HB and incomplete approved mapping sets', () => {
  const approved = { 'Snapshot Expected Eulerity Targets': [1, 2, 3, 4].map(studio_id => ({ account_id: 1, studio_id, organization_id: 1, integration_id: studio_id + 5, selector_key: `key-${studio_id}` })) };
  assert.equal(run('validate-recovery-scope.js', [{ account_id: 1 }], approved).length, 1);
  assert.throws(() => run('validate-recovery-scope.js', [{ account_id: 2 }], approved), /four approved/);
  assert.throws(() => run('validate-recovery-scope.js', [{ account_id: 1 }], nodes), /four approved/);
});

 test('discovery blocks sync when a configured source key is absent or changed', () => {
  const baseline = { 'List Eulerity Accounts': [{ account_id: 1 }], 'Snapshot Expected Eulerity Targets': [
    { account_id: 1, studio_id: 1, selector_key: 'source-a' },
    { account_id: 1, studio_id: 2, selector_key: 'source-b' }
  ] };
  const a = { sourceKey: 'source-a', displayName: 'Alpha' };
  const b = { sourceKey: 'source-b', displayName: 'Beta' };
  assert.equal(run('validate-discovery.js', [{ success: true, accountId: 1, locations: [a, b] }], baseline).length, 1);
  for (const locations of [[a], [a, { ...b, sourceKey: 'changed-source' }]]) {
    assert.throws(() => run('validate-discovery.js', [{ success: true, accountId: 1, locations }], baseline), /synchronization blocked/);
  }
});
const { build } = require('../../automation/eulerity-recovery/build-dry-run.cjs');
test('dry-run builder preserves disabled pass-through transformations and disconnects all writes', () => {
  const names = ['Manual', 'List Eulerity Accounts', 'Discover Eulerity Locations', 'Sync Eulerity Locations', 'Accounts After Discovery', 'List Mapped Eulerity Targets', 'Collect Each Mapped Account Once', 'Railway', 'Split by studio', 'Split by Metric', 'Transform Advertising Metrics', 'Expand Daily Metrics', 'Attach Studio ID', 'Upsert Eulerity Dialy Metrics'];
  const source = { id: 'original', active: false, versionId: 'verified', settings: {}, nodes: names.map((name, index) => ({ name, id: String(index), type: name === 'Manual' ? 'n8n-nodes-base.manualTrigger' : 'n8n-nodes-base.code', position: [0,0], parameters: name === 'List Eulerity Accounts' ? { url: 'https://example.test/rest/v1/eulerity_collection_accounts' } : { jsCode: `original ${name}` }, credentials: { test: { id: 'unchanged-reference' } }, disabled: ['Split by Metric','Transform Advertising Metrics'].includes(name) })), connections: Object.fromEntries(names.slice(0,-1).map((name,i) => [name,{main:[[{node:names[i+1],type:'main',index:0}]]}])) };
  source.nodes.find(n=>n.name==='Discover Eulerity Locations').parameters.url='https://example.test/eulerity/discover';
  source.nodes.find(n=>n.name==='Railway').parameters.url='https://example.test/eulerity/download';
  source.nodes.push({name:'Schedule Trigger',type:'n8n-nodes-base.scheduleTrigger',parameters:{}});
  const { workflow, manifest } = build(source);
  assert.equal(manifest.disabledPassThroughPreserved, true);
  assert.equal(manifest.sourceSyncReachable, false);
  assert.equal(manifest.warehouseUpsertReachable, false);
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes.find(n=>n.name==='Discover Eulerity Locations').parameters.url,'https://example.test/eulerity/account1-recovery/discover');
  assert.equal(workflow.nodes.find(n=>n.name==='Railway').parameters.url,'https://example.test/eulerity/account1-recovery/download');
  for (const name of ['Split by Metric','Transform Advertising Metrics']) {
    const node = workflow.nodes.find(n => n.name === name);
    assert.equal(node.disabled, true);
    assert.deepEqual(node.parameters, source.nodes.find(n => n.name === name).parameters);
  }
  // n8n disabled nodes pass each studio item through; dormant metric/channel
  // code is not run before Expand Daily Metrics consumes studio arrays.
  const studio = { studioId: 1, metrics: [{report_date:'2026-11-09'}], spend: [{report_date:'2026-11-09',spend:5}], budget: [] };
  let items = [{json:studio}];
  for (const name of ['Split by Metric','Transform Advertising Metrics']) {
    const node = workflow.nodes.find(n => n.name === name);
    if (!node.disabled) throw new Error('Dormant transformation must not execute');
  }
  assert.equal(items[0].json, studio);
  assert.equal(items[0].json.metrics.length,1);
});
