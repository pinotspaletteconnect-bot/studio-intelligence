const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeClassSalesRows } = require("../services/ptsParser");

test("preserves the PTS display name separately from the painting", () => {
    const [row] = normalizeClassSalesRows([{
        display_name: "Miracle Birthday Party",
        painting: "Pure Tranquility",
        time: "2026-08-12T15:00:00",
        type: "Private Party",
        seats: 12,
        cap: 24
    }]);

    assert.equal(row.display_name, "Miracle Birthday Party");
    assert.equal(row.painting, "Pure Tranquility");
});

test("accepts alternate display-name keys exposed by the PTS grid model", () => {
    const [row] = normalizeClassSalesRows([{
        class_display_name: "Team Celebration",
        painting: "Illuminated Forest",
        time: "2026-08-15T15:00:00",
        type: "Private Party"
    }]);

    assert.equal(row.display_name, "Team Celebration");
});
