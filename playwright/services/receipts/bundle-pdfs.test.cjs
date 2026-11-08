'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash, randomBytes} = require('node:crypto');
const {PDFDocument} = require('pdf-lib');
const {bundlePdfs} = require('./bundle-pdfs.cjs');
const document = (fileName, raw) => ({fileName, size:raw.length,
  base64:raw.toString('base64'), sha256:createHash('sha256').update(raw).digest('hex')});
async function fixture(large=false) {
  const p=await PDFDocument.create(); p.addPage();
  if(large) await p.attach(randomBytes(5500000),'synthetic.bin');
  return Buffer.from(await p.save());
}
test('multi-megabyte original passes without recursive regex stack overflow',async()=>{
  const large=await fixture(true),small=await fixture();
  const result=await bundlePdfs({companyId:'test-studio',sourceMessageId:'test-source',
    documents:[document('large.pdf',large),document('small.pdf',small)]});
  assert.equal(result.status,'pdf_ready_for_review');
  assert.equal((await PDFDocument.load(result.pdf)).getPageCount(),3);
  assert.equal(result.archiveAllowed,false);
});
test('noncanonical base64 remains rejected',async()=>{
  const raw=await fixture();const d=document('first.pdf',raw);
  d.base64='===='+d.base64.slice(4);
  await assert.rejects(bundlePdfs({companyId:'test',sourceMessageId:'test',
    documents:[d,document('second.pdf',raw)]}),/integrity/);
});
test('checksum mismatch remains rejected',async()=>{
  const raw=await fixture();const d=document('first.pdf',raw);d.sha256='0'.repeat(64);
  await assert.rejects(bundlePdfs({companyId:'test',sourceMessageId:'test',
    documents:[d,document('second.pdf',raw)]}),/integrity/);
});
