const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePeriodBundle } = require('./party-funnel.cjs');
const { buildFunnelRequest } = require('../../playwright/services/ga4/party-funnel');
const { workflow } = require('./build-party-workflow.cjs');
const config = { studioId: '1', propertyId: '354847068', pathPrefix: '/louisville/parties' };
const period = { startDate: '2026-11-09', endDate: '2026-11-15' };
function fixture() {
  const source = {};
  for (const variant of ['core', 'addons', 'inquiry']) source[variant] = { funnelTable: { dimensionHeaders: [{ name: 'funnelStepName' }], metricHeaders: [{ name: 'activeUsers' }], rows: buildFunnelRequest({ ...period, ...config, variant }).funnel.steps.map((step, i) => ({ dimensionValues: [{ value: `${i + 1}. ${step.name}` }], metricValues: [{ value: String(20 - i) }] })) } };
  const reach = dimensions => ({ dimensionHeaders: dimensions.map(name => ({ name })), metricHeaders: [{ name: 'screenPageViews' }, { name: 'totalUsers' }], rows: [{ dimensionValues: dimensions.map(() => ({ value: 'test' })), metricValues: [{ value: '50' }, { value: '20' }] }], rowCount: 1 });
  return { success: true, definitionVersion: 2, geography: 'US', target: { studio_id: 1, property_id: config.propertyId }, pathPrefix: config.pathPrefix, period, source, reach: { total: reach([]), device: reach(['deviceCategory']), sourceMedium: reach(['sessionSource', 'sessionMedium']) }, retrievedAt: '2026-11-16T13:00:00Z' };
}
test('source-shaped period bundle normalizes to stored report and private Looker rows', () => {
  const result = normalizePeriodBundle(fixture(), config);
  assert.equal(result.status, 'available');
  assert.equal(result.report.routes.addons.length, 7);
  assert.deepEqual(result.report.reach, { views: 50, periodUniqueUsers: 20 });
  assert.equal(result.lookerRows.length, 15);
  assert.equal(result.report.historyVerified, false);
  assert.equal(result.report.definitionVersion, 2);
  assert.equal(result.report.geography, 'US');
  assert.ok(result.lookerRows.every(row => row.definitionVersion === 2 && row.geography === 'US'));
});
test('mismatched mapping, limited funnels and malformed reach fail honestly', () => {
  assert.throws(() => normalizePeriodBundle(fixture(), { ...config, studioId: '2' }));
  const limited = fixture(); limited.source.core.funnelTable.metadata = { samplingMetadatas: [{}] };
  assert.equal(normalizePeriodBundle(limited, config).status, 'unavailable');
  const partial = fixture(); partial.reach.total.rowCount = 3;
  assert.equal(normalizePeriodBundle(partial, config).report.reach, null);
  const missingReach = fixture(); delete missingReach.reach;
  assert.equal(normalizePeriodBundle(missingReach, config).report.reach, null);
  assert.throws(() => normalizePeriodBundle({ ...fixture(), definitionVersion: 1, geography: 'all' }, config));
  assert.throws(() => normalizePeriodBundle({ ...fixture(), geography: 'all' }, config));
  const legacy = fixture(); delete legacy.geography;
  assert.throws(() => normalizePeriodBundle(legacy, config));
});
test('n8n review artifact is inactive, has no schedules or credentials, and embeds runnable normalization', () => {
  assert.equal(workflow.active, false);
  assert.ok(workflow.nodes.filter(n => n.type.includes('httpRequest')).every(n => n.disabled));
  assert.ok(!JSON.stringify(workflow).includes('refresh_token'));
  const normalize = workflow.nodes.find(n => n.id === 'normalize').parameters.jsCode;
  assert.ok(!normalize.includes('require('));
  const execute = new Function('$', '$input', normalize);
  const rows = execute(() => ({ first: () => ({ json: config }) }), { first: () => ({ json: fixture() }) });
  assert.equal(rows[0].json.studio_id, 1);
  assert.equal(rows[0].json.report.routes.core[0], 20);
});
test('embedded n8n normalization accepts the observed alpha header redundancy without runtime imports', () => {
  const observed = require('./fixtures/observed-core-20261019-20261115.json');
  const bundle = fixture();
  bundle.period = observed.period;
  bundle.source.core = observed.response.funnelTable ? observed.response : null;
  const execute = new Function('$', '$input', workflow.nodes.find(n => n.id === 'normalize').parameters.jsCode);
  const result = execute(() => ({ first: () => ({ json: config }) }), { first: () => ({ json: bundle }) });
  assert.deepEqual(result[0].json.report.routes.core, [51, 22, 13, 11, 11, 5]);
});
test('approved operational loader remains manual with verified disabled target and parameterized disabled INSERT', () => {
  const { workflow: operational } = require('./build-controlled-load.cjs');
  assert.equal(operational.active, false);
  assert.ok(!operational.nodes.some(node => node.type.toLowerCase().includes('schedule')));
  const target = operational.nodes.find(node => node.name === 'Approved target and period');
  assert.ok(target.parameters.query.includes("c.property_id='354847068'"));
  assert.ok(target.parameters.query.includes('c.enabled=false'));
  const loader = operational.nodes.at(-1);
  assert.equal(loader.disabled, true);
  assert.ok(loader.parameters.query.includes('$9::jsonb'));
  assert.ok(loader.parameters.query.includes('do nothing'));
  assert.ok(!JSON.stringify(operational).includes('refresh_token'));
  const bundle = fixture();
  const execute = new Function('$', '$input', operational.nodes.find(node => node.id === 'normalize').parameters.jsCode);
  const result = execute(() => ({ first: () => ({ json: config }) }), { first: () => ({ json: bundle }) });
  assert.equal(result[0].json.definition_version, 2);
  assert.equal(result[0].json.geography, 'US');
});
