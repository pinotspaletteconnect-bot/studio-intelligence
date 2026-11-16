// Replacement: Collect Each Mapped Account Once, Run Once for All Items.
// Snapshot node is a read-only list of VERIFIED expected account_id/studio_id
// mappings captured before discovery/sync; it must not derive mappings from labels.
const expected = $('Snapshot Expected Eulerity Targets').all().map(i => i.json);
const actual = $input.all().map(i => i.json);
const key = row => {
  const a = Number(row.account_id), s = Number(row.studio_id);
  if (!Number.isSafeInteger(a) || a <= 0 || !Number.isSafeInteger(s) || s <= 0) throw new Error('Eulerity mapping is missing or invalid');
  return `${a}:${s}`;
};
if (!expected.length || !actual.length) throw new Error('Eulerity has no mapped targets');
const expectedKeys = new Set(expected.map(key)), actualKeys = new Set(actual.map(key));
if (expectedKeys.size !== expected.length || actualKeys.size !== actual.length || expectedKeys.size !== actualKeys.size || [...expectedKeys].some(k => !actualKeys.has(k))) throw new Error('Eulerity mapped targets differ from verified expected mappings');
const accounts = new Set($('List Eulerity Accounts').all().map(i => Number(i.json.account_id)));
const mappedAccounts = new Set(actual.map(i => Number(i.account_id)));
if (accounts.size !== mappedAccounts.size || [...accounts].some(id => !mappedAccounts.has(id))) throw new Error('Eulerity account has no mapped target');
return [...mappedAccounts].map(accountId => ({ json: { accountId } }));
