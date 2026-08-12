const test = require("node:test");
const assert = require("node:assert/strict");
const { discoverLocation, normalizeApiKey, normalizeLabor, payloadRows } = require("../services/homebaseApi");

test("normalizes copied Homebase bearer credentials", () => {
    assert.equal(normalizeApiKey('  "Bearer test-key"  '), "test-key");
    assert.equal(normalizeApiKey("plain-key"), "plain-key");
});

test("Homebase API module exports location discovery", () => {
    assert.equal(typeof discoverLocation, "function");
});

test("normalizes Homebase shift labor without employee identity", () => {
    const result = normalizeLabor({
        timeZone: "America/New_York",
        retrievedAt: "2026-08-12T12:00:00Z",
        shifts: [{ id: 10, role: "Artist", start_at: "2026-08-12T21:00:00Z", end_at: "2026-08-13T01:00:00Z", labor: { scheduled_hours: 4, costs: 72 } }],
        timecards: [{ id: 20, shift_id: 10, first_name: "Private", last_name: "Employee", clock_in: "2026-08-12T21:05:00Z", clock_out: "2026-08-13T01:10:00Z", labor: { paid_hours: 4.0833, regular_hours: 4.0833, costs: 73.5 } }]
    });
    assert.equal(result.shifts[0].actual_cost, 73.5);
    assert.equal(result.daily[0].labor_date, "2026-08-12");
    assert.equal(JSON.stringify(result).includes("Private"), false);
});

test("accepts documented Homebase collection envelopes", () => {
    assert.deepEqual(payloadRows({ data: [{ id: 1 }] }, "shifts"), [{ id: 1 }]);
    assert.deepEqual(payloadRows({ shifts: [{ id: 2 }] }, "shifts"), [{ id: 2 }]);
});
