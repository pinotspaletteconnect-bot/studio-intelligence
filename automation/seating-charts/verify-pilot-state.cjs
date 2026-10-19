'use strict';
// Read-only operational audit; prints counts/results, never source guest data.
const fs = require('node:fs');
const path = require('node:path');
const env = Object.fromEntries(fs.readFileSync(path.resolve(__dirname, '../../dashboard/.env.local'), 'utf8')
  .split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')];
  }));
const target = JSON.parse(fs.readFileSync(path.join(__dirname, 'stm-pilot-target.json'), 'utf8'));
async function read(resource) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${resource}`, {
    headers: { apikey: env.SUPABASE_SERVER_SECRET, Authorization: `Bearer ${env.SUPABASE_SERVER_SECRET}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error(`Operational audit HTTP ${response.status}`);
  return response.json();
}
(async () => {
  const [targets, runs] = await Promise.all([
    read(`seating_chart_targets?id=eq.${target.id}&select=id,enabled,revision,lease_run_id,lease_until,ledger,staff_ledger,config`),
    read(`seating_chart_refresh_runs?target_id=eq.${target.id}&select=run_id,status,target_revision,source,plan,result&order=created_at.asc`),
  ]);
  const completed = runs.filter(r => r.status === 'completed');
  const rowMap = ledger => JSON.stringify((ledger ?? []).map(r => [r.reservationKey, r.row]).sort((a,b) => a[0].localeCompare(b[0])));
  const summary = { completedRunCount: completed.length,
    stableRowsAcrossRuns: completed.length >= 2 && completed.every(r => rowMap(r.plan.ledger) === rowMap(targets[0].ledger)),
    allProtectedChecksPassed: completed.length > 0 && completed.every(r => r.result.seatingUnchanged === true && r.result.attendanceUnchanged === true && r.result.formulasUnchanged === true) };
  console.log(JSON.stringify({ summary, targets: targets.map(t => ({ id: t.id, enabled: t.enabled, revision: t.revision,
    leaseRunId: t.lease_run_id, leaseUntil: t.lease_until, ledgerCount: t.ledger.length,
    staffEnabled:t.config.staffUpdatesEnabled===true,staffLedger:t.staff_ledger,
    rowMap: t.ledger.map(r => ({ reservationKey: r.reservationKey, row: r.row, status: r.status })) })),
  runs: runs.map(r => ({ runId: r.run_id, status: r.status, revision: r.target_revision,
    sourceCount: r.source.rows?.length, writeRangeCount: r.plan?.request?.data?.length, result: r.result })) }, null, 2));
})().catch(() => { console.error('Pilot audit failed; no credentials or guest details were logged'); process.exitCode = 1; });
