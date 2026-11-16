// Owner-approved one-period manual rollout. No schedules. Bind existing private
// credentials in n8n UI; preserve the separate unbound design draft unchanged.
const fs = require('node:fs');
const path = require('node:path');
const { workflow: draft } = require('./build-party-workflow.cjs');
const normalize = structuredClone(draft.nodes.find(node => node.id === 'normalize'));
normalize.disabled = false;
normalize.position = [600, 0];
const nodes = [
  { id: 'manual', name: 'Manual controlled rollout only', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
  { id: 'target', name: 'Approved target and period', type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [200, 0], parameters: { operation: 'executeQuery', query: `select c.studio_id::text as "studioId", c.account_id::text as "accountId", c.property_id as "propertyId", c.path_prefix as "pathPrefix", c.definition_version as "definitionVersion", c.geography, false as "historyVerified", '2026-10-19'::text as "startDate", '2026-11-15'::text as "endDate", 'https://studio-intelligence-production.up.railway.app'::text as "collectorUrl" from public.ga4_party_funnel_configs c join public.ga4_collection_targets t on t.studio_id=c.studio_id and t.account_id=c.account_id and t.property_id=c.property_id where c.studio_id=1 and c.account_id=1 and c.property_id='354847068' and c.path_prefix='/louisville/parties' and c.definition_version=2 and c.geography='US' and c.enabled=false;`, options: {} } },
  { ...structuredClone(draft.nodes.find(node => node.id === 'collect')), disabled: false },
  normalize,
  { id: 'load', name: 'INSERT disabled until source reconciliation', type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [800, 0], disabled: true, parameters: { operation: 'executeQuery', query: `with inserted as (insert into public.ga4_party_funnel_periods (studio_id,property_id,period_start,period_end,definition_version,geography,retrieved_at,report,source_quality) values ($1::bigint,$2::text,$3::date,$4::date,$5::integer,$6::text,$7::timestamptz,$8::jsonb,$9::jsonb) on conflict (studio_id,property_id,period_start,period_end,definition_version,geography,retrieved_at) do nothing returning studio_id) select count(*)::integer as inserted_rows from inserted;`, options: { queryReplacement: '={{[$json.studio_id,$json.property_id,$json.period_start,$json.period_end,$json.definition_version,$json.geography,$json.retrieved_at,JSON.stringify($json.report),JSON.stringify($json.source_quality)]}}' } } },
];
const workflow = { name: 'MANUAL - Approved STM US party period Oct19-Nov15', active: false, nodes, connections: {}, settings: { executionOrder: 'v1', saveDataErrorExecution: 'none', saveDataSuccessExecution: 'none', saveManualExecutions: false } };
for (let i = 0; i < nodes.length - 1; i++) workflow.connections[nodes[i].name] = { main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]] };
if (require.main === module) fs.writeFileSync(path.join(__dirname, 'party-controlled-load.MANUAL.json'), JSON.stringify(workflow, null, 2) + '\n');
module.exports = { workflow };
