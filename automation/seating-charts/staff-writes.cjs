'use strict';
const STAFF_CELLS = { D5: 'Stage:', D6: 'Floor 1:', D7: 'Floor 2:', G6: 'On-Call 1:', G7: 'On-Call 2:' };
const STAFF_STATUSES = ['Pending','Requested','Requested On-Call','Scheduled On-Call','Scheduled','Unavailable','Cancelled Shift','Moved','Deleted'];
function staffAssignments(source) {
  if (source?.complete !== true || !Array.isArray(source.rows) || source.rows.length !== source.expectedRowCount) throw Error('Incomplete assigned staff source');
  const seen = new Set(), rows = source.rows.map(r => {
    if (!/^\d+$/.test(r.assignmentId) || seen.has(r.assignmentId) || !r.name?.trim() || !r.role || !STAFF_STATUSES.includes(r.status)) throw Error('Invalid assigned staff source');
    seen.add(r.assignmentId); return { ...r, name: r.name.trim().replace(/\s+/g,' ') };
  });
  const relevant = rows.filter(r => ['Instructor','Assistant'].includes(r.role) && ['Scheduled','Scheduled On-Call'].includes(r.status));
  const firstNames = relevant.map(r => r.name.split(' ')[0]);
  const display = r => firstNames.filter(n => n === r.name.split(' ')[0]).length > 1 ? r.name : r.name.split(' ')[0];
  relevant.sort((a,b) => a.assignmentId.localeCompare(b.assignmentId,'en',{numeric:true}));
  const stage = relevant.filter(r => r.role === 'Instructor' && r.status === 'Scheduled').map(display);
  const floor = relevant.filter(r => r.role === 'Assistant' && r.status === 'Scheduled').map(display);
  const onCall = relevant.filter(r => r.status === 'Scheduled On-Call').map(display);
  if (floor.length > 2 || onCall.length > 2) throw Error('Staff assignments exceed template slots; review required');
  return { D5: stage.join(', '), D6: floor[0] ?? '', D7: floor[1] ?? '', G6: onCall[0] ?? '', G7: onCall[1] ?? '' };
}
function planStaffRefresh({ source, sheetName, cells, ledger = {}, pending = null }) {
  const desired = staffAssignments(source), lastWritten = { ...ledger }, expected = {}, review = [], data = [];
  for (const [cell,label] of Object.entries(STAFF_CELLS)) {
    if (!Object.hasOwn(cells,cell)) throw Error('Missing staff destination read');
    const live = cells[cell];
    const value = !desired[cell] && typeof live==='string' && live.trim()===label ? live : label + (desired[cell] ? ' ' + desired[cell] : '');
    if (pending) {
      if (JSON.stringify(live) === JSON.stringify(pending.expected[cell])) continue;
      const previous = ledger[cell];
      if (typeof live !== 'string' || live !== pending.expected[cell] && live !== previous && !(live.trim() === label && !Object.hasOwn(ledger,cell))) throw Error('Pending staff update conflicts with manual edit');
      continue;
    }
    // First adoption is limited to bare template labels or the exact source
    // value. Later updates require the last automation value to remain intact.
    if (typeof live !== 'string' || !(live === ledger[cell] || live === value || live.trim() === label && !Object.hasOwn(ledger,cell))) {
      expected[cell] = live; review.push({ cell, reason: 'manual-staff-edit-preserved' }); continue;
    }
    expected[cell] = value; lastWritten[cell] = value;
    if (live !== value) data.push({ range: `'${sheetName.replace(/'/g,"''")}'!${cell}`, values: [[value]] });
  }
  return pending ?? { expected, lastWritten, review, data };
}
function verifyStaffReadback(plan, after) {
  for (const cell of Object.keys(STAFF_CELLS)) if (JSON.stringify(after[cell]) !== JSON.stringify(plan.expected[cell])) throw Error('Staff header readback mismatch');
  return { staffVerified: true, staffChangedCount: plan.data.length, staffReviewCount: plan.review.length };
}
module.exports = { STAFF_CELLS, staffAssignments, planStaffRefresh, verifyStaffReadback };
