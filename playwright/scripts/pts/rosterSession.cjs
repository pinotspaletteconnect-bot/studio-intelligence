'use strict';

// Dedicated fail-closed binding to the existing PTS login. No new credentials,
// credential rotation, or changes to the existing production collectors.
function createRosterSessionResolver({ chromium, resolveAccount, env = process.env }) {
  return async ({ accountId, studioId, classId,roomId }) => {
    if (!env.PTS_SEATING_ACCOUNT_ID || String(accountId) !== env.PTS_SEATING_ACCOUNT_ID || !env.PTS_SEATING_STUDIOS_JSON) {
      throw Error('Seating source account is not configured');
    }
    const studios = JSON.parse(env.PTS_SEATING_STUDIOS_JSON);
    if (!Array.isArray(studios) || studios.filter(s => s.studioId === studioId).length !== 1) throw Error('Studio is outside the configured seating account');
    const studio = studios.find(s => s.studioId === studioId);
    if(roomId!==undefined&&!(studio.sourceRoomIds??[studio.sourceRoomId]).includes(roomId))throw Error('Room outside configured seating scope');
    if (!studio.studioCode || !studio.sourceLocationLabel || !studio.sourceRoomId || !studio.allowedClassTypeIds?.length || typeof resolveAccount !== 'function') {
      throw Error('Missing verified source configuration');
    }
    // Reuse production's account-isolated Vault broker. Never fall back to a
    // shared legacy login just because the requested account cannot be resolved.
    let account;
    try { account = await resolveAccount(accountId); }
    catch { throw Object.assign(new Error('Source account resolution failed'), { sourceStage: 'account-resolve' }); }
    const mapping = account.studios?.find(s => s.studioId === studioId);
    if (!mapping || mapping.code !== studio.studioCode || !account.credentials?.username || !account.credentials?.password) {
      throw Error('Source account/studio mapping mismatch');
    }
    let browser;
    try { browser = await chromium.launch({ headless: true }); }
    catch { throw Object.assign(new Error('Source browser launch failed'), { sourceStage: 'browser-launch' }); }
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('https://admin.pinotspalette.com/Account/LogOn', { waitUntil: 'domcontentloaded' });
      await page.locator('#UserName').fill(account.credentials.username);
      await page.locator('#Password').fill(account.credentials.password);
      await Promise.all([
        page.waitForURL(url => !url.pathname.includes('/Account/LogOn')),
        page.getByRole('button', { name: 'Sign In' }).click(),
      ]);
      return { page, target: { ...studio, sourceLocationId:mapping.locationId, timeZone:mapping.timeZone,
        ...(roomId!==undefined?{sourceRoomId:roomId}:{}), accountId, studioId, classId: String(classId) }, close: () => browser.close() };
    } catch { await browser.close(); throw Object.assign(new Error('Source login failed'), { sourceStage: 'source-login' }); }
  };
}

module.exports = { createRosterSessionResolver };
