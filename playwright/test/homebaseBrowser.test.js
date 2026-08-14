const test = require("node:test");
const assert = require("node:assert/strict");
const { accountChoiceKey, normalizeLabel, numberValue, parseCompanyRows, parseDetailedRows, safeLoginMessage } = require("../services/homebaseBrowser");

test("normalizes Homebase location labels", () => {
    assert.equal(normalizeLabel("  St.   Matthews "), "st. matthews");
    assert.equal(accountChoiceKey("St. Matthews"), accountChoiceKey("St Matthews"));
});

test("aggregates detailed roles and discards employee-level columns", () => {
    const rows = [
        { "First Name":"Private", "Last Name":"Person", Location:"Gilbert", Role:"Stage Artist", "Scheduled Hours":"4", "Actual Hours":"3.5", "Wage Rate":"$20", "Pay Total":"$70" },
        { "First Name":"Another", Location:"Gilbert", Role:"Stage Artist", "Scheduled Hours":"2", "Actual Hours":"2", "Wage Rate":"$22", "Pay Total":"$44" },
        { Location:"TOTALS", Role:"", "Scheduled Hours":"6", "Actual Hours":"5.5", "Wage Rate":"", "Pay Total":"$114" },
    ];
    assert.deepEqual(parseDetailedRows(rows,"2026-08-13T12:00:00.000Z"),[{
        location:"Gilbert",role:"Stage Artist",scheduled_hours:6,actual_hours:5.5,scheduled_cost:124,actual_cost:114,retrieved_at:"2026-08-13T12:00:00.000Z"
    }]);
});

test("parses currency and numeric cells", () => {
    assert.equal(numberValue("$1,234.50"), 1234.5);
    assert.equal(numberValue(""), 0);
});

test("returns only a bounded Homebase login status message", () => {
    assert.equal(safeLoginMessage(["  Unable   to sign in  "]), "Unable to sign in");
    assert.equal(safeLoginMessage([]), null);
    assert.equal(safeLoginMessage(["x".repeat(300)]).length, 240);
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
