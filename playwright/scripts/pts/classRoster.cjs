'use strict';

const BASE = 'https://admin.pinotspalette.com';

async function readClass(page, classId) {
  await page.goto(`${BASE}/Class/Edit/${classId}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#ClassTypeId').waitFor();
  return page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('tr')).find(r => {
      const labels = Array.from(r.children).map(c => c.textContent.trim());
      return labels[0] === 'Maximum' && labels[2] === 'Reserved';
    });
    const counts = Array.from(row?.nextElementSibling?.children ?? []).map(c => c.textContent.trim());
    const locationCell = Array.from(document.querySelectorAll('td')).find(c => c.textContent.trim() === 'Location');
    return {
      title: document.querySelector('h2')?.textContent.trim(),
      locationLabel: locationCell?.nextElementSibling?.textContent.trim(),
      classTypeId: document.querySelector('#ClassTypeId')?.value,
      classTypeLabel: document.querySelector('#ClassTypeId option:checked')?.textContent.trim(),
      roomId: document.querySelector('#RoomId')?.value,
      dateText: document.querySelector('#ClassDate')?.value,
      startTimeText: document.querySelector('#ClassStartTime')?.value,
      endTimeText: document.querySelector('#ClassEndTime')?.value,
      reservedCount: /^\d+$/.test(counts[2] ?? '') ? Number(counts[2]) : null,
    };
  });
}

function assertClass(details, target) {
  if (details.locationLabel !== target.sourceLocationLabel ||
      details.roomId !== target.sourceRoomId ||
      !target.allowedClassTypeIds?.includes(details.classTypeId) ||
      details.classTypeLabel !== 'Regular' || !Number.isSafeInteger(details.reservedCount) || details.reservedCount < 0) {
    throw Error('Class location, public class type or reserved count could not be verified');
  }
}

async function readSeating(page, classId, expectedCount) {
  await page.goto(`${BASE}/Class/SeatingChart/${classId}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#gridSeatingChart table').waitFor();
  await page.waitForFunction(count => {
    const grid = document.querySelector('#gridSeatingChart');
    const loading = Array.from(grid?.querySelectorAll('.k-loading-mask') ?? []).some(e => e.getClientRects().length);
    const rows = grid?.querySelectorAll('tbody tr[data-uid]').length ?? -1;
    return !loading && rows === count;
  }, expectedCount, { timeout: 20000 });
  return page.locator('#gridSeatingChart').evaluate(grid => ({
    headers: Array.from(grid.querySelectorAll('th[data-field]')).map(c => c.textContent.trim()),
    rows: Array.from(grid.querySelectorAll('tbody tr[data-uid]')).map(row => Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim())),
    hasPaging: !!grid.querySelector('.k-pager-wrap'),
  }));
}

async function readOrderReservations(page, orderId, classId) {
  await page.goto(`${BASE}/Order/View/${orderId}`, { waitUntil: 'domcontentloaded' });
  const details = await page.locator('a[href]').evaluateAll((links, id) => links
    .filter(a => a.getAttribute('href') === `/Class/Edit/${id}`)
    .map(a => a.closest('tr')?.nextElementSibling)
    .filter(Boolean)
    .map(row => ({ gridId: row.querySelector('[id^="gridReserverations-"]')?.id,
      commentsId: row.querySelector('textarea[id^="Comments-"]')?.id })), classId);
  if (!details.length || details.some(d => !/^gridReserverations-\d+$/.test(d.gridId) || !/^Comments-\d+$/.test(d.commentsId))) {
    throw Error('Order does not contain the requested class reservation grid');
  }
  const result = [];
  for (const detail of details) {
    // The source renders the asynchronous grid without paging. Its active row
    // count is cross-checked against the full seating table by ETL.
    await page.locator(`#${detail.gridId} input[name="reservationCheckbox"]`).first().waitFor();
    const value = await page.locator(`#${detail.gridId}`).evaluate((grid, commentsId) => ({
      comments: document.getElementById(commentsId)?.value,
      hasPaging: !!grid.querySelector('.k-pager-wrap'),
      headers: Array.from(grid.querySelectorAll('th')).map(c => c.getAttribute('data-field')),
      rows: Array.from(grid.querySelectorAll('tbody tr[data-uid]')).map(row => ({
        reservationId: row.querySelector('input[name="reservationCheckbox"]')?.value,
        cells: Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim()),
      })),
    }), detail.commentsId);
    if (value.hasPaging || typeof value.comments !== 'string' ||
        JSON.stringify(value.headers.slice(0, 6)) !== JSON.stringify(['Id', 'Email', 'FirstName', 'LastName', 'StatusId', 'CheckInStatusId'])) {
      throw Error('Reservation grid shape changed or is paginated');
    }
    for (const row of value.rows) result.push({ sourceOrderId: orderId, reservationId: row.reservationId,
      guest: [row.cells[2], row.cells[3]].filter(Boolean).join(' '), guestEmail: row.cells[1],
      status: row.cells[4], comments: value.comments });
  }
  return result;
}

// Authentication/browser lifetime belong to the caller's existing account
// resolver. This collector has no Google, n8n or warehouse writes.
async function collectClassRoster({ page, target }) {
  if (!/^\d+$/.test(target?.classId) || !target.sourceLocationLabel || !target.sourceRoomId || !target.allowedClassTypeIds?.length) throw Error('Missing authorized class source configuration');
  const before = await readClass(page, target.classId);
  assertClass(before, target);
  const seating = await readSeating(page, target.classId, before.reservedCount);
  if (seating.hasPaging || seating.rows.length !== before.reservedCount || seating.rows.some(row => row.length !== 9 || !/^\d+$/.test(row[0]))) {
    throw Error('Seating source is incomplete');
  }
  const orderIds = [...new Set(seating.rows.map(row => row[0]))];
  const reservations = [];
  for (const orderId of orderIds) reservations.push(...await readOrderReservations(page, orderId, target.classId));
  const after = await readClass(page, target.classId);
  assertClass(after, target);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Class changed during collection; retry without writing');
  const confirmation = await readSeating(page, target.classId, after.reservedCount);
  if (JSON.stringify(seating) !== JSON.stringify(confirmation)) throw Error('Reservations changed during collection; retry without writing');
  return { classId: target.classId, studioCode: target.studioCode, complete: true, isPrivate: false,
    expectedRowCount: before.reservedCount, retrievedAt: new Date().toISOString(),
    details: before, headers: seating.headers, rows: seating.rows, reservations };
}

module.exports = { assertClass, readClass, readSeating, readOrderReservations, collectClassRoster };
