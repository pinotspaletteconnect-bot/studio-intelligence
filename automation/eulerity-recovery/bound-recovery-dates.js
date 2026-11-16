// RECOVERY COPY ONLY: insert immediately after Expand Daily Metrics AND repeat
// immediately before Upsert Eulerity Dialy Metrics as a final write boundary.
const start = '2026-11-09';
// $now is n8n Luxon; use the source reporting timezone, explicitly reviewed.
const end = $now.setZone('America/New_York').minus({ days: 1 }).toISODate();
const items = $input.all();
const output = [];
for (const item of items) {
  const studioId = Number(item.json.studio_id ?? item.json.studioId);
  if (![1, 2, 3, 4].includes(studioId)) throw new Error('Eulerity recovery is outside approved org1 studios');
  const date = item.json.report_date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Eulerity recovery has an invalid report date');
  if (date >= start && date <= end) output.push(item);
}
if (!output.length) throw new Error('Eulerity recovery has no metrics in the approved date window');
return output;
