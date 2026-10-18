'use strict';
const fs = require('node:fs');
const path = require('node:path');
const base = fs.readFileSync(path.join(__dirname, 'migrations/001_private_refresh_state.sql'), 'utf8');
const tests = fs.readFileSync(path.join(__dirname, 'database-rollback-tests.sql'), 'utf8');
if (!/commit;\s*$/i.test(base)) throw Error('Migration must end with COMMIT');
// A callback preserves PostgreSQL dollar quotes in the replacement text.
fs.writeFileSync(path.join(__dirname, 'database-rollback-trial.sql'), base.replace(/commit;\s*$/i, () => tests));
