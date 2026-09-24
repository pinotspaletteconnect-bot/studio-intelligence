const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parsePtsProductSalesUpload } = require("../scripts/pts/productSalesReport");
const { parsePtsClassSalesUpload } = require("../scripts/pts/salesReport");
const { resolvePtsUploadStudio } = require("../services/ptsUploadStudio");
const originalFetch = global.fetch;
const originalUrl = process.env.PTS_SECRET_BROKER_URL;
const originalToken = process.env.PTS_SECRET_BROKER_TOKEN;
const target = { organizationId: 3, brandId: 3, studioId: 5, code: "HB", locationId: "194", locationName: "Huntington Beach", timeZone: "America/Los_Angeles" };
const file = kind => fs.readFileSync(path.join(__dirname, "fixtures", `pts-${kind}-upload.xlsx`));
function broker(studio = target, status = 200) {
    process.env.PTS_SECRET_BROKER_URL = "https://broker.invalid/pts-account";
    process.env.PTS_SECRET_BROKER_TOKEN = "test-only";
    global.fetch = async (url, options) => {
        assert.equal(url, process.env.PTS_SECRET_BROKER_URL);
        assert.equal(options.headers.authorization, "Bearer test-only");
        assert.deepEqual(JSON.parse(options.body), { purpose: "backfill", studioCode: studio.locationId, organizationId: studio.organizationId, studioId: studio.studioId });
        return Response.json({ studio }, { status });
    };
}
afterEach(() => {
    global.fetch = originalFetch;
    for (const [key, value] of [["PTS_SECRET_BROKER_URL", originalUrl], ["PTS_SECRET_BROKER_TOKEN", originalToken]]) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
});
test("new studio Product Sales uses configured identity and removes customer names", async () => {
    broker();
    const result = await parsePtsProductSalesUpload({ file: file("product"), studioCode: "3:5:194" });
    assert.equal(result.studioId, 5);
    assert.equal(result.organizationId, 3);
    assert.equal(result.locationId, "194");
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].net_sales, 25);
    assert.equal(JSON.stringify(result).includes("Private customer"), false);
});
test("new studio Class Sales preserves Pacific dates and converts local evening to UTC", async () => {
    broker();
    const result = await parsePtsClassSalesUpload({ file: file("class"), studioCode: "3:5:194" });
    assert.equal(result.studioId, 5);
    assert.equal(result.timeZone, "America/Los_Angeles");
    assert.equal(result.rows[0].event_date, "2026-09-23");
    assert.equal(result.rows[0].class_time, "2026-09-24T02:00:00.000Z");
});
test("arbitrary future studio and existing studio both use broker metadata", async () => {
    for (const studio of [
        { ...target, studioId: 89, code: "NEW", locationId: "9876", timeZone: "America/Chicago" },
        { ...target, studioId: 1, code: "STM", locationId: "19", timeZone: "America/New_York" },
    ]) {
        broker(studio);
        const result = await parsePtsProductSalesUpload({ file: file("product"), studioCode: `${studio.organizationId}:${studio.studioId}:${studio.locationId}` });
        assert.equal(result.studioId, studio.studioId);
        assert.equal(result.studioCode, studio.code);
    }
});
test("unmapped or ambiguous locations fail before workbook parsing", async () => {
    broker(target, 409);
    await assert.rejects(parsePtsClassSalesUpload({ file: Buffer.from("invalid"), studioCode: "3:5:194" }), /resolution failed \(409\)/);
});
test("broker outage never falls back to the original four studios", async () => {
    broker({ ...target, locationId: "19" }, 503);
    await assert.rejects(resolvePtsUploadStudio("3:5:19"), /resolution failed/);
});
test("mismatched location or invalid timezone is rejected", async () => {
    broker();
    global.fetch = async () => Response.json({ studio: { ...target, locationId: "999" } });
    await assert.rejects(resolvePtsUploadStudio("3:5:194"), /invalid target/);
    broker({ ...target, timeZone: "invalid" });
    await assert.rejects(resolvePtsUploadStudio("3:5:194"), /timezone is invalid/);
});
test("broker cannot redirect an upload to another tenant or studio", async () => {
    broker();
    global.fetch = async () => Response.json({ studio: { ...target, organizationId: 4 } });
    await assert.rejects(resolvePtsUploadStudio("3:5:194"), /invalid target/);
    global.fetch = async () => Response.json({ studio: { ...target, studioId: 6 } });
    await assert.rejects(resolvePtsUploadStudio("3:5:194"), /invalid target/);
});
test("wrong report type still fails workbook validation", async () => {
    broker();
    await assert.rejects(parsePtsProductSalesUpload({ file: file("class"), studioCode: "3:5:194" }), /missing required headers/);
    await assert.rejects(parsePtsClassSalesUpload({ file: file("product"), studioCode: "3:5:194" }), /missing required headers/);
});
