const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { parseSpend } = require("../services/eulerityParser");

test("parseSpend returns warehouse-shaped Eulerity spend rows", async () => {
    const rows = await parseSpend(
        path.join(__dirname, "fixtures", "eulerity-spend.csv")
    );

    assert.deepEqual(rows, [
        {
            report_date: "2026-07-27",
            campaign_name: "Louisville",
            business_name: "Pinot's Palette",
            user_name: "owner@example.com",
            activation_date: "2024-09-22",
            spend: 44.35
        },
        {
            report_date: "2026-07-26",
            campaign_name: "Louisville",
            business_name: "Pinot's Palette",
            user_name: "owner@example.com",
            activation_date: "2024-09-22",
            spend: 1234.5
        }
    ]);
});
