const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const { join } = require('node:path');

const workflow = JSON.parse(readFileSync(join(__dirname, '../workflows/31-pts-order-geography-discounts.json'), 'utf8'));
const source = readFileSync(join(__dirname, '31-build-order-upserts.js'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const publishedSource = workflow.nodes.find(node => node.name === 'Build Order Upserts').parameters.jsCode;

function run(responses) {
  return vm.runInNewContext(`(() => { ${source} })()`, {
    $input: { all: () => responses.map(json => ({ json })) }, Date,
  });
}

test('workflow uses the reviewed multi-account loader', () => {
  assert.equal(publishedSource, source);
});

test('loads orders from every account, including Huntington Beach', () => {
  const result = run([
    { success: true, organizationId: 1, studioCount: 1, results: [{ studioId: 1, brandId: 1, locationId: 19, orderCount: 1, orders: [{ order_id: 'A', postal_code: '40207', booked_sales: 50 }] }] },
    { success: true, organizationId: 3, studioCount: 1, results: [{ studioId: 5, brandId: 3, locationId: 194, orderCount: 1, orders: [{ order_id: 'B', postal_code: '92647', booked_sales: 60 }] }] },
  ]);
  assert.equal(result[0].json.rowCount, 2);
  assert.deepEqual(Array.from(result[0].json.rows, row => row.studio_id), [1, 5]);
  assert.equal(result[0].json.rows[1].postal_code, '92647');
});

test('does not silently accept an incomplete account result', () => {
  assert.throws(() => run([{ success: true, organizationId: 3, studioCount: 1, results: [{ studioId: 5, brandId: 3, locationId: 194, orderCount: 2, orders: [] }] }]), /incomplete order list/);
});
