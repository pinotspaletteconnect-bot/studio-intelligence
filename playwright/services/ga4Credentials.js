function brokerConfiguration() {
    const url = process.env.GA4_SECRET_BROKER_URL ||
        process.env.MNTN_SECRET_BROKER_URL?.replace(/\/mntn-account\/?$/, "/ga4-account") ||
        process.env.PTS_SECRET_BROKER_URL?.replace(/\/pts-account\/?$/, "/ga4-account");
    const token = process.env.GA4_SECRET_BROKER_TOKEN || process.env.MNTN_SECRET_BROKER_TOKEN || process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) throw new Error("GA4 credential broker is not configured");
    return { url, token };
}

async function resolveGa4Account(accountId) {
    const normalized = Number(accountId);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) throw new Error("GA4 account ID is invalid");
    const { url, token } = brokerConfiguration();
    const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ accountId: normalized }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`GA4 credential broker failed (${response.status})`);
    const body = await response.json();
    const credentials = body?.credentials;
    if (credentials?.type !== "service_account" || typeof credentials.client_email !== "string" ||
        typeof credentials.private_key !== "string") throw new Error("GA4 Vault returned an invalid service account");
    return { accountId: normalized, credentials, account: body.account, targets: Array.isArray(body.targets) ? body.targets : [] };
}

module.exports = { resolveGa4Account };
