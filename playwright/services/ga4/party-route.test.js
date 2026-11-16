const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const credentialsPath = require.resolve('../ga4Credentials');
const apiPath = require.resolve('../ga4Api');
const funnelPath = require.resolve('./party-funnel');
const original = [credentialsPath, apiPath, funnelPath].map(path => require.cache[path]);
let sourceCalls = 0; let mapped = true; let denied = false;
require.cache[credentialsPath] = { exports: { resolveGa4Account: async () => ({ credentials: { mock: true }, targets: mapped ? [{ studio_id: 1, property_id: '354847068' }] : [] }) } };
require.cache[apiPath] = { exports: { discoverGa4Properties: async () => [], accessToken: async () => 'mock-token', runGa4Report: async (_credentials, _id, request) => { sourceCalls++; assert.equal(request.dimensions.some(d => d.name === 'date'), false); assert.deepEqual(request.dimensionFilter.andGroup.expressions[1], { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'United States', caseSensitive: true } } }); return { rows: [] }; } } };
const { buildFunnelRequest } = require('./party-funnel');
require.cache[funnelPath] = { exports: { buildFunnelRequest, runPartyFunnel: async () => { sourceCalls++; if (denied) throw new Error('GA4 funnel permission denied'); return { funnelTable: { rows: [] } }; } } };
const router = require('../../routes/ga4');
const handlers = router.stack.find(layer => layer.route?.path === '/party-funnel/:accountId/:propertyId').route.stack;
const previousToken = process.env.COLLECTOR_API_TOKEN;
process.env.COLLECTOR_API_TOKEN = 'mock-test-token';
after(() => { if (previousToken === undefined) delete process.env.COLLECTOR_API_TOKEN; else process.env.COLLECTOR_API_TOKEN = previousToken; [credentialsPath, apiPath, funnelPath].forEach((path, i) => { if (original[i]) require.cache[path] = original[i]; else delete require.cache[path]; }); });
async function call(authorization = 'Bearer mock-test-token') {
  const req = { body: { startDate: '2026-11-09', endDate: '2026-11-15', pathPrefix: '/louisville/parties' }, params: { accountId: '1', propertyId: '354847068' }, get: () => authorization };
  const response = { code: 200, body: null, status(code) { this.code = code; return this; }, set() { return this; }, json(body) { this.body = body; return this; } };
  let authorized = false;
  handlers[0].handle(req, response, () => { authorized = true; });
  if (authorized) await handlers[1].handle(req, response);
  return response;
}
test('collector denies missing auth and unmapped property before source work', async () => {
  sourceCalls = 0;
  assert.equal((await call('')).code, 401);
  mapped = false;
  assert.equal((await call()).code, 409);
  assert.equal(sourceCalls, 0);
  mapped = true;
});
test('collector reuses mapped broker/token path and returns three funnels plus period reach', async () => {
  sourceCalls = 0;
  const response = await call();
  assert.equal(response.code, 200);
  assert.equal(sourceCalls, 6);
  assert.equal(response.body.target.studio_id, 1);
  assert.equal(response.body.definitionVersion, 2);
  assert.equal(response.body.geography, 'US');
  assert.equal(JSON.stringify(response.body).includes('mock-token'), false);
});
test('collector gracefully sanitizes upstream funnel permissions', async () => {
  denied = true;
  assert.equal((await call()).code, 403);
  denied = false;
});
