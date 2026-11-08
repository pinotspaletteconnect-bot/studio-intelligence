'use strict';
function selectApprovedTicket(rows, legacy, sourceMessageId) {
 const expected=new Set([
  ...Array.from({length:50},(_,i)=>'gilbert-backlog-20260930-usd5-remaining-'+String(i+1).padStart(2,'0')),
  ...Array.from({length:166},(_,i)=>'receipt-studios-20261108-usd5-'+String(i+1).padStart(3,'0'))
 ]);
 const reconciled=new Set(Array.from({length:50},(_,i)=>'receipt-reconciled-20261108-cap10-'+String(i+1).padStart(3,'0')));
 if(legacy.length!==115||legacy.some(r=>Number(r.reservedMicrousd)!==30000))throw Error('Historical allowance cannot be verified');
 const extra=rows.filter(r=>reconciled.has(r.approvalId));
 if(![0,50].includes(extra.length)||rows.length!==expected.size+extra.length||new Set(rows.map(r=>r.approvalId)).size!==rows.length||new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>(!expected.has(r.approvalId)&&!reconciled.has(r.approvalId))||!Number.isSafeInteger(r.id)||r.id<=0||Number(r.reservedMicrousd)!==30000||!['available','reserved','complete','failed'].includes(r.status)))throw Error('Approved $10 allowance ledger invalid');
 // Preserve every historical row. Only settled, measured usage releases a
 // reservation; errors without measured usage retain the entire reservation.
 const exposure=rows.reduce((sum,r)=>{
  if(!['complete','failed'].includes(r.status))return sum+30000;
  let u;try{u=JSON.parse(r.usageJson||'null');}catch{return sum+30000;}
  if(!Number.isSafeInteger(u?.input_tokens)||u.input_tokens<0||!Number.isSafeInteger(u?.output_tokens)||u.output_tokens<0)return sum+30000;
  return sum+Math.ceil(u.input_tokens*0.15+u.output_tokens*0.6);
 },legacy.length*30000);
 if(exposure>10000000)throw Error('Total $10 cap exceeded');
 if(!/^[a-f0-9]{16}$/.test(sourceMessageId||''))return null;
 if([...legacy,...rows].some(r=>r.sourceMessageId===sourceMessageId))return null;
 const ticket=rows.filter(r=>r.status==='available'&&!r.sourceMessageId).sort((a,b)=>a.id-b.id)[0];
 return ticket?{...ticket,sourceMessageId}:null;
}
module.exports={selectApprovedTicket};
