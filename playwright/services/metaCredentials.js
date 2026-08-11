function brokerConfiguration() {
    const url = process.env.META_SECRET_BROKER_URL ||
        process.env.GA4_SECRET_BROKER_URL?.replace(/\/ga4-account\/?$/, "/meta-account") ||
        process.env.MNTN_SECRET_BROKER_URL?.replace(/\/mntn-account\/?$/, "/meta-account") ||
        process.env.PTS_SECRET_BROKER_URL?.replace(/\/pts-account\/?$/, "/meta-account");
    const token = process.env.META_SECRET_BROKER_TOKEN ||
        process.env.GA4_SECRET_BROKER_TOKEN ||
        process.env.MNTN_SECRET_BROKER_TOKEN ||
        process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) throw new Error("Meta credential broker is not configured");
    return { url, token };
}

async function resolveMetaAccount(accountId) {
    const normalized = Number(accountId);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) throw new Error("Meta account ID is invalid");
    const { url, token } = brokerConfiguration();
    const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ accountId: normalized }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Meta credential broker failed (${response.status})`);
    const body = await response.json();
    if (typeof body?.credentials?.access_token !== "string" || body.credentials.access_token.length < 20) {
        throw new Error("Meta Vault returned invalid credentials");
    }
    return {
        accountId: normalized,
        accessToken: body.credentials.access_token,
        account: body.account,
        targets: Array.isArray(body.targets) ? body.targets : []
    };
}

module.exports = { resolveMetaAccount };
