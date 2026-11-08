'use strict';
const SHARED_RULES=require('./shared-owner-rules.json');
const SHARED_ACCOUNTS=require('./shared-owner-accounts.json');
function scopeReceiptRules(rules, scope) {
  if(scope.studio!=='Gilbert'&&scope.useSharedCoa!==true)
    throw Error('Confirm whether this studio uses the saved shared COA before classification');
  const copy=JSON.parse(JSON.stringify(rules));
  const applicable=SHARED_RULES.filter(r=>!r.studios||r.studios.includes(scope.studio));
  for(const [key,account] of Object.entries(SHARED_ACCOUNTS)) {
    if(copy.accounts?.[key]&&JSON.stringify(copy.accounts[key])!==JSON.stringify(account))throw Error('Shared owner account conflicts with saved account');
    if(copy.accounts)copy.accounts[key]||={...account};
  }
  copy.companyId=scope.scopeId;
  if(scope.studio!=='Gilbert') {
    copy.rules=(copy.rules||[]).filter(r=>!r.sourceMessageId&&!r.ownerChatDecision);
    copy.candleOrderContext=[];
  }
  if(copy.accounts)for(const r of applicable){
    if(copy.accounts[r.account]&&JSON.stringify(copy.accounts[r.account])!==JSON.stringify(r.accountDefinition))throw Error('Shared COA account conflicts with saved account');
    copy.accounts[r.account]||={...r.accountDefinition};
  }
  copy.rules=[...(copy.rules||[]),...applicable.filter(r=>copy.accounts?.[r.account]&&!(copy.rules||[]).some(old=>old.id===r.id))];
  return copy;
}
function scopeReceiptConfig(config, scope) {
  const copy={...config,companyId:scope.scopeId,mailbox:scope.mailbox};
  if(copy.approvedRules)copy.approvedRules=scopeReceiptRules(copy.approvedRules,scope);
  if(copy.tdRule){
    const items=new Map((copy.tdRule.items||[]).map(i=>[i.pattern,i]));
    for(const r of SHARED_RULES.filter(r=>r.id.startsWith('td-'))){
      const item={pattern:r.pattern,accountId:r.accountDefinition.id,accountName:r.accountDefinition.name};
      if(items.has(r.pattern)&&items.get(r.pattern).accountId!==item.accountId)throw Error('Conflicting TD category');
      items.set(r.pattern,item);
    }
    copy.tdRule={...copy.tdRule,items:[...items.values()]};
  }
  if(scope.studio!=='Gilbert') {
    copy.reviewedReceipts=[];
    copy.completedReceipts=[];
  }
  return copy;
}
module.exports={scopeReceiptRules,scopeReceiptConfig};
