const test = require("node:test");
const assert = require("node:assert/strict");

const { fallbackSourceKey, normalizeLocationLabel, sourceKeyForOption } = require("../services/eulerityBrowser");

test("normalizes location labels without hardcoded studio names", () => {
    assert.equal(normalizeLocationLabel("  Pinot's   Palette\nShort North "), "Pinot's Palette Short North");
});

test("prefers a source value over a label", () => {
    assert.equal(sourceKeyForOption({ dataValue: "location-42", displayName: "Short North" }), "location-42");
});

test("falls back to a normalized label when Eulerity exposes no stable value", () => {
    assert.equal(fallbackSourceKey("  Short   North "), "label:short north");
    assert.equal(sourceKeyForOption({ id: "react-select-9-option-1", displayName: "Short North" }), "label:short north");
});
