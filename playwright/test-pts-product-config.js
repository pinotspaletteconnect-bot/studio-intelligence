const assert = require("assert");

const { requestedStudios } = require("./scripts/pts/productSalesReport");

const originalStudiosJson = process.env.PTS_STUDIOS_JSON;
delete process.env.PTS_STUDIOS_JSON;

try {
    const studios = requestedStudios();

    assert.strictEqual(studios.length, 4);
    assert.deepStrictEqual(
        Object.fromEntries(studios.map(studio => [studio.code, studio.timeZone])),
        {
            STM: "America/New_York",
            SN: "America/New_York",
            GIL: "America/Phoenix",
            JEF: "America/New_York"
        }
    );
} finally {
    if (originalStudiosJson === undefined) {
        delete process.env.PTS_STUDIOS_JSON;
    } else {
        process.env.PTS_STUDIOS_JSON = originalStudiosJson;
    }
}

console.log("PTS Product Sales configuration tests passed");
