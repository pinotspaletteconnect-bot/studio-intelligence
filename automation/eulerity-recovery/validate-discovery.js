// Code node, Run Once for All Items, BEFORE Sync Eulerity Locations.
const items = $input.all();
const expected = $('List Eulerity Accounts').all().map(i => Number(i.json.account_id));
const seen = new Set();
if (!expected.length || expected.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Eulerity has no valid expected accounts');
for (const { json: result } of items) {
  const id = Number(result.accountId);
  if (result.success !== true || !expected.includes(id) || seen.has(id) || !Array.isArray(result.locations) || !result.locations.length) throw new Error('Eulerity discovery missing, failed or duplicated an account');
  seen.add(id);
  const keys = new Set(), labels = new Set();
  for (const location of result.locations) {
    const key = String(location.sourceKey || '').trim();
    const label = String(location.displayName || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!key || !label || /^(bulk (delete|clone)|single location|select\.\.\.)$/i.test(label) || keys.has(key) || labels.has(label)) throw new Error('Eulerity discovery has invalid or ambiguous locations');
    keys.add(key); labels.add(label);
  }
}
if (seen.size !== new Set(expected).size) throw new Error('Eulerity discovery omitted an expected account');
return items;
