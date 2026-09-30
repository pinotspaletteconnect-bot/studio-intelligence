const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { parseMetrics, parseSpend } = require("./services/eulerityParser");

async function withCsv(contents, run) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "eulerity-parser-"));
    const file = path.join(directory, "report.csv");
    try {
        await fs.writeFile(file, contents);
        return await run(file);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
}

test("parses named Eulerity activation dates and existing numeric dates", async () => {
    const csv = [
        "Business Name,Campaign Name,User,Date,Spend,Activation Date",
        'Studio,Campaign,test@example.com,9/29/2026,12.50,"Aug 28, 2024"',
    ].join("\n");

    const rows = await withCsv(csv, parseSpend);
    assert.equal(rows[0].report_date, "2026-09-29");
    assert.equal(rows[0].activation_date, "2024-08-28");
});

test("parses compact metric dates", async () => {
    const csv = "Date,Total Impressions,Total Clicks,Total Ctr\n20260929,100,5,5%\n";
    const rows = await withCsv(csv, parseMetrics);
    assert.equal(rows[0].report_date, "2026-09-29");
});

test("rejects invalid named dates", async () => {
    const csv = [
        "Business Name,Campaign Name,User,Date,Spend,Activation Date",
        'Studio,Campaign,test@example.com,9/29/2026,12.50,"Feb 30, 2024"',
    ].join("\n");

    await assert.rejects(withCsv(csv, parseSpend), /Invalid date: Feb 30, 2024/);
});
