'use strict';
// Display only. Account decisions and calculations are supplied by trusted ETL.
function prepareSummary(m, context) {
  const hold=()=>({status:'needs_review',postingAllowed:false,archiveAllowed:false});
  const valid=v=>typeof v==='string' && v.trim().length>0 && v.length<=300;
  if (![m.vendor,m.date,m.reference,m.total,m.sourceReference].every(valid) ||
      !Array.isArray(m.lines) || !m.lines.length || m.lines.length>100 ||
      m.lines.some(l=>!l || ![l.description,l.account,l.amount].every(valid))) return hold();
  const esc=v=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:Letter;margin:18mm}body{font:12px/1.5 Arial,sans-serif;color:#173e4c}h1{font-size:22px;margin-bottom:4px}h2{font-size:23px;font-weight:800;margin:24px 0 10px;letter-spacing:.5px}p{margin:4px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#e6eff2;text-align:left;font-size:11px;text-transform:uppercase}td,th{padding:12px 10px;border-bottom:1px solid #ccd8dc;overflow-wrap:anywhere;vertical-align:top}th:last-child,td:last-child{text-align:right;width:24%}.account,.amount{font-size:18px;font-weight:800;line-height:1.3;color:#102f3b}.description{font-size:11px;line-height:1.5;color:#52636a;margin-top:7px}tr{break-inside:avoid}thead{display:table-header-group}.total{text-align:right;font-size:22px;font-weight:800;margin-top:18px}.source{font-size:10px;color:#555;margin-top:24px;overflow-wrap:anywhere}</style></head><body><h1>${esc(m.vendor)}</h1><p>${esc(m.date)} | ${esc(m.reference)}</p><h2>COA SPLITS</h2><table><thead><tr><th>Account / purchase detail</th><th>Split amount</th></tr></thead><tbody>${m.lines.map(l=>`<tr><td><div class="account">${esc(l.account)}</div><div class="description">${esc(l.description)}</div></td><td class="amount">${esc(l.amount)}</td></tr>`).join('')}</tbody></table><p class="total">TOTAL: ${esc(m.total)}</p><p class="source">Source: ${esc(m.sourceReference)}<br>Accounting summary - original evidence retained separately.</p></body></html>`;
  return {status:'ready_for_pdf_render',html,fileName:`summary-${context.companyId}-${m.id}.html`,sourceMessageId:m.id,companyId:context.companyId,postingAllowed:false,archiveAllowed:false,aiUsed:false};
}
module.exports={prepareSummary};
