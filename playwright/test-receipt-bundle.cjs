'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {PDFDocument,PDFName,PDFDict,decodePDFRawStream}=require('pdf-lib');
const {createHash}=require('node:crypto');
const {bundlePdfs}=require('./services/receipts/bundle-pdfs.cjs');
const {renderBundle}=require('./services/receipts/bundle-worker.cjs');
async function source(name,count){const p=await PDFDocument.create();for(let i=0;i<count;i++)p.addPage([200+i,300+i]).drawText(`${name} page ${i+1}`,{x:10,y:100,size:12});const b=Buffer.from(await p.save());return {fileName:name+'.pdf',size:b.length,sha256:createHash('sha256').update(b).digest('hex'),base64:b.toString('base64')};}
async function input(){return {companyId:'test',sourceMessageId:'synthetic',documents:[await source('invoice',2),await source('payment',1)]};}
test('bundle preserves source page geometry and exact embedded original bytes',async()=>{
 const i=await input(),r=await renderBundle(i),p=await PDFDocument.load(r.pdf);
 assert.equal(p.getPageCount(),4);assert.equal(p.getPage(1).getWidth(),200);assert.equal(p.getPage(2).getWidth(),201);
 const names=p.catalog.lookup(PDFName.of('Names'),PDFDict).lookup(PDFName.of('EmbeddedFiles'),PDFDict).lookup(PDFName.of('Names'));
 assert.equal(names.size(),4);
 for(let n=0;n<2;n++){const spec=p.context.lookup(names.get(n*2+1));const stream=spec.lookup(PDFName.of('EF'),PDFDict).lookup(PDFName.of('F'));assert.deepEqual(Buffer.from(decodePDFRawStream(stream).decode()),Buffer.from(i.documents[n].base64,'base64'));}
 assert.equal(r.postingAllowed,false);assert.equal(r.archiveAllowed,false);
});
test('rejects changed bytes, count, duplicate names, invalid PDF and oversized source',async()=>{
 for(const mutate of [i=>i.documents[0].size++,i=>i.documents[0].sha256='0'.repeat(64),i=>i.documents.pop(),i=>i.documents[1].fileName=i.documents[0].fileName,i=>i.documents[0].base64='not-pdf',i=>i.documents[0].fileName='../evil.pdf']){
 const i=await input();mutate(i);await assert.rejects(()=>bundlePdfs(i));}
 const i=await input();i.documents[0]=await source('too-many',101);await assert.rejects(()=>bundlePdfs(i),/Page limit/);
});
test('bundle endpoint keeps authentication, shared concurrency, generic failures',async t=>{
 const express=require('express');const {createReceiptPdfRouter}=require('./routes/receiptPdf');const secret='synthetic-only-test-token-1234567890';
 const app=express();app.use('/receipt-pdf',createReceiptPdfRouter({render:async()=>({status:'needs_review'}),env:{RECEIPT_PDF_ENABLED:'true',RECEIPT_PDF_TOKEN:secret}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}/receipt-pdf/bundle`;
 assert.equal((await fetch(url,{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}})).status,401);
 const headers={'Content-Type':'application/json',Authorization:`Bearer ${secret}`};
 const good=await fetch(url,{method:'POST',headers,body:JSON.stringify(await input())});assert.equal(good.status,200);assert.equal(good.headers.get('cache-control'),'no-store');
 const bad=await fetch(url,{method:'POST',headers,body:'{}'});assert.equal(bad.status,422);assert.doesNotMatch(await bad.text(),/stack|node_modules/);
});
if(process.env.RECEIPT_BUNDLE_QA==='true')input().then(bundlePdfs).then(r=>require('node:fs').writeFileSync(process.env.RECEIPT_BUNDLE_QA_PATH,r.pdf));
