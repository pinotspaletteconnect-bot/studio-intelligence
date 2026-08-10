function brokerConfiguration() {
    const url = process.env.MNTN_SECRET_BROKER_URL ||
        process.env.PTS_SECRET_BROKER_URL?.replace(/\/pts-account\/?$/, "/mntn-account");
    const token = process.env.MNTN_SECRET_BROKER_TOKEN || process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) throw new Error("MNTN credential broker is not configured");
    return { url, token };
}

async function resolveMntnAccount(accountId) {
    const normalizedAccountId = Number(accountId);
    if (!Number.isSafeInteger(normalizedAccountId) || normalizedAccountId <= 0) {
        throw new Error("MNTN account ID is invalid");
    }

    const { url, token } = brokerConfiguration();
    const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ accountId: normalizedAccountId }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`MNTN credential broker failed (${response.status})`);

    const account = await response.json();
    if (typeof account?.credentials?.apiKey !== "string" || account.credentials.apiKey.length < 8) {
        throw new Error("MNTN Vault returned an invalid credential contract");
    }
    if (!Array.isArray(account.targets) || account.targets.length !== 1) {
        throw new Error("MNTN account must have exactly one active advertiser mapping");
    }
    return { apiKey: account.credentials.apiKey, target: account.targets[0] };
}

module.exports = { resolveMntnAccount };
