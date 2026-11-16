// RECOVERY COPY ONLY, after expected mapping snapshot and before discovery.
const accounts = $input.all();
const mappings = $('Snapshot Expected Eulerity Targets').all();
const expected = new Set(['1:1', '1:2', '1:3', '1:4']);
const actual = mappings.map(i => `${Number(i.json.account_id)}:${Number(i.json.studio_id)}`);
if (accounts.length !== 1 || Number(accounts[0].json.account_id) !== 1 || actual.length !== 4 || new Set(actual).size !== 4 || actual.some(k => !expected.has(k))) throw new Error('Eulerity recovery must be account1 and exactly the four approved org1 studios');
const mappingStudios = { 6: 1, 7: 2, 8: 3, 9: 4 };
if (mappings.some(i => Number(i.json.organization_id) !== 1 || mappingStudios[Number(i.json.integration_id)] !== Number(i.json.studio_id) || !String(i.json.selector_key || '').trim())) throw new Error('Eulerity recovery expected mapping provenance is invalid');
return accounts;
