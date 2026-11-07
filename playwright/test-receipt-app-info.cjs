'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createReceiptAppInfoRouter } = require('./routes/receiptAppInfo.cjs');
test('public receipt information serves only fixed pages and no receipt operations', async () => {
  const app = express();
  app.use('/receipt-automation', createReceiptAppInfoRouter());
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/receipt-automation`;
    for (const path of ['', '/privacy', '/terms']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
      const html = await response.text();
      assert.match(html, /Studio Accounting Automation/);
      assert.doesNotMatch(html, /<script|<form|RECEIPT_PDF_TOKEN|client_secret/i);
    }
    assert.equal((await fetch(base + '/private')).status, 404);
    assert.equal((await fetch(base + '/privacy', { method: 'POST', body: 'receipt' })).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
