const assert = require("node:assert/strict");
const test = require("node:test");

const { buildMntnReportUrl, normalizeQuery } = require("../services/mntnReport");

test("builds an API 3 report URL without changing the supplied report contract", () => {
    const url = buildMntnReportUrl("private-key-value", {
        begin: "2026-07-01",
        end: "2026-08-04",
        format: "json",
        sum: "graph.day",
        data: "graph.day,graph.impressions,graph.spend"
    });
    assert.equal(url.origin, "https://api3.mountain.com");
    assert.equal(url.pathname, "/apidata");
    assert.equal(url.searchParams.get("key"), "private-key-value");
    assert.equal(url.searchParams.get("begin"), "2026-07-01");
    assert.equal(url.searchParams.get("data"), "graph.day,graph.impressions,graph.spend");
});

test("rejects query parameters outside the reporting allowlist", () => {
    assert.throws(() => normalizeQuery({ begin: "mtd", data: "graph.day", url: "https://example.com" }), /Unsupported/);
});

test("requires a bounded report definition", () => {
    assert.throws(() => normalizeQuery({ begin: "mtd" }), /requires begin and data/);
});
