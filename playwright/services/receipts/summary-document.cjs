'use strict';
// Display only. Account decisions and calculations are supplied by trusted ETL.
function prepareSummary(m, context) {
  const hold=()=>({status:'needs_review',postingAllowed:false,archiveAllowed:false});
  const valid=v=>typeof v==='string' && v.trim().length>0 && v.length<=300;
  if (![m.vendor,m.date,m.reference,m.total,m.sourceReference].every(valid) ||
      !Array.isArray(m.lines) || !m.lines.length || m.lines.length>100 ||
      m.lines.some(l=>!l || ![l.description,l.account,l.amount].every(valid))) return hold();
  const esc=v=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:Letter;margin:18mm}body{font:12px/1.5 Arial,sans-serif;color:#173e4c}h1{font-size:22px;margin-bottom:4px}p{margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:20px;table-layout:fixed}th{background:#e6eff2;text-align:left}td,th{padding:9px;border-bottom:1px solid #ccd8dc;overflow-wrap:anywhere}th:last-child,td:last-child{text-align:right;width:18%}tr{break-inside:avoid}thead{display:table-header-group}.total{text-align:right;font-size:17px;margin-top:14px}.source{font-size:10px;color:#555;margin-top:24px;overflow-wrap:anywhere}</style></head><body><h1>${esc(m.vendor)}</h1><p>${esc(m.date)} | ${esc(m.reference)}</p><table><thead><tr><th>Purchase / adjustment</th><th>Account</th><th>Amount</th></tr></thead><tbody>${m.lines.map(l=>`<tr><td>${esc(l.description)}</td><td>${esc(l.account)}</td><td>${esc(l.amount)}</td></tr>`).join('')}</tbody></table><p class="total">Total: ${esc(m.total)}</p><p class="source">Source: ${esc(m.sourceReference)}<br>Accounting summary - original evidence retained separately.</p></body></html>`;
  return {status:'ready_for_pdf_render',html,fileName:`summary-${context.companyId}-${m.id}.html`,sourceMessageId:m.id,companyId:context.companyId,postingAllowed:false,archiveAllowed:false,aiUsed:false};
}
module.exports={prepareSummary};
