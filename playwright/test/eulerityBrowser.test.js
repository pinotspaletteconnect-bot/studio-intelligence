const test = require("node:test");
const assert = require("node:assert/strict");

const { bestLocationLabel, fallbackSourceKey, normalizeLocationLabel, sourceKeyForOption } = require("../services/eulerityBrowser");

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

test("uses the clean location leaf instead of address and account text", () => {
    assert.equal(bestLocationLabel({
        displayName: "Pinot's PalettePinot's Palette - Louisville291 N Hubbards Ln, Louisville, KYuser@example.com",
        candidates: ["Pinot's Palette", "Pinot's Palette - Louisville", "291 N Hubbards Ln, Louisville, KY", "user@example.com"]
    }), "Pinot's Palette - Louisville");
});
