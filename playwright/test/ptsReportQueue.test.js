const assert = require("node:assert/strict");
const test = require("node:test");

const { runPtsReportQueued } = require("../services/ptsReportQueue");

const wait = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds));

test("serializes report work for the same PTS account", async () => {
    const events = [];

    const first = runPtsReportQueued(1, async () => {
        events.push("first:start");
        await wait(20);
        events.push("first:end");
    });
    const second = runPtsReportQueued(1, async () => {
        events.push("second:start");
        await wait(1);
        events.push("second:end");
    });

    await Promise.all([first, second]);
    assert.deepEqual(events, [
        "first:start",
        "first:end",
        "second:start",
        "second:end"
    ]);
});

test("allows different PTS accounts to run independently", async () => {
    let releaseFirst;
    let secondStarted = false;
    const firstBlocked = new Promise(resolve => {
        releaseFirst = resolve;
    });

    const first = runPtsReportQueued(11, async () => firstBlocked);
    const second = runPtsReportQueued(12, async () => {
        secondStarted = true;
    });

    await second;
    assert.equal(secondStarted, true);
    releaseFirst();
    await first;
});

test("continues an account queue after a failed report", async () => {
    const failure = runPtsReportQueued("account-a", async () => {
        throw new Error("expected failure");
    });
    const recovery = runPtsReportQueued("account-a", async () => "recovered");

    await assert.rejects(failure, /expected failure/);
    assert.equal(await recovery, "recovered");
});
