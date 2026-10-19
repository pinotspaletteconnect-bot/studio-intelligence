'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { assertClass } = require('./classRoster.cjs');
const { createRosterSessionResolver } = require('./rosterSession.cjs');
const { createClassRosterRouter } = require('../../routes/classRoster.cjs');
let server, url, calls = 0, closed = 0;
const oldToken = process.env.COLLECTOR_API_TOKEN;
const testToken = 'synthetic-local-route-test-token';
before(async () => {
  process.env.COLLECTOR_API_TOKEN = testToken;
  const app = express(); app.use(express.json());
  app.use('/pts/class-roster', createClassRosterRouter({
    resolveSession: async input => {
      calls++;
      if (input.classId === '998') throw Object.assign(new Error('Private diagnostic must stay private'), { sourceStage: 'source-login' });
      if (input.classId === '999') throw Object.assign(new Error('Private diagnostic must stay private'), { sourceStage: 'private-guest-name' });
      if (input.accountId !== 1 || input.studioId !== 1) throw Error('Private diagnostic that must not be returned');
      return { page: {}, target: { ...input, classId: String(input.classId) }, close: async () => closed++ };
    },
    collect: async ({ target }) => ({ ...target, complete: true, rows: [] }),
  }));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  url = `http://127.0.0.1:${server.address().port}/pts/class-roster`;
});
after(async () => { if (oldToken === undefined) delete process.env.COLLECTOR_API_TOKEN; else process.env.COLLECTOR_API_TOKEN = oldToken;
  await new Promise(resolve => server.close(resolve)); });
const request = (body, auth = true) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${testToken}` } : {}) }, body: JSON.stringify(body) });
test('new route rejects unauthenticated collection before opening a browser', async () => {
  const initial = calls; assert.equal((await request({ accountId: 1, studioId: 1, classId: '123' }, false)).status, 401); assert.equal(calls, initial);
});
test('arbitrary source URLs, credentials and invalid IDs are rejected', async () => {
  for (const extra of [{ url: 'https://example.invalid' }, { password: 'synthetic' }, { classId: '../Order/Delete' }]) {
    assert.equal((await request({ accountId: 1, studioId: 1, classId: '123', ...extra })).status, 400);
  }
});
test('wrong account/studio fails with sanitized diagnostics and no source response', async () => {
  const response = await request({ accountId: 2, studioId: 1, classId: '123' });
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /Private diagnostic/);
});

test('diagnostics expose only allow-listed stage names, never raw exception text', async () => {
  const known = await request({ accountId: 1, studioId: 1, classId: '998' });
  const knownBody = await known.json(); assert.equal(knownBody.sourceStage, 'source-login');
  assert.doesNotMatch(JSON.stringify(knownBody), /Private diagnostic/);
  const unknown = await request({ accountId: 1, studioId: 1, classId: '999' });
  const unknownBody = await unknown.json(); assert.equal(unknownBody.sourceStage, undefined);
  assert.doesNotMatch(JSON.stringify(unknownBody), /Private diagnostic|private-guest-name/);
});
test('authorized source returns a scoped result and always closes its browser', async () => {
  const initial = closed; const response = await request({ accountId: 1, studioId: 1, classId: '123' });
  assert.equal(response.status, 200); const result = await response.json(); assert.equal(result.studioId, 1); assert.equal(result.source.classId, '123');
  assert.equal(closed, initial + 1);
});
test('class type/location/count guards reject private and mismapped classes', () => {
  const target = { sourceLocationLabel: 'Synthetic studio', sourceRoomId: '21', allowedClassTypeIds: ['100'] };
  const good = { locationLabel: target.sourceLocationLabel, roomId: '21', classTypeId: '100', classTypeLabel: 'Regular', reservedCount: 0 };
  assert.doesNotThrow(() => assertClass(good, target));
  for (const change of [{ locationLabel: 'Other studio' }, { roomId: '22' }, { classTypeId: '200' }, { classTypeLabel: 'Private Party' }, { reservedCount: null }]) assert.throws(() => assertClass({ ...good, ...change }, target));
});
test('source session binding stops absent/wrong accounts before launching Playwright', async () => {
  let launches = 0; const chromium = { launch: async () => { launches++; throw Error('Must not launch'); } };
  for (const env of [{}, { PTS_SEATING_ACCOUNT_ID: '1', PTS_SEATING_STUDIOS_JSON: '[]' }]) {
    const resolve = createRosterSessionResolver({ chromium, env });
    await assert.rejects(resolve({ accountId: 2, studioId: 1, classId: '123' }));
  }
  assert.equal(launches, 0);
});
test('source session rejects a different broker studio before opening a browser', async () => {
  let launches=0;
  const env={PTS_SEATING_ACCOUNT_ID:'1',PTS_SEATING_STUDIOS_JSON:JSON.stringify([{studioId:1,studioCode:'STM',sourceLocationLabel:'Matthews',sourceRoomId:'21',allowedClassTypeIds:['100']}])};
  const resolve=createRosterSessionResolver({env,chromium:{launch:async()=>{launches++;}},
    resolveAccount:async()=>({studios:[{studioId:2,code:'OTHER'}],credentials:{username:'synthetic',password:'synthetic'}})});
  await assert.rejects(resolve({accountId:1,studioId:1,classId:'123'}),/mapping mismatch/);
  assert.equal(launches,0);
});
test('source session uses the existing account broker instead of legacy environment credentials', async () => {
  const filled=[]; let closed=false,requestedAccount;
  const page={goto:async()=>{},locator:selector=>({fill:async value=>filled.push([selector,value])}),
    waitForURL:async()=>{},getByRole:()=>({click:async()=>{}})};
  const env={PTS_SEATING_ACCOUNT_ID:'1',PTS_USERNAME:'wrong-legacy-login',PTS_PASSWORD:'wrong-legacy-password',
    PTS_SEATING_STUDIOS_JSON:JSON.stringify([{studioId:1,studioCode:'STM',sourceLocationLabel:'Matthews',sourceRoomId:'21',allowedClassTypeIds:['100']}])};
  const resolve=createRosterSessionResolver({env,chromium:{launch:async()=>({newContext:async()=>({newPage:async()=>page}),close:async()=>{closed=true;}})},
    resolveAccount:async id=>{requestedAccount=id;return {studios:[{studioId:1,code:'STM'}],credentials:{username:'synthetic-broker-user',password:'synthetic-broker-password'}};}});
  const session=await resolve({accountId:1,studioId:1,classId:'123'});
  assert.equal(requestedAccount,1); assert.deepEqual(filled,[['#UserName','synthetic-broker-user'],['#Password','synthetic-broker-password']]);
  await session.close();assert.equal(closed,true);
});
