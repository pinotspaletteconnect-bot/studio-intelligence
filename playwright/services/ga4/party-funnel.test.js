const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildFunnelRequest, runPartyFunnel } = require('./party-funnel');
const { exportPeriodRows, parseFunnelResponse } = require('../../../automation/ga4/party-funnel.cjs');
const options = { startDate: '2026-11-09', endDate: '2026-11-15', pathPrefix: '/louisville/parties' };
test('closed indirect sequential period request with exact and prefix paths', () => {
  const request = buildFunnelRequest(options);
  assert.deepEqual(request.dateRanges, [{ startDate: options.startDate, endDate: options.endDate }]);
  assert.equal(request.funnel.isOpenFunnel, false);
  assert.equal(request.funnel.steps.length, 6);
  assert.deepEqual(request.dimensionFilter, { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'United States', caseSensitive: true } } });
  assert.equal(request.segments, undefined);
  for (const step of request.funnel.steps) {
    assert.equal(step.isDirectlyFollowedBy, false);
    assert.equal(step.withinDurationFromPriorStep, undefined);
    assert.equal(step.filterExpression.andGroup.expressions[0].funnelEventFilter.eventName, 'page_view');
    assert.equal(step.filterExpression.andGroup.expressions[1].funnelFieldFilter.fieldName, 'pagePathPlusQueryString');
  }
  const filters = request.funnel.steps.map(step => step.filterExpression.andGroup.expressions[1].funnelFieldFilter.stringFilter);
  assert.equal(filters[0].value, '^/louisville/parties/packages(\\?.*)?$');
  assert.equal(filters[0].matchType, 'FULL_REGEXP');
  assert.equal(filters[4].matchType, 'BEGINS_WITH');
  assert.equal(filters[5].value, '/louisville/parties/confirmation/');
});
test('supported exploration dimension preserves exact paths while ignoring optional query strings', () => {
  for (const variant of ['core', 'addons', 'inquiry']) {
    const request = buildFunnelRequest({ ...options, variant });
    assert.equal(request.dimensionFilter.filter.stringFilter.value, 'United States');
    const steps = request.funnel.steps;
    for (const step of steps) {
      const { fieldName, stringFilter } = step.filterExpression.andGroup.expressions[1].funnelFieldFilter;
      assert.equal(fieldName, 'pagePathPlusQueryString');
      if (stringFilter.matchType === 'FULL_REGEXP') {
        const path = `${options.pathPrefix}/${step.name}`;
        const matches = new RegExp(stringFilter.value);
        for (const value of [path, `${path}?`, `${path}?utm_source=synthetic&x=1`]) assert.equal(matches.test(value), true);
        for (const value of [`${path}/`, `${path}/child`, `${path}other`, `${path.toUpperCase()}`, `${path}#fragment`, `/other${path}`]) assert.equal(matches.test(value), false);
      } else {
        assert.equal(stringFilter.matchType, 'BEGINS_WITH');
        assert.equal(stringFilter.value, `${options.pathPrefix}/${step.name}/`);
      }
    }
  }
});
test('variants preserve order and inquiry is only page reached', () => {
  const addons = buildFunnelRequest({ ...options, variant: 'addons' });
  assert.deepEqual(addons.funnel.steps.map(step => step.name), ['packages', 'eventdetails', 'choosedate', 'addons', 'contact', 'checkout', 'confirmation']);
  assert.deepEqual(buildFunnelRequest({ ...options, variant: 'inquiry' }).funnel.steps.map(step => step.name), ['packages', 'contactform']);
});
test('invalid configuration and dates fail before network', () => {
  for (const change of [{ pathPrefix: 'https://example.com' }, { variant: 'unknown' }, { startDate: '2026-02-30' }, { endDate: '2026-01-01' }]) assert.throws(() => buildFunnelRequest({ ...options, ...change }));
});
test('adapter sends one whole-period request and sanitizes permission errors', async () => {
  let calls = 0;
  await assert.rejects(runPartyFunnel({ ...options, propertyId: '354847068', accessToken: 'test-token' }, async (url, init) => {
    calls++;
    assert.equal(url, 'https://analyticsdata.googleapis.com/v1alpha/properties/354847068:runFunnelReport');
    assert.equal(JSON.parse(init.body).dateRanges.length, 1);
    return { ok: false, status: 403 };
  }), { message: 'GA4 funnel permission denied' });
  assert.equal(calls, 1);
});
test('adapter preserves raw source metadata for ETL validation', async () => {
  const result = { funnelTable: { rows: [] }, propertyQuota: {} };
  assert.deepEqual(await runPartyFunnel({ ...options, propertyId: '354847068', accessToken: 'test-token' }, async () => ({ ok: true, json: async () => result })), result);
});
test('private period export calculates next-step rates without infinite or terminal outcomes', () => {
  const input = { ...options, comparisonType: 'selected', activeUsers: [10, 8, 5, 3, 0, 0] };
  const rows = exportPeriodRows(input);
  assert.equal(rows[0].completionRate, 0.8);
  assert.equal(rows[0].abandonment, 2);
  assert.equal(rows[4].completionRate, null);
  assert.equal(rows[5].abandonment, null);
  assert.throws(() => exportPeriodRows({ ...input, activeUsers: [1, 2, 0, 0, 0, 0] }));
  assert.throws(() => exportPeriodRows({ ...input, activeUsers: [10, 8] }));
});
const parseOptions = { ...options, comparisonType: 'selected' };
const fixture = (counts = [10, 8, 5, 3, 1, 1]) => ({ funnelTable: {
  dimensionHeaders: [{ name: 'funnelStepName' }],
  metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }],
  rows: ['packages', 'eventdetails', 'choosedate', 'contact', 'checkout', 'confirmation'].map((name, index) => ({ dimensionValues: [{ value: `${index + 1}. ${name}` }], metricValues: [{ value: String(counts[index]) }] })),
  metadata: {},
} });
test('real API-shaped headers map steps and users into period rows', () => {
  const result = parseFunnelResponse(fixture(), parseOptions);
  assert.equal(result.status, 'available');
  assert.equal(result.rows[0].activeUsers, 10);
  assert.equal(result.rows[0].abandonment, 2);
  assert.equal(result.rows[5].stepName, 'confirmation');
});
test('missing, malformed, duplicate and increasing steps fail closed', () => {
  for (const mutate of [r => r.funnelTable.rows.pop(), r => r.funnelTable.rows.push(r.funnelTable.rows[0]), r => { r.funnelTable.rows[0].dimensionValues[0].value = '1. wrong'; }, r => { r.funnelTable.rows[0].metricValues[0].value = '-1'; }, r => { r.funnelTable.rows[1].metricValues[0].value = '99'; }, r => { r.funnelTable.metricHeaders[0].name = 'totalUsers'; }]) {
    const response = fixture(); mutate(response);
    assert.equal(parseFunnelResponse(response, parseOptions).status, 'unavailable');
  }
});
test('device breakdown requires unique RESERVED_TOTAL rows and never sums devices', () => {
  const response = fixture();
  response.funnelTable.dimensionHeaders.push({ name: 'deviceCategory' });
  response.funnelTable.rows.forEach(row => row.dimensionValues.push({ value: 'RESERVED_TOTAL' }));
  const deviceRows = structuredClone(response.funnelTable.rows);
  deviceRows.forEach(row => { row.dimensionValues[1].value = 'mobile'; row.metricValues[0].value = '1'; });
  response.funnelTable.rows.push(...deviceRows);
  assert.equal(parseFunnelResponse(response, parseOptions).rows[0].activeUsers, 10);
  response.funnelTable.rows.push(deviceRows[0]);
  assert.equal(parseFunnelResponse(response, parseOptions).status, 'unavailable');
  response.funnelTable.rows = deviceRows;
  assert.equal(parseFunnelResponse(response, parseOptions).reason, 'missing_steps_or_totals');
});
test('explicit complete zero rows differ from empty, sampled and thresholded reports', () => {
  assert.equal(parseFunnelResponse(fixture([0, 0, 0, 0, 0, 0]), parseOptions).status, 'available');
  const empty = fixture(); empty.funnelTable.rows = [];
  assert.equal(parseFunnelResponse(empty, parseOptions).reason, 'no_rows');
  for (const metadata of [{ samplingMetadatas: [{ samplesReadCount: '5', samplingSpaceSize: '10' }] }, { subjectToThresholding: true }, { emptyReason: 'NO_DATA' }, { dataLossFromOtherRow: true }]) {
    const response = fixture(); response.funnelTable.metadata = metadata;
    assert.equal(parseFunnelResponse(response, parseOptions).reason, 'limited_source_data');
  }
});
const observed = require('../../../automation/ga4/fixtures/observed-core-20261019-20261115.json');
test('observed alpha duplicate-identical header blocks yield actual full-period core counts', () => {
  const result = parseFunnelResponse(observed.response, { ...parseOptions, ...observed.period });
  assert.equal(result.status, 'available');
  assert.deepEqual(result.rows.map(row => row.activeUsers), [51, 22, 13, 11, 11, 5]);
  assert.equal(result.rows[0].completionRate, 22 / 51);
  assert.equal(result.rows[0].abandonment, 29);
  assert.equal(result.rows[5].completionRate, null);
  assert.equal(result.quality.thresholded, null);
});
test('header redundancy support rejects mixed, partial, ambiguous and nonuniform blocks', () => {
  const mutateCases = [
    r => { r.funnelTable.metricHeaders[4].name = 'totalUsers'; },
    r => { r.funnelTable.metricHeaders[4].type = 'TYPE_FLOAT'; },
    r => { r.funnelTable.metricHeaders.pop(); },
    r => { r.funnelTable.metricHeaders.push(...r.funnelTable.metricHeaders.slice(0, 4)); },
    r => { r.funnelTable.rows[0].metricValues.pop(); },
    r => { r.funnelTable.metricHeaders[1] = { ...r.funnelTable.metricHeaders[0] }; r.funnelTable.metricHeaders[5] = { ...r.funnelTable.metricHeaders[4] }; },
  ];
  for (const mutate of mutateCases) {
    const response = structuredClone(observed.response); mutate(response);
    assert.equal(parseFunnelResponse(response, { ...parseOptions, ...observed.period }).status, 'unavailable');
  }
});
test('observed successful prior-period headers without rows remain unavailable rather than zero', () => {
  // Parent observed Sep21-Oct18 responses with headers/metadata only; do not
  // fabricate source rows or infer that successful transport proves coverage.
  const response = {
    funnelTable: { dimensionHeaders: structuredClone(observed.response.funnelTable.dimensionHeaders), metricHeaders: structuredClone(observed.response.funnelTable.metricHeaders), metadata: {} },
    funnelVisualization: { dimensionHeaders: [{ name: 'funnelStepName' }], metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }, { name: 'activeUsers', type: 'TYPE_INTEGER' }], metadata: {} },
  };
  const result = parseFunnelResponse(response, { ...parseOptions, startDate: '2026-09-21', endDate: '2026-10-18' });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'no_rows');
  assert.deepEqual(result.rows, []);
  assert.equal(result.quality.thresholded, null);
});
