function brokerConfiguration() {
    const url = process.env.QUICKBOOKS_SECRET_BROKER_URL
        || process.env.GA4_SECRET_BROKER_URL?.replace(/\/ga4-account\/?$/, "/quickbooks-account")
        || process.env.MNTN_SECRET_BROKER_URL?.replace(/\/mntn-account\/?$/, "/quickbooks-account")
        || process.env.PTS_SECRET_BROKER_URL?.replace(/\/pts-account\/?$/, "/quickbooks-account");
    const token = process.env.QUICKBOOKS_SECRET_BROKER_TOKEN
        || process.env.GA4_SECRET_BROKER_TOKEN
        || process.env.MNTN_SECRET_BROKER_TOKEN
        || process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) throw new Error("QuickBooks credential broker is not configured");
    return { url, token };
}

async function resolveQuickBooksAccount(accountId) {
    const normalized = Number(accountId);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) {
        throw new Error("QuickBooks account ID is invalid");
    }
    const { url, token } = brokerConfiguration();
    const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ accountId: normalized }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`QuickBooks credential broker failed (${response.status})`);
    const body = await response.json();
    if (typeof body?.credentials?.refresh_token !== "string" || body.credentials.refresh_token.length < 10) {
        throw new Error("QuickBooks Vault returned invalid credentials");
    }
    if (!/^\d{1,40}$/.test(String(body?.account?.realm_id || ""))) {
        throw new Error("QuickBooks broker returned an invalid realm");
    }
    return {
        accountId: normalized,
        realmId: String(body.account.realm_id),
        credentials: body.credentials,
        account: body.account,
        targets: Array.isArray(body.targets) ? body.targets : []
    };
}

module.exports = { resolveQuickBooksAccount };

