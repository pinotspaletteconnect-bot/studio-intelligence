const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveQuickBooksAccount } = require("../services/quickbooksCredentials");

test("resolves a Vault-backed QuickBooks realm without exposing broker credentials", async () => {
    const originalFetch = global.fetch;
    const originalUrl = process.env.QUICKBOOKS_SECRET_BROKER_URL;
    const originalToken = process.env.QUICKBOOKS_SECRET_BROKER_TOKEN;
    process.env.QUICKBOOKS_SECRET_BROKER_URL = "https://broker.example/quickbooks-account";
    process.env.QUICKBOOKS_SECRET_BROKER_TOKEN = "broker-token";
    global.fetch = async (url, options) => {
        assert.equal(url, "https://broker.example/quickbooks-account");
        assert.equal(options.headers.authorization, "Bearer broker-token");
        assert.deepEqual(JSON.parse(options.body), { accountId: 7 });
        return new Response(JSON.stringify({
            credentials: { refresh_token: "refresh-token-value" },
            account: { realm_id: "123456789" },
            targets: [{ studio_id: 1 }]
        }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
        const account = await resolveQuickBooksAccount(7);
        assert.equal(account.accountId, 7);
        assert.equal(account.realmId, "123456789");
        assert.equal(account.credentials.refresh_token, "refresh-token-value");
    } finally {
        global.fetch = originalFetch;
        if (originalUrl === undefined) delete process.env.QUICKBOOKS_SECRET_BROKER_URL; else process.env.QUICKBOOKS_SECRET_BROKER_URL = originalUrl;
        if (originalToken === undefined) delete process.env.QUICKBOOKS_SECRET_BROKER_TOKEN; else process.env.QUICKBOOKS_SECRET_BROKER_TOKEN = originalToken;
    }
});

test("rejects invalid QuickBooks connection IDs", async () => {
    await assert.rejects(() => resolveQuickBooksAccount("invalid"), /invalid/);
});

