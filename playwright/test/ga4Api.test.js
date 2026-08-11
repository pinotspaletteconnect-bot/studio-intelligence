const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { accessToken, createAssertion } = require("../services/ga4Api");

test("creates a signed Google service-account assertion without exposing the private key", () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const assertion = createAssertion({ client_email: "ga4@example.test", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }, 1000);
    const [header, payload, signature] = assertion.split(".");
    assert.equal(JSON.parse(Buffer.from(header, "base64url")).alg, "RS256");
    const claims = JSON.parse(Buffer.from(payload, "base64url"));
    assert.equal(claims.iss, "ga4@example.test");
    assert.equal(claims.exp, 4600);
    assert.equal(crypto.verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")), true);
    assert.equal(assertion.includes("PRIVATE KEY"), false);
});

test("refreshes an owner OAuth connection", async () => {
    const originalFetch = global.fetch;
    global.fetch = async (_url, options) => {
        const body = Object.fromEntries(options.body);
        assert.equal(body.grant_type, "refresh_token");
        assert.equal(body.refresh_token, "refresh-owner");
        assert.equal(body.client_id, "client-id");
        assert.equal(body.client_secret, "client-secret");
        return { ok: true, json: async () => ({ access_token: "owner-token", expires_in: 3600 }) };
    };
    try {
        assert.equal(await accessToken({ refresh_token: "refresh-owner", client_id: "client-id", client_secret: "client-secret" }), "owner-token");
    } finally {
        global.fetch = originalFetch;
    }
});
