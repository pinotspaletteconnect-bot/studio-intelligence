// RECOVERY COPY ONLY, after expected mapping snapshot and before discovery.
const accounts = $input.all();
const mappings = $('Snapshot Expected Eulerity Targets').all();
const expected = new Set(['1:1', '1:2', '1:3', '1:4']);
const actual = mappings.map(i => `${Number(i.json.account_id)}:${Number(i.json.studio_id)}`);
if (accounts.length !== 1 || Number(accounts[0].json.account_id) !== 1 || actual.length !== 4 || new Set(actual).size !== 4 || actual.some(k => !expected.has(k))) throw new Error('Eulerity recovery must be account1 and exactly the four approved org1 studios');
return accounts;
