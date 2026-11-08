'use strict';
function selectApprovedTicket(rows, legacy, sourceMessageId) {
 const expected=new Set([
  ...Array.from({length:50},(_,i)=>'gilbert-backlog-20260930-usd5-remaining-'+String(i+1).padStart(2,'0')),
  ...Array.from({length:166},(_,i)=>'receipt-studios-20261108-usd5-'+String(i+1).padStart(3,'0'))
 ]);
 if(legacy.length!==115||legacy.some(r=>Number(r.reservedMicrousd)!==30000))throw Error('Historical allowance cannot be verified');
 if(rows.length!==expected.size||new Set(rows.map(r=>r.approvalId)).size!==expected.size||rows.some(r=>!expected.has(r.approvalId)||!Number.isSafeInteger(r.id)||r.id<=0||Number(r.reservedMicrousd)!==30000||!['available','reserved','complete','failed'].includes(r.status)))throw Error('Approved $10 allowance ledger invalid');
 if((legacy.length+rows.length)*30000>10000000)throw Error('Total $10 cap exceeded');
 if(!/^[a-f0-9]{16}$/.test(sourceMessageId||''))return null;
 if([...legacy,...rows].some(r=>r.sourceMessageId===sourceMessageId))return null;
 const ticket=rows.filter(r=>r.status==='available'&&!r.sourceMessageId).sort((a,b)=>a.id-b.id)[0];
 return ticket?{...ticket,sourceMessageId}:null;
}
module.exports={selectApprovedTicket};
