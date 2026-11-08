'use strict';
// Extend the existing attachment path; no new workflow or credentials.
function supportOriginalPhotos(js,key,name){
 if(key==='archive')return js
  .replace("originals.some(x=>x.mimeType!=='application/pdf')","originals.some(x=>!['application/pdf','image/jpeg','image/png'].includes(x.mimeType))")
  .replace("e.filename===a.filename&&Number(e.size)===Number(a.body.size)","e.filename===a.filename&&(e.mimeType||'application/pdf')===a.mimeType&&Number(e.size)===Number(a.body.size)");
 if(key==='review')return js
  .replaceAll("a.mimeType!=='application/pdf'","!['application/pdf','image/jpeg','image/png'].includes(a.mimeType)")
  .replace("mimeType:'application/pdf',size:a.size","mimeType:a.mimeType,size:a.size")
  .replace("pdfs.length>1?{kind:'pdf_bundle_v1'","(pdfs.length>1||pdfs.some(a=>a.mimeType!=='application/pdf'))?{kind:'pdf_bundle_v1'");
 if(key!=='documents')return js;
 if(name==='Batch - Select Original PDF')return js
  .replace("p.mimeType==='application/pdf'","['application/pdf','image/jpeg','image/png'].includes(p.mimeType)")
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
