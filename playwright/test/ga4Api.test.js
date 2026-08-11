const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { createAssertion } = require("../services/ga4Api");

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
