'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=fs.readFileSync(path.join(__dirname,'migrations/002_staff_headers.sql'),'utf8');
const test=fs.readFileSync(path.join(__dirname,'database-staff-rollback-tests.sql'),'utf8');
fs.writeFileSync(path.join(__dirname,'database-staff-rollback-trial.sql'),base.replace(/commit;\s*$/i,()=>test));
