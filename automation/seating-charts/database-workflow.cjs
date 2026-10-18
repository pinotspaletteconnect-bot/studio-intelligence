'use strict';
const fs = require('node:fs');
const path = require('node:path');
function buildDatabaseWorkflow(query, label) {
  if (!query?.trim() || !label) throw Error('A reviewed SQL script and operation label are required');
  return { name: `03 - Seating Charts - STM database ${label}`, active: false,
    nodes: [
      { id: 'stm-db-manual', name: 'Manual approved database operation', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0,0], parameters: {} },
      { id: 'stm-db-query', name: 'Run reviewed SQL', type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [280,0],
        parameters: { operation: 'executeQuery', query, options: { queryBatching: 'single', connectionTimeout: 30 } },
        credentials: { postgres: { id: 'cQudCPHn5oTqSxiY', name: 'Postgres account' } } },
    ], connections: { 'Manual approved database operation': { main: [[{ node: 'Run reviewed SQL', type: 'main', index: 0 }]] } },
    settings: { executionOrder: 'v1', timezone: 'America/New_York', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none', saveManualExecutions: false } };
}
if (require.main === module) {
  const sql = fs.readFileSync(process.argv[2], 'utf8');
  fs.writeFileSync(path.join(__dirname,'03-stm-database-operation.json'),JSON.stringify(buildDatabaseWorkflow(sql,process.argv[3]),null,2)+'\n');
}
module.exports={buildDatabaseWorkflow};
