'use strict';

const ORIGIN = 'https://admin.pinotspalette.com';

/** Account-isolated source HTTP session. Cookies and credentials stay in memory. */
class PtsHttpSession {
  constructor(credentials, fetchImpl = fetch) {
    this.credentials = credentials;
    this.fetchImpl = fetchImpl;
    this.cookies = new Map();
  }
  async request(resource, options = {}) {
    let url = new URL(resource, ORIGIN);
    if (url.origin !== ORIGIN) throw Error('PTS source origin mismatch');
    for (let redirect = 0; redirect < 8; redirect++) {
      const response = await this.fetchImpl(url, {
        ...options, redirect: 'manual', signal: AbortSignal.timeout(60000),
        headers: { ...options.headers, Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0], split = pair.indexOf('=');
        if (split > 0) this.cookies.set(pair.slice(0, split), pair.slice(split + 1));
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        url = new URL(response.headers.get('location'), url);
        if (url.origin !== ORIGIN) throw Error('PTS redirect origin mismatch');
        if ([301, 302, 303].includes(response.status)) options = {};
        continue;
      }
      if (!response.ok) throw Error(`PTS source request failed (${response.status})`);
      return response;
    }
    throw Error('PTS source redirect limit exceeded');
  }
  async login() {
    if (!this.credentials?.username || !this.credentials?.password) throw Error('PTS account credentials unavailable');
    const form = await (await this.request('/Account/LogOn')).text();
    const token = form.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
    const fields = { UserName: this.credentials.username, Password: this.credentials.password, RememberMe: 'false' };
    if (token) fields.__RequestVerificationToken = token;
    const result = await this.request('/Account/LogOn', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields),
    });
    if (result.url.includes('/Account/LogOn')) throw Error('PTS source login was not accepted');
    this.credentials = undefined;
  }
}
module.exports = { PtsHttpSession };
