'use strict';
const SHARED_RULES=require('./shared-owner-rules.json');
function scopeReceiptRules(rules, scope) {
  if(scope.studio!=='Gilbert'&&scope.useSharedCoa!==true)
    throw Error('Confirm whether this studio uses the saved shared COA before classification');
  const copy=JSON.parse(JSON.stringify(rules));
  copy.companyId=scope.scopeId;
  if(scope.studio!=='Gilbert') {
    copy.rules=(copy.rules||[]).filter(r=>!r.sourceMessageId&&!r.ownerChatDecision);
    copy.candleOrderContext=[];
  }
  if(copy.accounts)for(const r of SHARED_RULES){
    if(copy.accounts[r.account]&&JSON.stringify(copy.accounts[r.account])!==JSON.stringify(r.accountDefinition))throw Error('Shared COA account conflicts with saved account');
    copy.accounts[r.account]||={...r.accountDefinition};
  }
  copy.rules=[...(copy.rules||[]),...SHARED_RULES.filter(r=>copy.accounts?.[r.account]&&!(copy.rules||[]).some(old=>old.id===r.id))];
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
