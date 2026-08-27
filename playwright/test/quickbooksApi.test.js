const test = require("node:test");
const assert = require("node:assert/strict");
const { latestSourceUpdate, queryAll, refreshAccessToken } = require("../services/quickbooksApi");

function withConfiguration(callback) {
    const original = {
        clientId: process.env.QUICKBOOKS_CLIENT_ID,
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
        environment: process.env.QUICKBOOKS_ENVIRONMENT
    };
    process.env.QUICKBOOKS_CLIENT_ID = "client-id";
    process.env.QUICKBOOKS_CLIENT_SECRET = "client-secret";
    process.env.QUICKBOOKS_ENVIRONMENT = "sandbox";
    return Promise.resolve(callback()).finally(() => {
        for (const [key, value] of Object.entries(original)) {
            const envKey = key === "clientId" ? "QUICKBOOKS_CLIENT_ID" : key === "clientSecret" ? "QUICKBOOKS_CLIENT_SECRET" : "QUICKBOOKS_ENVIRONMENT";
            if (value === undefined) delete process.env[envKey]; else process.env[envKey] = value;
        }
    });
}

test("refreshes an Intuit token without returning the refresh credential", () => withConfiguration(async () => {
    const token = await refreshAccessToken({ refresh_token: "refresh-token-value" }, async (url, options) => {
        assert.equal(url, "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer");
        assert.equal(Object.fromEntries(options.body).grant_type, "refresh_token");
        assert.match(options.headers.authorization, /^Basic /);
        return new Response(JSON.stringify({ access_token: "short-lived-access-token" }), { status: 200 });
    });
    assert.equal(token, "short-lived-access-token");
}));

test("paginates read-only account queries", () => withConfiguration(async () => {
    const queries = [];
    const account = { realmId: "12345", credentials: { refresh_token: "refresh-token-value" } };
    const records = await queryAll(account, "Account", { pageSize: 2, maxRecords: 10 }, async (url) => {
        if (url.includes("tokens/bearer")) {
            return new Response(JSON.stringify({ access_token: "short-lived-access-token" }), { status: 200 });
        }
        const parsed = new URL(url);
        const query = parsed.searchParams.get("query");
        queries.push(query);
        const rows = queries.length === 1 ? [{ Id: "1" }, { Id: "2" }] : [{ Id: "3" }];
        return new Response(JSON.stringify({ QueryResponse: { Account: rows } }), { status: 200 });
    });
    assert.deepEqual(records.map(record => record.Id), ["1", "2", "3"]);
    assert.match(queries[0], /STARTPOSITION 1 MAXRESULTS 2/);
    assert.match(queries[1], /STARTPOSITION 3 MAXRESULTS 2/);
}));

test("finds the latest source modification timestamp", () => {
    assert.equal(latestSourceUpdate([
        { MetaData: { LastUpdatedTime: "2026-08-20T12:00:00Z" } },
        { MetaData: { LastUpdatedTime: "2026-08-21T12:00:00Z" } }
    ]), "2026-08-21T12:00:00Z");
});

test("collects checks through Purchase instead of an unsupported Check query", async () => {
    const account = { realmId: "12345", credentials: { refresh_token: "refresh-token-value" } };
    await assert.rejects(
        queryAll(account, "Check", {}, async () => {
            throw new Error("fetch must not be called for unsupported entities");
        }),
        /unsupported/
    );
});
