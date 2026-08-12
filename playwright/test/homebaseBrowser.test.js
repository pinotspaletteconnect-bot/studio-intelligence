const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeLabel, numberValue, parseCompanyRows } = require("../services/homebaseBrowser");

test("normalizes Homebase location labels", () => {
    assert.equal(normalizeLabel("  St.   Matthews "), "st. matthews");
});

test("parses currency and numeric cells", () => {
    assert.equal(numberValue("$1,234.50"), 1234.5);
    assert.equal(numberValue(""), 0);
});

test("aggregates company timesheets without retaining employee identity", () => {
    const rows = [
        ["Employee One", "Gilbert", "4.00", "3.50", "0.25", "0", "3.50", "3.50", "0", "0", "-0.50", "$70.00", "1/1"],
        ["Employee Two", "Gilbert", "5.00", "5.25", "0", "0", "5.25", "5.00", "0.25", "0", "0.25", "$110.00", "1/1"],
    ];
    assert.deepEqual(parseCompanyRows(rows, "2026-08-12T12:00:00.000Z"), [{
        location: "Gilbert", scheduled_hours: 9, actual_hours: 8.75,
        unpaid_break_hours: 0.25, pto_hours: 0, regular_hours: 8.5,
        overtime_hours: 0.25, actual_cost: 180, retrieved_at: "2026-08-12T12:00:00.000Z"
    }]);
});
