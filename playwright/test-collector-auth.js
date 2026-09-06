const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const express = require("express");
const { requireCollectorAuth } = require("./middleware/collectorAuth");
const { beginMetaOAuth, requireMetaOAuthState } = require("./middleware/metaOAuthState");
const originalToken = process.env.COLLECTOR_API_TOKEN;
let server, base;
const TOKEN = "local-test-token-not-a-real-credential";

before(async () => {
    process.env.COLLECTOR_API_TOKEN = TOKEN;
    const app = express();
    app.get("/protected", requireCollectorAuth, (_req, res) => res.json({ ok: true }));
    app.get("/begin", requireCollectorAuth, (_req, res) => res.json({ state: beginMetaOAuth(res) }));
    app.get("/callback", requireMetaOAuthState, (_req, res) => res.json({ ok: true }));
    // Exercise the real router wiring. Unauthorized calls stop before any source API/browser work.
    app.use("/meta", require("./routes/meta"));
    app.use("/eulerity", require("./routes/eulerity"));
    app.use("/pts", require("./routes/pts"));
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    if (originalToken === undefined) delete process.env.COLLECTOR_API_TOKEN;
    else process.env.COLLECTOR_API_TOKEN = originalToken;
    if (server) await new Promise((resolve) => server.close(resolve));
});

test("all collection routes reject unauthenticated requests", async () => {
    for (const path of ["/meta/download", "/meta/page-insights/download", "/eulerity/download", "/pts/sales-report", "/pts/class-sales-report", "/pts/product-sales-report", "/pts/reservations-report", "/pts/class-sales-upload", "/pts/product-sales-upload"]) {
        assert.equal((await fetch(base + path, { method: "POST" })).status, 401, path);
    }
});
test("Meta discovery and configuration are protected; liveness stays public", async () => {
    for (const path of ["/meta/config", "/meta/accounts", "/meta/pages", "/meta/businesses", "/meta/auth", "/meta/page-insights/health"]) {
        assert.equal((await fetch(base + path)).status, 401, path);
    }
    assert.equal((await fetch(base + "/meta/health")).status, 200);
    assert.equal((await fetch(base + "/eulerity/")).status, 200);
});
test("requires the Bearer scheme and exact token", async () => {
    for (const authorization of [TOKEN, "Bearer wrong", `Basic ${TOKEN}`]) {
        assert.equal((await fetch(base + "/protected", { headers: { authorization } })).status, 401);
    }
    assert.equal((await fetch(base + "/protected", { headers: { authorization: `Bearer ${TOKEN}` } })).status, 200);
    delete process.env.COLLECTOR_API_TOKEN;
    try { assert.equal((await fetch(base + "/protected")).status, 503); }
    finally { process.env.COLLECTOR_API_TOKEN = TOKEN; }
});
test("OAuth callback rejects missing, forged, wrong-browser, and replayed state", async () => {
    assert.equal((await fetch(base + "/meta/callback?code=fake")).status, 400);
    const start = await fetch(base + "/begin", { headers: { authorization: `Bearer ${TOKEN}` } });
    const { state } = await start.json();
    const cookie = start.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(base + `/callback?state=${state}`)).status, 400);
    assert.equal((await fetch(base + "/callback?state=forged", { headers: { cookie } })).status, 400);
    assert.equal((await fetch(base + `/callback?state=${state}`, { headers: { cookie } })).status, 200);
    assert.equal((await fetch(base + `/callback?state=${state}`, { headers: { cookie } })).status, 400);
});
