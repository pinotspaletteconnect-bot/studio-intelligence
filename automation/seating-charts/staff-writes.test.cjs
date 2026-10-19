'use strict';
const {test}=require('node:test'); const assert=require('node:assert/strict');
const {STAFF_CELLS,staffAssignments,planStaffRefresh,verifyStaffReadback}=require('./staff-writes.cjs');
const source=rows=>({complete:true,expectedRowCount:rows.length,rows:rows.map((r,i)=>({assignmentId:String(i+1),...r}))});
const staff=(name,role,status='Scheduled')=>({name,role,status});
const blank=()=>({...STAFF_CELLS});
const plan=(s,cells=blank(),ledger={})=>planStaffRefresh({source:s,sheetName:'Seating Chart Main',cells,ledger});
test('scheduled instructors are Stage, assistants Floor, scheduled on-call never Floor',()=>{
 const p=plan(source([staff('Maya Stage','Instructor'),staff('Jordan Reserve','Assistant','Scheduled On-Call')]));
 assert.equal(p.expected.D5,'Stage: Maya'); assert.equal(p.expected.G6,'On-Call 1: Jordan'); assert.equal(p.expected.D6,'Floor 1:');
 assert.equal(p.data.length,2); assert.ok(p.data.every(w=>/!(D5|D6|D7|G6|G7)$/.test(w.range)));
});
test('normal assistants use Floor; on-call instructors use On Call; unconfirmed shifts are excluded',()=>{
 const p=plan(source([staff('Alex A','Instructor','Scheduled On-Call'),staff('Sam B','Assistant'),staff('Pat C','Assistant','Requested On-Call'),staff('Lee D','Instructor','Pending'),staff('Bar Person','Bartender')]));
 assert.equal(p.expected.G6,'On-Call 1: Alex');assert.equal(p.expected.D6,'Floor 1: Sam');assert.equal(p.expected.D5,'Stage:');
});
test('staff edits and formulas survive refresh; unchanged automated names can update or clear',()=>{
 const p=plan(source([staff('New Name','Instructor')]),{...blank(),D5:'Stage: Manual',G7:{formulaValue:'="manual"'}},{D5:'Stage: Old'});
 assert.equal(p.expected.D5,'Stage: Manual');assert.equal(p.review.length,2);assert.equal(p.data.length,0);
 const q=plan(source([]),{...blank(),D5:'Stage: Old'},{D5:'Stage: Old'});assert.equal(q.expected.D5,'Stage:');assert.equal(q.data.length,1);
});
test('repeat refresh writes nothing and retains staff ledger',()=>{
 const s=source([staff('Taylor Main','Instructor'),staff('Morgan Reserve','Assistant','Scheduled On-Call')]);const first=plan(s);
 const next=plan(s,first.expected,first.lastWritten);assert.equal(next.data.length,0);assert.deepEqual(next.lastWritten,first.lastWritten);
});
test('duplicate first names display full names; slot overflow does not truncate staff',()=>{
 assert.equal(staffAssignments(source([staff('Alex A','Assistant'),staff('Alex B','Instructor')])).D6,'Alex A');
 assert.throws(()=>plan(source([staff('A','Assistant'),staff('B','Assistant'),staff('C','Assistant')])));
});
test('incomplete source, duplicate assignments and unknown statuses cannot clear names',()=>{
 assert.throws(()=>plan({complete:false,rows:[],expectedRowCount:0}));
 const s=source([staff('A','Assistant'),staff('B','Assistant')]);s.rows[1].assignmentId='1';assert.throws(()=>plan(s));
 assert.throws(()=>plan(source([staff('A','Assistant','Unknown')])));
});
test('readback and immutable retry reject unexpected staff edits',()=>{
 const s=source([staff('A','Instructor')]);const p=plan(s);assert.equal(verifyStaffReadback(p,p.expected).staffVerified,true);
 assert.throws(()=>verifyStaffReadback(p,{...p.expected,D5:'Stage: Other'}));
 assert.equal(planStaffRefresh({source:s,sheetName:'Seating Chart Main',cells:p.expected,pending:p}),p);
 assert.throws(()=>planStaffRefresh({source:s,sheetName:'Seating Chart Main',cells:{...p.expected,D5:'Stage: Other'},pending:p}));
 const protectedFormula={...blank(),G7:{formulaValue:'="manual"'}};const preserved=plan(s,protectedFormula);
 assert.equal(planStaffRefresh({source:s,sheetName:'Seating Chart Main',cells:preserved.expected,pending:preserved}),preserved);
});
