const assert = require("node:assert/strict");
const { e164, isLowReservation, renderMessage, scheduledAlertAt } = require("./scripts/pts/lowReservationClassAlerts");

assert.equal(e164("(502) 555-1212"), "+15025551212");
assert.equal(e164("+1 614 555 1212"), "+16145551212");
assert.equal(e164("invalid"), null);

assert.equal(isLowReservation(0, 3), false);
assert.equal(isLowReservation(1, 3), true);
assert.equal(isLowReservation(2, 3), true);
assert.equal(isLowReservation(3, 3), false);

assert.equal(
    renderMessage("{studio}: {reservations} for {class_name}", { studio: "Short North", reservations: 2, class_name: "Test Class" }),
    "Short North: 2 for Test Class"
);

assert.equal(
    scheduledAlertAt("2026-08-07T14:00:00-04:00", 6, "08:00", "America/New_York").toISOString(),
    "2026-08-07T12:00:00.000Z"
);
assert.equal(
    scheduledAlertAt("2026-08-07T19:00:00-04:00", 6, "08:00", "America/New_York").toISOString(),
    "2026-08-07T17:00:00.000Z"
);

console.log("Low-reservation class-alert tests passed");
