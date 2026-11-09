'use strict';
// Include reviewed source corrections in both the fingerprint and the document.
// Receipts without notes retain their existing payload and fingerprint.
function includeSourceReviewNotes(js) {
  if (!js.includes('function currentSummaryPayload(receipt)')) return js;
  const payload='ownerProvenance:receipt.ownerProvenance||[],originalAttachment:receipt.sourceAttachment||null';
  const render="const provenance=[];";
  if (!js.includes(payload) || !js.includes(render)) throw Error('Summary note insertion points changed');
  return js.replace(payload,"...(typeof receipt.sourceReviewNote==='string'&&receipt.sourceReviewNote.trim()?{sourceReviewNote:receipt.sourceReviewNote.trim()}:{}),"+payload)
    .replace(render,"if(clean(payload.sourceReviewNote))text.push('SOURCE REVIEW AND ALLOCATION NOTES',payload.sourceReviewNote,'');\n  "+render);
}
module.exports={includeSourceReviewNotes};
