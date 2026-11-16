// Replacement: Split by studio, Run Once for All Items, after Railway.
const expected = $('Snapshot Expected Eulerity Targets').all().map(i => `${Number(i.json.account_id)}:${Number(i.json.studio_id)}`);
const seen = new Set(), output = [];
for (const item of $input.all()) {
  const result = item.json;
  if (result.success !== true || !Array.isArray(result.results) || !result.results.length || result.studioCount !== result.results.length) throw new Error('Eulerity collector returned empty or invalid results');
  for (const studio of result.results) {
    const key = `${Number(result.accountId)}:${Number(studio.studioId)}`;
    if (!expected.includes(key) || seen.has(key) || !Array.isArray(studio.metrics) || !studio.metrics.length || !Array.isArray(studio.spend) || !studio.spend.length) throw new Error('Eulerity collector omitted metrics or returned unexpected studios');
    seen.add(key); output.push({ json: studio });
  }
}
if (seen.size !== new Set(expected).size) throw new Error('Eulerity collection omitted an expected studio');
return output;
