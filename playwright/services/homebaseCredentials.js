function brokerConfiguration() {
    const url = process.env.HOMEBASE_SECRET_BROKER_URL ||
        process.env.PTS_SECRET_BROKER_URL?.replace(/\/pts-account\/?$/, "/homebase-account");
    const token = process.env.HOMEBASE_SECRET_BROKER_TOKEN || process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) throw new Error("Homebase credential broker is not configured");
    return { url, token };
}

async function resolveHomebaseAccount(accountId) {
    const id = Number(accountId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Homebase account ID is invalid");
    const { url, token } = brokerConfiguration();
    const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ accountId: id }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Homebase credential broker failed (${response.status})`);
    const account = await response.json();
    if (typeof account?.credentials?.apiKey !== "string" || account.credentials.apiKey.length < 16) {
        throw new Error("Homebase Vault returned an invalid credential contract");
    }
    if (!account.target?.studio_id) throw new Error("Homebase account has no studio target");
    return { apiKey: account.credentials.apiKey, target: account.target };
}

module.exports = { resolveHomebaseAccount };
