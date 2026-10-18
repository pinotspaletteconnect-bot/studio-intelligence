'use strict';

// Dedicated fail-closed binding to the existing PTS login. No new credentials,
// credential rotation, or changes to the existing production collectors.
function createRosterSessionResolver({ chromium, resolveAccount, env = process.env }) {
  return async ({ accountId, studioId, classId }) => {
    if (!env.PTS_SEATING_ACCOUNT_ID || String(accountId) !== env.PTS_SEATING_ACCOUNT_ID || !env.PTS_SEATING_STUDIOS_JSON) {
      throw Error('Seating source account is not configured');
    }
    const studios = JSON.parse(env.PTS_SEATING_STUDIOS_JSON);
    if (!Array.isArray(studios) || studios.filter(s => s.studioId === studioId).length !== 1) throw Error('Studio is outside the configured seating account');
    const studio = studios.find(s => s.studioId === studioId);
    if (!studio.studioCode || !studio.sourceLocationLabel || !studio.sourceRoomId || !studio.allowedClassTypeIds?.length || typeof resolveAccount !== 'function') {
      throw Error('Missing verified source configuration');
    }
    // Reuse production's account-isolated Vault broker. Never fall back to a
    // shared legacy login just because the requested account cannot be resolved.
    const account = await resolveAccount(accountId);
    const mapping = account.studios?.find(s => s.studioId === studioId);
    if (!mapping || mapping.code !== studio.studioCode || !account.credentials?.username || !account.credentials?.password) {
      throw Error('Source account/studio mapping mismatch');
    }
    const browser = await chromium.launch({ headless: true });
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
      return { page, target: { ...studio, accountId, studioId, classId: String(classId) }, close: () => browser.close() };
    } catch (error) { await browser.close(); throw error; }
  };
}

module.exports = { createRosterSessionResolver };
