const TRANSACTION_ENTITIES = Object.freeze([
    "Bill", "BillPayment", "CreditCardPayment", "Deposit",
    "JournalEntry", "Purchase", "Transfer", "VendorCredit"
]);

function configuration() {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    const environment = process.env.QUICKBOOKS_ENVIRONMENT || "sandbox";
    if (!clientId || !clientSecret) throw new Error("QuickBooks API client is not configured");
    if (!["sandbox", "production"].includes(environment)) throw new Error("QuickBooks environment is invalid");
    return {
        clientId,
        clientSecret,
        apiBaseUrl: environment === "production"
            ? "https://quickbooks.api.intuit.com"
            : "https://sandbox-quickbooks.api.intuit.com"
    };
}

async function refreshAccessToken(credentials, fetchImpl = fetch) {
    const { clientId, clientSecret } = configuration();
    if (typeof credentials?.refresh_token !== "string" || credentials.refresh_token.length < 10) {
        throw new Error("QuickBooks refresh credential is invalid");
    }
    const response = await fetchImpl("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
            accept: "application/json",
            authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: credentials.refresh_token }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`QuickBooks token refresh failed (${response.status})`);
    const body = await response.json();
    if (typeof body?.access_token !== "string" || body.access_token.length < 10) {
        throw new Error("QuickBooks token response is invalid");
    }
    return body.access_token;
}

async function quickBooksGet(realmId, accessToken, path, fetchImpl = fetch) {
    const { apiBaseUrl } = configuration();
    if (!/^\d{1,40}$/.test(String(realmId))) throw new Error("QuickBooks realm is invalid");
    const response = await fetchImpl(`${apiBaseUrl}/v3/company/${realmId}/${path}`, {
        headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`QuickBooks API request failed (${response.status})`);
    return response.json();
}

async function companyInfo(account, fetchImpl = fetch) {
    const token = await refreshAccessToken(account.credentials, fetchImpl);
    const body = await quickBooksGet(account.realmId, token, `companyinfo/${account.realmId}`, fetchImpl);
    return body?.CompanyInfo;
}

async function queryAll(account, entityType, options = {}, fetchImpl = fetch) {
    const allowed = ["Account", "Vendor", ...TRANSACTION_ENTITIES];
    if (!allowed.includes(entityType)) throw new Error("QuickBooks entity type is unsupported");
    const pageSize = Number(options.pageSize || 1000);
    const maxRecords = Number(options.maxRecords || 10000);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("QuickBooks page size is invalid");
    if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 50000) throw new Error("QuickBooks record limit is invalid");

    const token = await refreshAccessToken(account.credentials, fetchImpl);
    const records = [];
    let startPosition = 1;
    while (records.length < maxRecords) {
        const query = `SELECT * FROM ${entityType} STARTPOSITION ${startPosition} MAXRESULTS ${Math.min(pageSize, maxRecords - records.length)}`;
        const parameters = new URLSearchParams({ query });
        const body = await quickBooksGet(account.realmId, token, `query?${parameters.toString()}`, fetchImpl);
        const page = body?.QueryResponse?.[entityType];
        const rows = Array.isArray(page) ? page : [];
        records.push(...rows);
        if (rows.length < pageSize) break;
        startPosition += rows.length;
    }
    return records;
}

function latestSourceUpdate(records) {
    const timestamps = records.map(record => record?.MetaData?.LastUpdatedTime).filter(Boolean).sort();
    return timestamps.length ? timestamps[timestamps.length - 1] : null;
}

module.exports = { TRANSACTION_ENTITIES, companyInfo, latestSourceUpdate, queryAll, refreshAccessToken };
