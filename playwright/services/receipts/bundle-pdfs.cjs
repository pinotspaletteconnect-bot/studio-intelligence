'use strict';
const {PDFDocument, StandardFonts} = require('pdf-lib');
const {createHash} = require('node:crypto');

// No fetching, accounting calculations, or source deletion. Original bytes
// are embedded as files as well as copied pages, preserving signed originals.
async function bundlePdfs(input) {
  const {sourceMessageId, companyId, documents} = input || {};
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(sourceMessageId || '') ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(companyId || '') ||
      !Array.isArray(documents) || documents.length < 2 || documents.length > 8)
    throw Error('Invalid bundle');
  const names = new Set(); let bytes = 0, pages = 0;
  const sources = [];
  for (const d of documents) {
    if (!d || typeof d.fileName !== 'string' || !/^[\x20-\x7e]{1,180}\.pdf$/i.test(d.fileName) ||
        /[\\/]/.test(d.fileName) || names.has(d.fileName) ||
        typeof d.base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(d.base64))
      throw Error('Invalid source PDF');
    names.add(d.fileName);
    const raw = Buffer.from(d.base64, 'base64'); bytes += raw.length;
    if (!raw.length || raw.length > 12000000 || bytes > 20000000 ||
        raw.subarray(0,5).toString() !== '%PDF-' || raw.length !== d.size ||
        !/^[a-f0-9]{64}$/.test(d.sha256 || '') ||
        createHash('sha256').update(raw).digest('hex') !== d.sha256)
      throw Error('Source integrity check failed');
    const pdf = await PDFDocument.load(raw, {ignoreEncryption:false, throwOnInvalidObject:true});
    if (!pdf.getPageCount() || (pages += pdf.getPageCount()) > 100) throw Error('Page limit');
    sources.push({raw,pdf,name:d.fileName,sha256:d.sha256});
  }
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  let page = out.addPage([612,792]), y = 748;
  const line = (s,size=10) => {
    // Manifest uses safe ASCII names; wrap long names/hashes without truncation.
    for (let pos=0;pos<s.length;pos+=85) {
      if(y<48){page=out.addPage([612,792]);y=748;}
      page.drawText(s.slice(pos,pos+85),{x:36,y,size,font}); y-=16;
    }
  };
  line('Receipt source bundle',16);
  line(`Company: ${companyId}`); line(`Gmail message: ${sourceMessageId}`);
  line('Original pages follow in listed order. Original PDF files are embedded.');
  line('This bundle is evidence only, not proof of posting or payment.'); y-=12;
  for(const [i,s] of sources.entries()) {
    line(`${i+1}. ${s.name}`); line(`Pages: ${s.pdf.getPageCount()} | Bytes: ${s.raw.length}`);
    line(`SHA256: ${s.sha256}`); y-=8;
  }
  for(const s of sources) {
    for(const p of await out.copyPages(s.pdf,s.pdf.getPageIndices()))out.addPage(p);
    await out.attach(s.raw,s.name,{mimeType:'application/pdf',description:'Unmodified original receipt attachment'});
  }
  const pdf=Buffer.from(await out.save());
  if(pdf.length>45000000)throw Error('Output size limit');
  return {status:'pdf_ready_for_review',pdf,fileName:`receipt-${companyId}-${sourceMessageId}-bundle.pdf`,
    sourceMessageId,companyId,postingAllowed:false,archiveAllowed:false,aiUsed:false};
}
module.exports={bundlePdfs};
