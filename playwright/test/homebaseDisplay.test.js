const test = require("node:test");
const assert = require("node:assert/strict");

const { homebaseHeadless } = require("../services/homebaseDisplay");

test("Homebase browser mode is isolated behind its own environment flag", () => {
    const original = process.env.HOMEBASE_HEADLESS;
    try {
        delete process.env.HOMEBASE_HEADLESS;
        assert.equal(homebaseHeadless(), true);
        process.env.HOMEBASE_HEADLESS = "true";
        assert.equal(homebaseHeadless(), true);
        process.env.HOMEBASE_HEADLESS = "false";
        assert.equal(homebaseHeadless(), false);
    } finally {
        if (original === undefined) delete process.env.HOMEBASE_HEADLESS;
        else process.env.HOMEBASE_HEADLESS = original;
    }
});
