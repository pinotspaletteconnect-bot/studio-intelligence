'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {createReceiptPdfRouter} = require('./routes/receiptPdf');
const secret = 'synthetic-test-secret-not-production-1234';
async function fixture(t, render, enabled='true') {
  const app=express();
  app.use('/receipt-pdf',createReceiptPdfRouter({render,env:{RECEIPT_PDF_ENABLED:enabled,RECEIPT_PDF_TOKEN:secret}}));
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return (body, auth=true)=>fetch(`http://127.0.0.1:${server.address().port}/receipt-pdf/email`,{
    method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${secret}`}:{})},body:JSON.stringify(body)});
}
const source={message:{id:'test'},context:{companyId:'test'}};
test('disabled and unauthorized requests never render',async t=>{
  let calls=0; const render=async()=>{calls++;};
  const off=await fixture(t,render,'false');
  assert.equal((await off(source)).status,503);
  const on=await fixture(t,render);
  assert.equal((await on(source,false)).status,401);
  assert.equal(calls,0);
});
test('valid binary response is uncached',async t=>{
  const send=await fixture(t,async()=>({status:'pdf_ready_for_review',pdf:Buffer.from('%PDF-test'),fileName:'test.pdf'}));
  const response=await send(source);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(response.headers.get('content-type'),/application\/pdf/);
  assert.equal(await response.text(),'%PDF-test');
});
test('invalid, oversized and review-only documents are held',async t=>{
  const send=await fixture(t,async()=>({status:'needs_review'}));
  assert.equal((await send({})).status,400);
  assert.equal((await send({text:'x'.repeat(1100000)})).status,413);
  assert.equal((await send(source)).status,422);
});
test('failure does not leak content and releases the slot',async t=>{
  const send=await fixture(t,async()=>{throw new Error('PRIVATE BODY');});
  for(let i=0;i<2;i++) {
    const r=await send(source); assert.equal(r.status,503);
    assert.doesNotMatch(await r.text(),/PRIVATE BODY/);
  }
});
test('concurrent work is rejected rather than creating more browsers',async t=>{
  let release,entered; const started=new Promise(r=>entered=r);
  const send=await fixture(t,()=>new Promise(r=>{release=r;entered();}));
  const first=send(source); await started;
  try {assert.equal((await send(source)).status,429);}
  finally {release({status:'needs_review'}); await first;}
});
