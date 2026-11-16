const { buildFunnelRequest } = require('../../playwright/services/ga4/party-funnel');
const paths = { core: ['packages','eventdetails','choosedate','contact','checkout/','confirmation/'], addons: ['packages','eventdetails','choosedate','addons','contact','checkout/','confirmation/'], inquiry: ['packages','contactform'] };
// Private ETL export model for a Looker Studio governed data source. Input counts
// must be validated whole-period runFunnelReport activeUsers, never daily sums.
function exportPeriodRows({ startDate, endDate, pathPrefix, variant = 'core', comparisonType, activeUsers }) {
  buildFunnelRequest({ startDate, endDate, pathPrefix, variant });
  if (!['selected', 'previous', 'rolling28', 'rolling28Previous', 'yearOverYear'].includes(comparisonType)) throw new Error('Invalid comparison');
  if (!Array.isArray(activeUsers) || activeUsers.length !== paths[variant].length || activeUsers.some((value, index) => !Number.isSafeInteger(value) || value < 0 || (index > 0 && value > activeUsers[index - 1]))) throw new Error('Invalid sequential counts');
  return activeUsers.map((users, index) => {
    const next = activeUsers[index + 1];
    return {
      periodStart: startDate, periodEnd: endDate, comparisonType, route: variant,
      stepOrder: index + 1, stepName: paths[variant][index].replace('/', ''), activeUsers: users,
      completionRate: next === undefined || users === 0 ? null : next / users,
      abandonment: next === undefined ? null : users - next,
      abandonmentRate: next === undefined || users === 0 ? null : (users - next) / users,
      definitionVersion: 2, geography: 'US',
    };
  });
}

function parseFunnelResponse(response, options) {
  const expected = buildFunnelRequest(options).funnel.steps.map(step => step.name);
  const table = response?.funnelTable;
  const metadata = table?.metadata || {};
  const unavailable = reason => ({ status: 'unavailable', reason, rows: [], quality: {
    sampled: Boolean(metadata.samplingMetadatas?.length), thresholded: metadata.subjectToThresholding === true ? true : null,
  } });
  if (!table) return unavailable('missing_table');
  if (metadata.samplingMetadatas?.length || metadata.subjectToThresholding || metadata.dataLossFromOtherRow || metadata.emptyReason) return unavailable('limited_source_data');
  if (!Array.isArray(table.rows) || table.rows.length === 0) return unavailable('no_rows');
  const dimensions = table.dimensionHeaders?.map(header => header.name);
  const widths = new Set(table.rows.map(row => row.metricValues?.length));
  const width = table.rows[0].metricValues?.length;
  let headers = table.metricHeaders;
  if (!width || widths.size !== 1 || !Array.isArray(headers)) return unavailable('malformed_metric_width');
  // Observed alpha API shape: the full identical header block appears twice,
  // while every row has one block of values. Accept only this exact redundancy.
  if (headers.length === width * 2 && JSON.stringify(headers.slice(0, width)) === JSON.stringify(headers.slice(width))) headers = headers.slice(0, width);
  if (headers.length !== width) return unavailable('ambiguous_metric_headers');
  const metrics = headers.map(header => header.name);
  if (!dimensions || !metrics || new Set(dimensions).size !== dimensions.length || new Set(metrics).size !== metrics.length || !dimensions.includes('funnelStepName') || !metrics.includes('activeUsers')) return unavailable('invalid_headers');
  // Segment/date/next-action reports are different grains, not period totals.
  if (dimensions.some(name => !['funnelStepName', 'deviceCategory'].includes(name))) return unavailable('unsupported_grain');
  if (table.rowCount !== undefined && table.rowCount !== table.rows.length) return unavailable('incomplete_rows');
  const stepIndex = dimensions.indexOf('funnelStepName');
  const deviceIndex = dimensions.indexOf('deviceCategory');
  const userIndex = metrics.indexOf('activeUsers');
  const seen = new Set();
  const counts = new Array(expected.length);
  for (const row of table.rows) {
    if (row.dimensionValues?.length !== dimensions.length || row.metricValues?.length !== metrics.length) return unavailable('malformed_row');
    const step = row.dimensionValues[stepIndex]?.value;
    const index = expected.findIndex((name, i) => step === `${i + 1}. ${name}`);
    const device = deviceIndex < 0 ? 'RESERVED_TOTAL' : row.dimensionValues[deviceIndex]?.value;
    const key = `${index}:${device}`;
    const raw = row.metricValues[userIndex]?.value;
    if (index < 0 || typeof device !== 'string' || seen.has(key) || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return unavailable('invalid_or_duplicate_row');
    seen.add(key);
    if (device === 'RESERVED_TOTAL') counts[index] = Number(raw);
  }
  // Never sum device rows to synthesize unique totals; require one total per step.
  if (counts.filter(value => value !== undefined).length !== expected.length) return unavailable('missing_steps_or_totals');
  try {
    return { status: 'available', reason: null, quality: { sampled: false, thresholded: null }, rows: exportPeriodRows({ ...options, activeUsers: counts }) };
  } catch { return unavailable('invalid_sequential_counts'); }
}


function parseReach(response, dimensions) {
  const metadata = response?.metadata || {};
  if (metadata.subjectToThresholding || metadata.samplingMetadatas?.length || metadata.dataLossFromOtherRow || metadata.emptyReason) return null;
  if (JSON.stringify(response?.dimensionHeaders?.map(h => h.name) || []) !== JSON.stringify(dimensions)) return null;
  const metrics = response.metricHeaders?.map(h => h.name) || [];
  const views = metrics.indexOf('screenPageViews'); const users = metrics.indexOf('totalUsers');
  if (new Set(metrics).size !== metrics.length || views < 0 || users < 0 || !response.rows?.length || (response.rowCount != null && response.rowCount !== response.rows.length)) return null;
  const seen = new Set(); const rows = [];
  for (const row of response.rows) {
    if ((row.dimensionValues?.length || 0) !== dimensions.length || row.metricValues?.length !== metrics.length) return null;
    const labels = (row.dimensionValues || []).map(v => v.value);
    const key = JSON.stringify(labels);
    const values = [row.metricValues[views]?.value, row.metricValues[users]?.value];
    if (seen.has(key) || labels.some(v => typeof v !== 'string' || v === '(other)') || values.some(v => !/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)))) return null;
    seen.add(key); rows.push({ name: labels[0], medium: labels[1], views: Number(values[0]), users: Number(values[1]) });
  }
  return rows;
}

