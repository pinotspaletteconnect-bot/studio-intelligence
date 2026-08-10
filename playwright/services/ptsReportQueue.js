const accountQueues = new Map();

function queueKey(accountId) {
    const value = String(accountId ?? "").trim();
    return value || "legacy-default";
}

function runPtsReportQueued(accountId, task) {
    if (typeof task !== "function") {
        throw new TypeError("PTS report queue task must be a function");
    }

    const key = queueKey(accountId);
    const previous = accountQueues.get(key) ?? Promise.resolve();
    const execution = previous.catch(() => undefined).then(task);

    accountQueues.set(key, execution);
    execution
        .finally(() => {
            if (accountQueues.get(key) === execution) {
                accountQueues.delete(key);
            }
        })
        .catch(() => undefined);

    return execution;
}

module.exports = {
    runPtsReportQueued
};
