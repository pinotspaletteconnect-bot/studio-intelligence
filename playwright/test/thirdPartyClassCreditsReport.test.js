const test = require("node:test");
const assert = require("node:assert/strict");

const {
    enabledStudios,
    normalizeCredit,
    parseClassDescription
} = require("../scripts/pts/thirdPartyClassCreditsReport");

test("parses class time and painting in the studio timezone", () => {
    const parsed = parseClassDescription(
        "Sat Aug 08, 2026 7:00-9:00PM - Jimothy",
        "America/New_York"
    );
    assert.equal(parsed.class_time, "2026-08-08T23:00:00.000Z");
    assert.equal(parsed.painting, "Jimothy");
});

test("minimizes customer data and preserves recognized credit", () => {
    const row = normalizeCredit([
        "8859904", "62221", "8/7/2026",
        "Sat Aug 08, 2026 7:00-9:00PM - Jimothy",
        "Customer Name", "$60.06", "$0.00", ""
    ], "America/New_York");
    assert.equal(row.source_credit_key, "8859904:62221");
    assert.equal(row.applied_amount, 0);
    assert.equal(row.post_date, null);
    assert.equal(JSON.stringify(row).includes("Customer Name"), false);
});

test("runs only for studios with the third-party report enabled", () => {
    const studios = enabledStudios([
        { studioId: 1, reports: ["sales"] },
        { studioId: 2, reports: ["sales", "third_party_class_credits"] }
    ]);
    assert.deepEqual(studios.map(studio => studio.studioId), [2]);
});