function normalizePeriodBundle(bundle, { studioId, propertyId, pathPrefix, historyVerified = false }) {
  if (!bundle?.success || bundle.definitionVersion !== 2 || bundle.geography !== 'US' || String(bundle.target?.studio_id) !== String(studioId) || String(bundle.target?.property_id) !== String(propertyId) || bundle.pathPrefix !== pathPrefix || !Number.isFinite(Date.parse(bundle.retrievedAt))) throw new Error('Mismatched source bundle');
  const routes = {}; const lookerRows = [];
  for (const variant of ['core', 'addons', 'inquiry']) {
    const result = parseFunnelResponse(bundle.source?.[variant], { ...bundle.period, pathPrefix, variant, comparisonType: 'selected' });
    if (result.status !== 'available') return { status: 'unavailable', reason: result.reason, report: null, lookerRows: [] };
    routes[variant] = result.rows.map(row => row.activeUsers);
    lookerRows.push(...result.rows.map(row => ({ ...row, studioId: String(studioId), propertyId: String(propertyId), retrievedAt: bundle.retrievedAt })));
  }
  const total = parseReach(bundle.reach?.total, []);
  const device = parseReach(bundle.reach?.device, ['deviceCategory']);
  const sourceMedium = parseReach(bundle.reach?.sourceMedium, ['sessionSource', 'sessionMedium']);
  const report = { studioId: String(studioId), period: bundle.period, definitionVersion: 2, geography: 'US', availability: 'verified', historyVerified, retrievedAt: bundle.retrievedAt, routes,
    reach: total?.length === 1 ? { views: total[0].views, periodUniqueUsers: total[0].users } : null,
    ...(device && sourceMedium ? { breakdowns: { device: device.map(({ name, views, users }) => ({ name, views, users })), sourceMedium } } : {}),
  };
  return { status: 'available', report, lookerRows };
}

module.exports = { exportPeriodRows, parseFunnelResponse, parseReach, normalizePeriodBundle };
