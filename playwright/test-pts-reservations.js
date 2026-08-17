const assert = require("assert");

const {
    moneyValue,
    normalizeReservationRow,
    normalizePostalCode,
    parseEventDate,
    parseOrderLocalDate
} = require("./scripts/pts/reservationsReport");

assert.strictEqual(parseOrderLocalDate("08/01/26 9:24 PM"), "2026-08-01");
assert.strictEqual(parseEventDate("Sat Aug 8 2026 3:00PM - 5:00PM Wings of Purple Mist"), "2026-08-08");

const row = normalizeReservationRow({
    order_id: "8853667",
    confirmation: "LOU-JKGXWT",
    order_datetime_text: "08/01/26 9:24 PM",
    class_label: "Sat Aug 8 2026 3:00PM - 5:00PM Wings of Purple Mist",
    active_reservations: "1",
    refunded_reservations: "0",
    on_hold_reservations: "0",
    checked_in_reservations: "0",
    ordered_seats: "1",
    booked_sales: "$39.00"
});

assert.strictEqual(row.order_date, "2026-08-01");
assert.strictEqual(row.event_date, "2026-08-08");
assert.strictEqual(row.ordered_seats, 1);
assert.strictEqual(row.booked_sales, 39);
assert.match(row.source_row_key, /^[a-f0-9]{64}$/);
assert.ok(!("purchaser" in row));
assert.strictEqual(normalizePostalCode("43016-1234"), "43016");
assert.strictEqual(normalizePostalCode("not available"), null);
assert.strictEqual(moneyValue("-$12.50"), -12.5);

console.log("PTS Reservations parser tests passed");
