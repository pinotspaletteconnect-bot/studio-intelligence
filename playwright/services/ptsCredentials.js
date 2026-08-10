function legacyCredentials() {
    if (!process.env.PTS_USERNAME || !process.env.PTS_PASSWORD) {
        throw new Error("PTS credentials are not configured");
    }
    return {
        username: process.env.PTS_USERNAME,
        password: process.env.PTS_PASSWORD,
        provider: "railway"
    };
}

function brokerConfiguration() {
    const url = process.env.PTS_SECRET_BROKER_URL;
    const token = process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) {
        throw new Error("PTS credential broker is not configured");
    }
    return { url, token };
}

async function resolvePtsAccount(accountId) {
    if (accountId === undefined || accountId === null || accountId === "") {
        return { credentials: legacyCredentials(), studios: null };
    }

    const normalizedAccountId = Number(accountId);
    if (!Number.isSafeInteger(normalizedAccountId) || normalizedAccountId <= 0) {
        throw new Error("PTS account ID is invalid");
    }

    const { url, token } = brokerConfiguration();
    const response = await fetch(url, {
        method: "POST",
        headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({ accountId: normalizedAccountId }),
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        throw new Error(`PTS credential broker failed (${response.status})`);
    }
    const account = await response.json();
    const secretValue = account?.credentials;
    if (
        !secretValue ||
        typeof secretValue.username !== "string" ||
        secretValue.username.length < 2 ||
        typeof secretValue.password !== "string" ||
        secretValue.password.length < 1
    ) {
        throw new Error("PTS Vault returned an invalid credential contract");
    }
    const targets = account?.studios;
    if (!Array.isArray(targets) || targets.length === 0) {
        throw new Error("PTS account has no active studio mappings");
    }

    return {
        credentials: {
            username: secretValue.username,
            password: secretValue.password,
            provider: "supabase_vault"
        },
        studios: targets.map(target => ({
            studioId: target.studioId,
            code: target.code,
            locationId: target.locationId,
            locationName: target.locationName,
            timeZone: target.timeZone,
            brandId: target.brandId,
            reports: Array.isArray(target.reports) ? target.reports : []
        }))
    };
}

module.exports = { resolvePtsAccount };
