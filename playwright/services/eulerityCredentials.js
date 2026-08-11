function brokerConfiguration() {
    const url = process.env.EULERITY_SECRET_BROKER_URL ||
        process.env.PTS_SECRET_BROKER_URL?.replace(/\/pts-account\/?$/, "/eulerity-account");
    const token = process.env.EULERITY_SECRET_BROKER_TOKEN ||
        process.env.MNTN_SECRET_BROKER_TOKEN || process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) throw new Error("Eulerity credential broker is not configured");
    return { url, token };
}

async function resolveEulerityAccount(accountId) {
    const normalizedAccountId = Number(accountId);
    if (!Number.isSafeInteger(normalizedAccountId) || normalizedAccountId <= 0) {
        throw new Error("Eulerity account ID is invalid");
    }

    const { url, token } = brokerConfiguration();
    const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ accountId: normalizedAccountId }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Eulerity credential broker failed (${response.status})`);

    const account = await response.json();
    if (typeof account?.credentials?.email !== "string" || !account.credentials.email.includes("@") ||
        typeof account?.credentials?.password !== "string" || account.credentials.password.length < 1) {
        throw new Error("Eulerity Vault returned an invalid credential contract");
    }
    return {
        accountId: normalizedAccountId,
        email: account.credentials.email,
        password: account.credentials.password,
        account: account.account,
        targets: Array.isArray(account.targets) ? account.targets : []
    };
}

module.exports = { resolveEulerityAccount };
