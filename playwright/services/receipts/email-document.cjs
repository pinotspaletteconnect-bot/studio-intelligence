'use strict';

// Pure document preparation. No network, credentials, AI, or accounting writes.
function prepareEmailDocument(message, context) {
  const hold = reason => ({status: 'needs_review', reason, postingAllowed: false, archiveAllowed: false});
  if (!context || !/^[A-Za-z0-9_-]{1,80}$/.test(context.companyId || '') ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(message?.id || '')) return hold('Missing stable source/company identity');
  if (typeof message.text !== 'string' || !message.text.trim()) return hold('Plain-text body unavailable; preserve HTML/attachments for separate conversion');
  if (message.text.length > 200000) return hold('Body exceeds review conversion limit');
  const fields = [message.subject, message.date];
  if (fields.some(v => typeof v !== 'string' || !v.trim() || v.length > 2000)) return hold('Missing or oversized source metadata');
  const esc = value => value.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  // Treat email as text, never executable HTML. Preserve real newlines verbatim.
  // No remote images, tracking URLs, scripts, CSS, or source links are loaded.
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:Letter;margin:18mm}body{font:12px sans-serif;color:#172d37}h1{font-size:19px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 monospace}header{border-bottom:1px solid #aaa;padding-bottom:12px}</style></head><body><header><h1>Email receipt source copy</h1><p>Subject: ${esc(message.subject)}</p><p>Received: ${esc(message.date)}<br>Company reference: ${esc(context.companyId)}<br>Gmail message: ${esc(message.id)}</p><p>Plain-text email reproduction. Attachments are separate. Not proof of payment or a posted transaction.</p></header><pre>${esc(message.text)}</pre></body></html>`;
  return {status:'ready_for_pdf_render', sourceMessageId:message.id, companyId:context.companyId,
    fileName:`receipt-${context.companyId}-${message.id}.html`, html,
    postingAllowed:false, archiveAllowed:false, aiUsed:false};
}
module.exports={prepareEmailDocument};
