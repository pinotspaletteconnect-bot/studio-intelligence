const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
function build(original) {
  const w = structuredClone(original);
  const originalNodes = new Map(original.nodes.map(n => [n.name, n]));
  const get = name => w.nodes.find(n => n.name === name);
  for (const name of ['Split by Metric', 'Transform Advertising Metrics']) assert.equal(get(name).disabled, true, `${name} must remain disabled`);
  w.nodes = w.nodes.filter(n => n.type !== 'n8n-nodes-base.scheduleTrigger');
  delete w.id; delete w.versionId; delete w.activeVersionId; delete w.createdAt; delete w.updatedAt; delete w.shared; delete w.tags; delete w.pinData;
  w.name = 'MANUAL ONLY - Eulerity account1 Nov9-15 recovery DRY RUN'; w.active = false;
  w.settings = { ...w.settings, executionOrder: 'v1' };
  const snippets = name => fs.readFileSync(path.join(__dirname, name), 'utf8').replace(/^\uFEFF/, '');
  const addCode = (name, code, position) => w.nodes.push({ id: crypto.randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position, parameters: { mode: 'runOnceForAllItems', jsCode: code } });
  const queries = (node, values) => { node.parameters.sendQuery = true; node.parameters.queryParameters = { parameters: Object.entries(values).map(([name, value]) => ({ name, value })) }; };
  const accounts = get('List Eulerity Accounts'); accounts.alwaysOutputData = true;
  queries(accounts, { select: 'organization_id,account_id,account_name,last_discovered_at', account_id: 'eq.1', organization_id: 'eq.1' });
  const snapshot = structuredClone(accounts); snapshot.id = crypto.randomUUID(); snapshot.name = 'Read Expected Eulerity Mappings'; snapshot.position = [0, 900]; snapshot.parameters.url = snapshot.parameters.url.replace('eulerity_collection_accounts', 'studio_integrations');
  queries(snapshot, { select: 'id,organization_id,studio_id,integration_type,is_active,configuration', id: 'in.(6,7,8,9)', organization_id: 'eq.1', studio_id: 'in.(1,2,3,4)', integration_type: 'eq.eulerity', is_active: 'eq.true', 'configuration->>eulerity_account_id': 'eq.1', order: 'id.asc' }); w.nodes.push(snapshot);
  addCode('Snapshot Expected Eulerity Targets', `const rows=$input.all();\nif(rows.length!==4)throw new Error('Expected exactly four verified mappings');\nreturn rows.map(({json:r})=>{if(r.integration_type!=='eulerity'||r.is_active!==true)throw new Error('Invalid mapping snapshot');return {json:{integration_id:r.id,organization_id:r.organization_id,studio_id:r.studio_id,account_id:Number(r.configuration?.eulerity_account_id),selector_key:r.configuration?.selector_key,selector_label:r.configuration?.selector_label}}});`, [220,900]);
  addCode('Accounts For Recovery', `return $('List Eulerity Accounts').all();`, [440,900]);
  addCode('Validate Recovery Scope', snippets('validate-recovery-scope.js'), [660,900]);
  addCode('Validate Discovery Before Sync', snippets('validate-discovery.js'), [1100,900]);
  get('Collect Each Mapped Account Once').parameters.jsCode = snippets('collect-mapped-accounts.js');
  get('Split by studio').parameters.jsCode = snippets('validate-results.js');
  for (const name of ['Discover Eulerity Locations', 'List Mapped Eulerity Targets', 'Railway']) get(name).alwaysOutputData = true;
  addCode('Bound Recovery Dates', snippets('bound-recovery-dates.js').replace("$now.setZone('America/New_York').minus({ days: 1 }).toISODate()", "'2026-11-15'"), [1100,1300]);
  addCode('Final Recovery Write Boundary', snippets('bound-recovery-dates.js').replace("$now.setZone('America/New_York').minus({ days: 1 }).toISODate()", "'2026-11-15'"), [1540,1300]);
  addCode('Dry Run Coverage Summary', `const items=$input.all();const keys=new Set();for(const {json:r} of items){const k=r.studio_id+':'+r.report_date;if(keys.has(k))throw new Error('Duplicate studio/date');keys.add(k);}for(const id of [1,2,3,4])for(let d=9;d<=15;d++){if(!keys.has(id+':2026-11-'+String(d).padStart(2,'0')))throw new Error('Incomplete approved studio/date coverage');}return [{json:{dryRun:true,warehouseWrites:false,sourceSyncWrites:false,accountId:1,studios:[1,2,3,4],fromDate:'2026-11-09',toDate:'2026-11-15',rowCount:items.length,rows:items.map(i=>i.json)}}];`, [1760,1300]);
  get('Sync Eulerity Locations').disabled = true; get('Upsert Eulerity Dialy Metrics').disabled = true;
  const link = (from,to) => { w.connections[from] = { main: [[{ node: to, type: 'main', index: 0 }]] }; };
  delete w.connections['Schedule Trigger']; delete w.connections['Sync Eulerity Locations']; delete w.connections['Upsert Eulerity Dialy Metrics'];
  link('List Eulerity Accounts','Read Expected Eulerity Mappings'); link('Read Expected Eulerity Mappings','Snapshot Expected Eulerity Targets'); link('Snapshot Expected Eulerity Targets','Accounts For Recovery'); link('Accounts For Recovery','Validate Recovery Scope'); link('Validate Recovery Scope','Discover Eulerity Locations'); link('Discover Eulerity Locations','Validate Discovery Before Sync'); link('Validate Discovery Before Sync','Accounts After Discovery');
  link('Expand Daily Metrics','Bound Recovery Dates'); link('Bound Recovery Dates','Attach Studio ID'); link('Attach Studio ID','Final Recovery Write Boundary'); link('Final Recovery Write Boundary','Dry Run Coverage Summary');
  // Credential objects and existing transformations are byte-for-byte equivalent.
  for(const [name,n] of originalNodes)if(get(name)){assert.deepEqual(get(name).credentials,n.credentials);}
  for(const name of ['Expand Daily Metrics','Attach Studio ID','Split by Metric','Transform Advertising Metrics']) assert.deepEqual(get(name).parameters,originalNodes.get(name).parameters);
  const reachable=new Set();const visit=name=>{if(reachable.has(name))return;reachable.add(name);for(const branch of w.connections[name]?.main||[])for(const edge of branch)visit(edge.node);};visit(w.nodes.find(n=>n.type==='n8n-nodes-base.manualTrigger').name);
  assert(!reachable.has('Sync Eulerity Locations'));assert(!reachable.has('Upsert Eulerity Dialy Metrics'));assert(reachable.has('Dry Run Coverage Summary'));assert(!w.nodes.some(n=>n.type==='n8n-nodes-base.scheduleTrigger'));assert.equal(w.active,false);
  return {workflow:w,manifest:{active:false,manualOnly:true,accountId:1,organizationId:1,studios:[1,2,3,4],mappingIds:[6,7,8,9],dates:['2026-11-09','2026-11-15'],sourceSyncReachable:false,warehouseUpsertReachable:false,credentialsPreserved:true,existingTransformationsPreserved:true,disabledPassThroughPreserved:true,reachableNodes:[...reachable],sourceVersion:original.versionId}};
}
if(require.main===module){const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Usage: node build-dry-run.cjs INPUT_EXPORT OUTPUT_OUTSIDE_REPO');const repoRoot=path.resolve(__dirname,'../..');const out=path.resolve(output);assert(!out.toLowerCase().startsWith(repoRoot.toLowerCase()+path.sep),'Export must remain outside tracked repository');const bytes=fs.readFileSync(input);const {workflow,manifest}=build(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')));fs.writeFileSync(out,JSON.stringify(workflow,null,2));const hash=b=>crypto.createHash('sha256').update(b).digest('hex');manifest.sourceSha256=hash(bytes);manifest.outputSha256=hash(fs.readFileSync(out));fs.writeFileSync(out+'.manifest.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify({output:out,manifest:out+'.manifest.json',checks:'passed'}));}
module.exports={build};
