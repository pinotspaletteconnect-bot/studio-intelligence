'use strict';
// Extend the existing attachment path; no new workflow or credentials.
function supportOriginalPhotos(js,key,name){
 if(key==='archive')return js
  .replace("const originals=parts.filter(x=>!/^image\\//.test(x.mimeType)","const originals=parts.filter(x=>(r.sourceAttachment?.files||[]).some(e=>e.filename===x.filename&&e.mimeType===x.mimeType&&e.size===Number(x.body?.size))||!/^image\\//.test(x.mimeType)")
  .replace("originals.some(x=>x.mimeType!=='application/pdf')","originals.some(x=>!['application/pdf','image/jpeg','image/png'].includes(x.mimeType))")
  .replace("e.filename===a.filename&&Number(e.size)===Number(a.body.size)","e.filename===a.filename&&(e.mimeType||'application/pdf')===a.mimeType&&Number(e.size)===Number(a.body.size)");
 if(key==='review')return js
  .replaceAll("a.mimeType!=='application/pdf'","!['application/pdf','image/jpeg','image/png'].includes(a.mimeType)")
  .replace("mimeType:'application/pdf',size:a.size","mimeType:a.mimeType,size:a.size")
  // Original email inspected Nov 8: the 7,784-byte inline image lists Arena
  // charge references ($172.12 / $661), not a logo or another itemized invoice.
  // Preserve it alongside the exact Arena receipt, without changing its COA.
  .replace("const pdfs=attachments.map(a=>({filename:a.filename,mimeType:a.mimeType,size:a.size}));", "const pdfs=attachments.map(a=>({filename:a.filename,mimeType:a.mimeType,size:a.size}));if(r.companyId==='receipt-mail-stellaseaselempirereceipts'&&r.sourceMessageId==='19f4d1eacf3c6858'&&pdfs.length===1&&pdfs[0].filename==='Arena 3.3.26.jpg'&&pdfs[0].mimeType==='image/jpeg'&&pdfs[0].size===116545){pdfs.push({filename:'image.png',mimeType:'image/png',size:7784});}")
  .replace("pdfs.length>1?{kind:'pdf_bundle_v1'","(pdfs.length>1||pdfs.some(a=>a.mimeType!=='application/pdf'))?{kind:'pdf_bundle_v1'");
 if(key!=='documents')return js;
 if(name==='Batch - Select Original PDF')return js
  .replace("p.mimeType==='application/pdf'","['application/pdf','image/jpeg','image/png'].includes(p.mimeType)")
  // The reviewed Short North signature logo is not receipt evidence. Keep
  // unknown inline images and every explicitly expected image in the guard.
  .replace('const found=[];',`const found=[];
 const expectedFiles=job.sourceAttachment?.kind==='pdf_bundle_v1'?job.sourceAttachment.files:job.sourceAttachment?[job.sourceAttachment]:[];
 const htmlParts=[];const readHtml=p=>{if(p.mimeType==='text/html'&&p.body?.data)htmlParts.push(Buffer.from(p.body.data,'base64url').toString('utf8'));for(const c of p.parts||[])readHtml(c);};readHtml(gmail.payload||{});
 const signatureLogo=p=>{
  if(expectedFiles.some(e=>e.filename===p.filename&&e.size===Number(p.body?.size)))return false;
  if(p.filename!=='image.png'||p.mimeType!=='image/png'||Number(p.body?.size)!==177463)return false;
  const headers=Object.fromEntries((p.headers||[]).map(h=>[h.name.toLowerCase(),h.value]));
  const cid=(headers['content-id']||'').replace(/^<|>$/g,'');
  return /^inline(?:;|$)/i.test(headers['content-disposition']||'')&&cid&&htmlParts.some(html=>{
   const start=html.search(/id=["']Signature["']/i);if(start<0)return false;
   const tail=html.slice(start);return tail.includes('cid:'+cid)&&/width=["']168["']/i.test(tail)&&/height=["']102["']/i.test(tail);
  });
 };`)
  .replace('found.push(p);','{if(!signatureLogo(p))found.push(p);}')
  .replace('expected.files.length<2','expected.files.length<1')
  .replace('p.filename===e.filename&&Number(p.body?.size)===e.size','p.filename===e.filename&&p.mimeType===e.mimeType&&Number(p.body?.size)===e.size')
  .replace('fileName:e.filename,size:e.size','fileName:e.filename,mimeType:e.mimeType,size:e.size');
 if(name==='Verify Each Original PDF')return js
  .replace('function verifyOriginalPdf(data, expectedSize)',"function verifyOriginalPdf(data, expectedSize, mime='application/pdf')")
  .replace("bytes.subarray(0,5).toString()!=='%PDF-'", "!(mime==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='image/png'&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')")
  .replace('responses[i].json.data,j.original.size)','responses[i].json.data,j.original.size,j.original.mimeType)');
 if(name==='Batch - Bind Original Evidence')return js.replace('rows.length>1?{companyId:',"(rows.length>1||(j.original?.mimeType&&j.original.mimeType!=='application/pdf'))?{companyId:");
 return js;
}
module.exports={supportOriginalPhotos};
