const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveMetaAccount } = require("../services/metaCredentials");

test("resolveMetaAccount retrieves a Vault-backed access token", async () => {
    const originalFetch = global.fetch;
    const originalUrl = process.env.META_SECRET_BROKER_URL;
    const originalToken = process.env.META_SECRET_BROKER_TOKEN;
    process.env.META_SECRET_BROKER_URL = "https://sasha.example/api/internal/meta-account";
    process.env.META_SECRET_BROKER_TOKEN = "broker-secret";
    global.fetch = async (url, options) => {
        assert.equal(url, process.env.META_SECRET_BROKER_URL);
        assert.equal(options.headers.authorization, "Bearer broker-secret");
        assert.deepEqual(JSON.parse(options.body), { accountId: 7 });
        return new Response(JSON.stringify({
            credentials: { access_token: "a-valid-meta-access-token-value" },
            account: { account_id: 7 },
            targets: [{ asset_type: "ad_account", asset_id: "act_1" }]
        }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
        const result = await resolveMetaAccount(7);
        assert.equal(result.accountId, 7);
        assert.equal(result.accessToken, "a-valid-meta-access-token-value");
        assert.equal(result.targets.length, 1);
    } finally {
        global.fetch = originalFetch;
        if (originalUrl === undefined) delete process.env.META_SECRET_BROKER_URL; else process.env.META_SECRET_BROKER_URL = originalUrl;
        if (originalToken === undefined) delete process.env.META_SECRET_BROKER_TOKEN; else process.env.META_SECRET_BROKER_TOKEN = originalToken;
    }
});

test("resolveMetaAccount rejects invalid account IDs", async () => {
    await assert.rejects(() => resolveMetaAccount("not-an-id"), /invalid/);
});
