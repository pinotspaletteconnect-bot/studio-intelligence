const test = require("node:test");
const assert = require("node:assert/strict");
const { discoverLocation } = require("../services/homebaseApi");

test("Homebase API module exports location discovery", () => {
    assert.equal(typeof discoverLocation, "function");
});
