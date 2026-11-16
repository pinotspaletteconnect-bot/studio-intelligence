const DAY_MS = 86400000;
const METRIC_COLUMNS = ['Date', ...['Impressions', 'Clicks', 'Ctr'].flatMap(metric => ['Display', 'Search', 'Social', 'Video', 'Other', 'Total'].map(channel => `${channel} ${metric}`))];
const SPEND_COLUMNS = ['Business Name', 'Campaign Name', 'User', 'Date', 'Spend', 'Activation Date'];
function isoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Eulerity recovery requires ISO calendar dates');
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Eulerity recovery date is invalid');
    return value;
}
function recoveryRange(fromDate, toDate, today = new Date().toISOString().slice(0, 10)) {
    isoDate(fromDate); isoDate(toDate); isoDate(today);
    const count = (Date.parse(toDate) - Date.parse(fromDate)) / DAY_MS + 1;
    if (count < 1 || count > 31 || toDate >= today) throw new Error('Eulerity recovery requires 1-31 completed calendar days');
    return { fromDate, toDate, dates: Array.from({ length: count }, (_, i) => new Date(Date.parse(fromDate) + i * DAY_MS).toISOString().slice(0, 10)) };
}
function sourceDate(value) {
    const s = String(value ?? '').trim();
    if (/^\d{8}$/.test(s)) return isoDate(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (!match) throw new Error('Eulerity CSV has an unsupported source date');
    return isoDate(`${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`);
}
function exactCoverage(rows, range, field, normalize = isoDate) {
    if (!Array.isArray(rows) || rows.length !== range.dates.length) throw new Error('Eulerity CSV does not cover the complete requested range');
    const seen = new Set();
    for (const row of rows) {
        const date = normalize(row[field]);
        if (!range.dates.includes(date) || seen.has(date)) throw new Error('Eulerity CSV contains duplicate or unexpected source dates');
        seen.add(date);
    }
    return range.dates.slice();
}
function validateTargets(targets) {
    if (!Array.isArray(targets) || targets.length !== 4) throw new Error('Eulerity recovery requires all four approved studio targets');
    const studios = new Set(), keys = new Set(), codes = new Set();
    for (const target of targets) {
        if (Number(target.account_id) !== 1 || Number(target.organization_id) !== 1 || ![1, 2, 3, 4].includes(Number(target.studio_id)) || studios.has(Number(target.studio_id)) ||
            typeof target.selector_key !== 'string' || !target.selector_key || target.selector_key === '__single__' || keys.has(target.selector_key) ||
            typeof target.selector_label !== 'string' || !target.selector_label.trim() || typeof target.studio_code !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(target.studio_code) || codes.has(target.studio_code)) {
            throw new Error('Eulerity recovery target scope or identity is invalid');
        }
        studios.add(Number(target.studio_id)); keys.add(target.selector_key); codes.add(target.studio_code);
    }
}
function numericCell(value) {
    if (value === undefined || value === null || !String(value).trim()) throw new Error('Eulerity CSV has a missing numeric value');
    const number = Number(String(value).replace(/[$,%]/g, '').trim());
    if (!Number.isFinite(number) || number < 0) throw new Error('Eulerity CSV has an invalid numeric value');
    return number;
}
async function validatedRecoveryReports(item, target, range, parser) {
    const evidence = item.sourceEvidence;
    const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!evidence || evidence.selectorKey !== target.selector_key || !normalize(evidence.displayName) ||
        !['metricsRange', 'spendRange'].every(key => evidence[key]?.fromDate === range.fromDate && evidence[key]?.toDate === range.toDate)) {
        throw new Error('Eulerity source range/campaign verification is missing');
    }
    const [rawMetrics, rawSpend] = await Promise.all([parser.loadCSV(item.metricsFile), parser.loadCSV(item.spendFile)]);
    for (const [rows, columns] of [[rawMetrics, METRIC_COLUMNS], [rawSpend, SPEND_COLUMNS]]) {
        exactCoverage(rows, range, 'Date', sourceDate);
        for (const row of rows) for (const column of columns) if (!Object.hasOwn(row, column)) throw new Error('Eulerity CSV required source columns are missing');
    }
    for (const row of rawMetrics) for (const column of METRIC_COLUMNS.filter(c => c !== 'Date')) {
        const number = numericCell(row[column]);
        if (!column.endsWith('Ctr') && !Number.isSafeInteger(number)) throw new Error('Eulerity CSV counts are not integers');
    }
    for (const row of rawSpend) {
        numericCell(row.Spend);
        if (normalize(row['Campaign Name']) !== normalize(evidence.displayName)) throw new Error('Eulerity spend CSV belongs to another campaign');
    }
    const [metrics, parsedSpend] = await Promise.all([parser.parseMetrics(item.metricsFile), parser.parseSpend(item.spendFile)]);
    exactCoverage(metrics, range, 'report_date'); exactCoverage(parsedSpend, range, 'report_date');
    for (let i = 0; i < metrics.length; i++) {
        if (metrics[i].report_date !== sourceDate(rawMetrics[i].Date)) throw new Error('Eulerity parser changed a source report date');
        for (const [key, value] of Object.entries(metrics[i])) if (key !== 'report_date' && (!Number.isFinite(value) || value < 0)) throw new Error('Eulerity parsed metrics are invalid');
        for (const column of METRIC_COLUMNS.filter(c => c !== 'Date')) {
            const [channel, metric] = column.split(' ');
            if (metrics[i][`${metric.toLowerCase()}_${channel.toLowerCase()}`] !== numericCell(rawMetrics[i][column])) throw new Error('Eulerity parser changed a source metric value');
        }
    }
    for (let i = 0; i < parsedSpend.length; i++) if (parsedSpend[i].report_date !== sourceDate(rawSpend[i].Date) || parsedSpend[i].spend !== numericCell(rawSpend[i].Spend) ||
        normalize(parsedSpend[i].campaign_name) !== normalize(evidence.displayName)) throw new Error('Eulerity parser changed source spend/date/campaign');
    return {
        metrics,
        spend: parsedSpend.map(({ report_date, spend, campaign_name }) => ({ report_date, spend, campaign_name })),
        // Current budget distribution is not dated historical evidence.
        budget: null,
        historicalChannelSpend: null,
        costAllocationStatus: 'unverified',
        sourceEvidence: { ...evidence, sourceDatesVerified: true, metricsDates: range.dates, spendDates: range.dates }
    };
}
module.exports = { METRIC_COLUMNS, SPEND_COLUMNS, isoDate, recoveryRange, sourceDate, exactCoverage, validateTargets, validatedRecoveryReports };
