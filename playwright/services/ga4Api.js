const crypto = require("crypto");

const tokenCache = new Map();

function base64Url(value) {
    return Buffer.from(value).toString("base64url");
}

function createAssertion(credentials, nowSeconds = Math.floor(Date.now() / 1000)) {
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64Url(JSON.stringify({
        iss: credentials.client_email,
        scope: "https://www.googleapis.com/auth/analytics.readonly",
        aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
        iat: nowSeconds,
        exp: nowSeconds + 3600
    }));
    const unsigned = `${header}.${payload}`;
    const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), credentials.private_key).toString("base64url");
    return `${unsigned}.${signature}`;
}

async function accessToken(credentials) {
    const cacheKey = credentials.client_email || credentials.refresh_token;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) return cached.token;
    const serviceAccount = credentials.type === "service_account";
    const tokenParameters = serviceAccount
        ? new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: createAssertion(credentials) })
        : new URLSearchParams({ grant_type: "refresh_token", refresh_token: credentials.refresh_token, client_id: credentials.client_id, client_secret: credentials.client_secret });
    const response = await fetch(credentials.token_uri || "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: tokenParameters,
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Google OAuth token request failed (${response.status})`);
    const tokenBody = await response.json();
    tokenCache.set(cacheKey, { token: tokenBody.access_token, expiresAt: Date.now() + Number(tokenBody.expires_in || 3600) * 1000 });
    return tokenBody.access_token;
}

async function googleJson(credentials, url, options = {}) {
    const token = await accessToken(credentials);
    const response = await fetch(url, {
        ...options,
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(options.headers || {}) },
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Google Analytics API failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    return response.json();
}

async function discoverGa4Properties(credentials) {
    const body = await googleJson(credentials, "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200");
    return (body.accountSummaries || []).flatMap(account => (account.propertySummaries || []).map(property => ({
        propertyId: String(property.property || "").replace(/^properties\//, ""),
        displayName: property.displayName,
        accountDisplayName: account.displayName
    }))).filter(property => /^\d+$/.test(property.propertyId) && property.displayName);
}

async function runGa4Report(credentials, propertyId, report) {
    if (!/^\d{1,30}$/.test(String(propertyId))) throw new Error("GA4 property ID is invalid");
    if (!report || typeof report !== "object" || Array.isArray(report)) throw new Error("GA4 report definition is invalid");
    return googleJson(credentials, `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: "POST", body: JSON.stringify(report)
    });
}

module.exports = { accessToken, createAssertion, discoverGa4Properties, runGa4Report };
