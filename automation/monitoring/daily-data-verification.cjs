'use strict';

// Read-only warehouse checks. Never run collectors, RPCs, SQL writes or repairs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const shift = (day, n) => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function easternDate(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function analyze({ targets, daily, classes, products, laborTargets, labor, errors = [] }, { start, end }) {
  const issues = errors.map(x => ({ code: 'query_failed', source: x.source, message: x.message }));
  const dailyMap = new Map(), classMap = new Map(), productDays = new Set(), laborDays = new Set();
  const key = r => `${r.studio_id}:${r.report_date || r.event_date || r.labor_date}`;
  const num = x => Number.isFinite(Number(x)) ? Number(x) : 0;
  for (const row of daily) {
    if (dailyMap.has(key(row))) issues.push({ code: 'duplicate_daily', studioId: row.studio_id, date: row.report_date });
    dailyMap.set(key(row), row);
  }
  const sourceClasses = new Map();
  for (const row of classes) {
    classMap.set(key(row), (classMap.get(key(row)) || 0) + num(row.seats_sold));
    const sourceId = String(row.raw_payload?.classid ?? '').trim();
    if (!/^[1-9][0-9]*$/.test(sourceId)) continue;
    const identity = [row.organization_id ?? '', row.studio_id, sourceId].join(':');
    const versions = sourceClasses.get(identity) || [];
    versions.push(row); sourceClasses.set(identity, versions);
  }
  for (const versions of sourceClasses.values()) if (versions.length > 1) {
    versions.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || Number(b.id) - Number(a.id));
    issues.push({ code: 'duplicate_class_identity', studioId: versions[0].studio_id,
      date: versions[0].event_date, sourceClassId: String(versions[0].raw_payload.classid).trim(),
      rowIds: versions.map(r => r.id), extraSeats: versions.slice(1).reduce((n, r) => n + num(r.seats_sold), 0) });
  }
  for (const row of products) productDays.add(key(row));
  for (const row of labor) laborDays.add(key(row));
  const failed = new Set(errors.map(x => x.source));
  const uniqueTargets = [...new Map(targets.map(t => [t.studio_id, t])).values()];
  if (!failed.has('targets') && !uniqueTargets.length) issues.push({ code: 'no_active_pts_targets' });
  for (const target of uniqueTargets) {
    for (let date = start; date <= end; date = shift(date, 1)) {
      const k = `${target.studio_id}:${date}`, row = dailyMap.get(k), seats = classMap.get(k);
      const base = { studioId: target.studio_id, studio: target.studio_name, date };
      if (!failed.has('daily') && !row) issues.push({ ...base, code: 'missing_daily_summary', availableClassSeats: failed.has('classes') ? null : seats ?? 0 });
      if (row && !failed.has('classes') && Math.abs(num(row.class_reported_seats_sold) - (seats ?? 0)) > 0.0001) issues.push({ ...base, code: 'class_seat_mismatch', reportingSeats: num(row.class_reported_seats_sold), classSeats: seats ?? 0 });
      // Attendance is a different source metric; it is not required to equal seats.
      if (row && !failed.has('classes') && num(row.class_sales) > 0 && !classMap.has(k)) issues.push({ ...base, code: 'sales_without_class_detail', classSales: num(row.class_sales) });
      if (row && !failed.has('products') && !failed.has('historicalProducts') && num(row.alcohol_sales) + num(row.other_product_sales) > 0 && !productDays.has(k)) issues.push({ ...base, code: 'product_detail_unverified' });
    }
  }
  for (const target of new Map(laborTargets.map(t => [t.studio_id, t])).values()) {
    for (let date = start; date <= end; date = shift(date, 1)) {
      if (!failed.has('labor') && !laborDays.has(`${target.studio_id}:${date}`)) issues.push({ code: 'missing_labor_day', studioId: target.studio_id, date });
    }
  }
  issues.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { period: { start, end }, studioCount: uniqueTargets.length, status: errors.length ? 'verification_failed' : issues.length ? 'attention' : 'checks_passed', issues,
    fingerprint: createHash('sha256').update(JSON.stringify(issues)).digest('hex'),
    limits: 'Warehouse coverage and cross-table reconciliation only. Empty class/product days are not certified as successful imports. No repairs or source collection performed.' };
}
async function readPages(makeQuery, maxRows = 100000) {
  const rows = [];
  for (;;) {
    const r = await makeQuery().range(rows.length, rows.length + 999).abortSignal(AbortSignal.timeout(30000));
    if (r.error) throw new Error(r.error.message);
    if (!r.data?.length) return rows;
    rows.push(...r.data);
    if (rows.length > maxRows) throw new Error('Verification row limit exceeded; partial results rejected');
  }
}
async function main() {
  // Reuse existing local access without displaying or copying its values.
  const envFile = path.join(root, 'dashboard/.env.local');
  if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVER_SECRET) throw new Error('Warehouse access unavailable');
  const { createClient } = require(path.join(root, 'dashboard/node_modules/@supabase/supabase-js'));
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVER_SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
  const end = shift(easternDate(), -1), start = shift(end, -13);
  const range = (table, columns, dateColumn, order) => () => db.from(table).select(columns).gte(dateColumn, start).lte(dateColumn, end).order(dateColumn).order(order);
  const definitions = {
    targets: () => db.from('pts_collection_targets').select('studio_id,studio_name').order('studio_id').order('account_id'),
    daily: range('pts_daily_operations_reporting', 'studio_id,report_date,seats_sold,class_reported_seats_sold,class_sales,alcohol_sales,other_product_sales', 'report_date', 'studio_id'),
    classes: range('pts_class_sales_reporting', 'id,organization_id,studio_id,event_date,seats_sold,raw_payload,updated_at', 'event_date', 'id'),
    products: range('pts_product_sales_reporting', 'id,studio_id,report_date', 'report_date', 'id'),
    historicalProducts: range('pts_product_sales_daily_reporting', 'id,studio_id,report_date', 'report_date', 'id'),
    laborTargets: () => db.from('homebase_collection_targets').select('studio_id').order('studio_id'),
    labor: range('homebase_labor_daily_reporting', 'studio_id,labor_date', 'labor_date', 'studio_id'),
  };
  const input = { errors: [] };
  await Promise.all(Object.entries(definitions).map(async ([source, query]) => {
    try { input[source] = await readPages(query); }
    catch (e) { input[source] = []; input.errors.push({ source, message: e.message }); }
  }));
  input.products.push(...input.historicalProducts);
  const result = { checkedAt: new Date().toISOString(), ...analyze(input, { start, end }) };
  const dir = path.join(root, 'output/data-verification');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, easternDate() + '.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (input.errors.length) process.exitCode = 1;
}
module.exports = { analyze, readPages, easternDate };
if (require.main === module) main().catch(e => { console.error('Daily verification failed: ' + e.message); process.exitCode = 1; });
