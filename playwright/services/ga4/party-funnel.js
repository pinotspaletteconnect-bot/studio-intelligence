// Collection-only adapter. Call from governed ETL with configuration-resolved IDs.
const paths = {
  core: ['packages', 'eventdetails', 'choosedate', 'contact', 'checkout/', 'confirmation/'],
  addons: ['packages', 'eventdetails', 'choosedate', 'addons', 'contact', 'checkout/', 'confirmation/'],
  inquiry: ['packages', 'contactform'],
};

function buildFunnelRequest({ startDate, endDate, pathPrefix, variant = 'core' }) {
  if (!paths[variant] || !/^\/[a-z0-9-]+\/parties$/.test(pathPrefix)) throw new Error('Invalid funnel configuration');
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) throw new Error('Invalid period');
  return {
    dateRanges: [{ startDate, endDate }],
    dimensionFilter: { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'United States', caseSensitive: true } } },
    funnel: {
      isOpenFunnel: false,
      steps: paths[variant].map(path => ({
        name: path.replace('/', ''),
        isDirectlyFollowedBy: false,
        filterExpression: {
          andGroup: { expressions: [
            { funnelEventFilter: { eventName: 'page_view' } },
            // Explore funnel conditions do not support pagePath. Match the
            // supported path+query dimension without collecting query values.
            { funnelFieldFilter: { fieldName: 'pagePathPlusQueryString', stringFilter: {
              matchType: path.endsWith('/') ? 'BEGINS_WITH' : 'FULL_REGEXP',
              value: path.endsWith('/') ? `${pathPrefix}/${path}` : `^${pathPrefix}/${path}(\\?.*)?$`, caseSensitive: true,
            } } },
          ] },
        },
      })),
    },
  };
}

async function runPartyFunnel({ propertyId, accessToken, ...options }, fetchImpl = fetch) {
  if (!/^\d+$/.test(propertyId) || !accessToken) throw new Error('Missing GA4 access configuration');
  const body = buildFunnelRequest(options);
  const response = await fetchImpl(`https://analyticsdata.googleapis.com/v1alpha/properties/${propertyId}:runFunnelReport`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  // Never include upstream payloads, tokens or potentially identifying rows in errors.
  if (!response.ok) throw new Error(response.status === 403 ? 'GA4 funnel permission denied' : `GA4 funnel request failed (${response.status})`);
  return response.json();
}


function buildReachRequest({ startDate, endDate, pathPrefix, breakdown = 'total' }) {
  const { dimensionFilter: country } = buildFunnelRequest({ startDate, endDate, pathPrefix });
  const dimensions = { total: [], device: [{ name: 'deviceCategory' }], sourceMedium: [{ name: 'sessionSource' }, { name: 'sessionMedium' }] };
  if (!Object.hasOwn(dimensions, breakdown)) throw new Error('Invalid reach breakdown');
  return {
    dateRanges: [{ startDate, endDate }], dimensions: dimensions[breakdown],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
    dimensionFilter: { andGroup: { expressions: [country, { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: pathPrefix, caseSensitive: true } } }] } },
    limit: 10000,
  };
}

module.exports = { buildFunnelRequest, runPartyFunnel, buildReachRequest };
