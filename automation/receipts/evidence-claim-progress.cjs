'use strict';
// Finish acquired work instead of abandoning its lease when a sibling is busy.
// Existing final file verification still requires both documents before archive.
function selectAcquiredEvidence(jobs,responses) {
 if(responses.length!==jobs.length)throw Error('Claim count mismatch');
 const acquired=[],blocked=[];
 for(let i=0;i<jobs.length;i++) {
  const v=responses[i].json,outcome=v?.outcome??v?.data?.[0]?.outcome;
  if(outcome==='acquired')acquired.push({...jobs[i],pairedItem:{item:i}});
  else if(['busy','complete','reconcile_upload'].includes(outcome))blocked.push(jobs[i].json.sourceMessageId+' '+jobs[i].json.kind+' '+outcome);
  else throw Error('Unknown evidence claim outcome: '+String(outcome));
 }
 if(!acquired.length)throw Error('No acquired evidence work: '+blocked.join('; '));
 return acquired;
}
function allowPartialEvidenceProgress(workflow) {
 const n=workflow.nodes.find(n=>n.name==='Batch - Require Acquired Leases');
 if(!n)throw Error('Evidence claim gate missing');
 n.parameters.jsCode=selectAcquiredEvidence.toString()+"\nconst MB=$('Mailbox Context').first().json.mailboxContext;return selectAcquiredEvidence($('Batch - Plan Missing Documents').all(),$input.all()).map(i=>({...i,json:{...i.json,mailboxContext:MB}}));";
 return workflow;
}
module.exports={selectAcquiredEvidence,allowPartialEvidenceProgress};
