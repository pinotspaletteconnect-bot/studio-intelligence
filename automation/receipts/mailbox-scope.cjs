'use strict';

// Receipt-only identities. These are ledger namespaces, not QuickBooks companies.
function mailboxScope(registry, value) {
  const mailbox = String(value?.mailbox || value || '').trim().toLowerCase();
  const row = registry.studios.find(s => s.mailbox === mailbox);
  if (!row || !row.gmailCredentialId || !row.folderId) throw Error('Unknown or unconnected receipt mailbox');
  return {mailbox: row.mailbox, studio: row.studio, folderId: row.folderId,
    scopeId: row.studio === 'Gilbert' ? '9130357828229216' : 'receipt-mail-' + row.mailbox.split('@')[0]};
}

function cacheForMailbox(rows, scope, legacyMailbox) {
  return rows.filter(row => {
    if (!row.resultJson) return false;
    let result;
    try { result = JSON.parse(row.resultJson); } catch { return false; }
    const mailbox = result.source?.mailbox || legacyMailbox;
    return mailbox === scope.mailbox;
  });
}

function scopedReceiptKey(scope, nativeMessageId) {
  if (!/^[a-f0-9]{16}$/.test(nativeMessageId || '')) throw Error('Invalid native Gmail message ID');
  return scope.scopeId + ':' + nativeMessageId;
}

function assertMailboxProfile(scope, profile) {
  if (profile?.emailAddress?.toLowerCase() !== scope.mailbox) throw Error('Receipt mailbox identity mismatch');
  return scope;
}

// Keep owner decisions scoped to the exact receipt/company that they approved.
// Portable category rules are explicitly selected by the caller; no rule is
// silently promoted from one studio to another here.
function savedAnswersForMailbox(rows, scope) {
  return rows.filter(row => row.companyId === scope.scopeId &&
    typeof row.receiptKey === 'string' && row.receiptKey.startsWith(scope.scopeId + ':'));
}

module.exports = {mailboxScope, cacheForMailbox, scopedReceiptKey, assertMailboxProfile, savedAnswersForMailbox};
