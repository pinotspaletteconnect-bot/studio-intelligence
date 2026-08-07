function brokerConfiguration() {
    const baseUrl = process.env.CLASS_ALERT_CONTEXT_URL;
    const token = process.env.PTS_SECRET_BROKER_TOKEN;
    if (!baseUrl || !token) throw new Error("Class-alert context broker is not configured");
    return { baseUrl, token };
}

async function resolveClassAlertContext(ptsAccountId) {
    const accountId = Number(ptsAccountId);
    if (!Number.isSafeInteger(accountId) || accountId <= 0) throw new Error("PTS account ID is invalid");
    const { baseUrl, token } = brokerConfiguration();
    const response = await fetch(baseUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ ptsAccountId: accountId }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Class-alert context broker failed (${response.status})`);
    const context = await response.json();
    if (!context?.credentials?.username || !context?.credentials?.password || !Array.isArray(context.studios)) {
        throw new Error("Class-alert context is invalid");
    }
    return context;
}

module.exports = { resolveClassAlertContext };
