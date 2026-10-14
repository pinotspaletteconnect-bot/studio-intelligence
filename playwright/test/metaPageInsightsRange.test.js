const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function service() {
    const calls = [];
    const auth = {
        getPages: async token => { calls.push({ token }); return [{ id: 'page-1', name: 'Studio', accessToken: 'page-token' }]; },
        graphRequestWithToken: async (endpoint, token, params) => {
            calls.push({ endpoint, token, params });
            return { data: [{ name: 'page_media_view', period: 'day', values: [{ end_time: '2026-10-13T07:00:00Z', value: 42 }] }] };
        }
    };
    const context = { module: { exports: {} }, console, require: name => name === './auth' ? auth : { PAGE_INSIGHT_METRICS: ['page_media_view'] } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/meta/pageInsights.js'), 'utf8'), context);
    return { download: context.module.exports.download, calls };
}
test('scheduled requests keep the existing default and page credential', async () => {
    const s = service(); const result = await s.download({ accessToken: 'user-token' });
    assert.equal(s.calls[0].token, 'user-token');
    assert.equal(s.calls[1].token, 'page-token');
    assert.equal(JSON.stringify(s.calls[1].params), JSON.stringify({ metric: 'page_media_view' }));
    assert.equal(result.records[0].value, 42);
    assert.equal(result.records[0].insight_date, '2026-10-13T07:00:00Z');
});
test('historical requests pass the complete range without changing source dates', async () => {
    const s = service(); const result = await s.download({ since: '2026-10-03', until: '2026-10-14' });
    assert.equal(JSON.stringify(s.calls[1].params), JSON.stringify({ metric: 'page_media_view', since: '2026-10-03', until: '2026-10-14' }));
    assert.equal(result.records[0].insight_date, '2026-10-13T07:00:00Z');
});
test('invalid, incomplete, reversed, and excessive ranges fail before source access', async () => {
    for (const options of [{ since: '2026-10-03' }, { since: '2026-02-30', until: '2026-03-01' }, { since: '2026-10-14', until: '2026-10-03' }, { since: '2026-01-01', until: '2026-10-14' }, { since: 1, until: '2026-10-14' }]) {
        const s = service(); await assert.rejects(s.download(options), /Page Insights/); assert.equal(s.calls.length, 0);
    }
});
