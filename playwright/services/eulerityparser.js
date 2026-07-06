const fs = require("fs");
const csv = require("csv-parser");

function parseNumber(value) {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    return Number(
        String(value)
            .replace(/,/g, "")
            .replace("%", "")
            .replace("$", "")
            .trim()
    );
}

function formatDate(value) {
    const s = String(value).trim();

    // YYYYMMDD
    if (/^\d{8}$/.test(s)) {
        return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
    }

    // M/D/YYYY or MM/DD/YYYY
    if (s.includes("/")) {
        const [month, day, year] = s.split("/");

        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    throw new Error(`Invalid date: ${value}`);
}

function loadCSV(filePath) {
    return new Promise((resolve, reject) => {

        const rows = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", row => rows.push(row))
            .on("end", () => resolve(rows))
            .on("error", reject);

    });
}

async function parseMetrics(filePath) {

    const rows = await loadCSV(filePath);

    if (rows.length === 0) {
        return [];
    }

    const requiredColumns = [
        "Date",
        "Total Impressions",
        "Total Clicks",
        "Total Ctr"
    ];

    for (const column of requiredColumns) {
        if (!(column in rows[0])) {
            throw new Error(`Missing required column: ${column}`);
        }
    }

    return rows.map(row => ({

        report_date: formatDate(row["Date"]),

        impressions_total: parseNumber(row["Total Impressions"]),
        impressions_display: parseNumber(row["Display Impressions"]),
        impressions_search: parseNumber(row["Search Impressions"]),
        impressions_social: parseNumber(row["Social Impressions"]),
        impressions_video: parseNumber(row["Video Impressions"]),
        impressions_other: parseNumber(row["Other Impressions"]),

        clicks_total: parseNumber(row["Total Clicks"]),
        clicks_display: parseNumber(row["Display Clicks"]),
        clicks_search: parseNumber(row["Search Clicks"]),
        clicks_social: parseNumber(row["Social Clicks"]),
        clicks_video: parseNumber(row["Video Clicks"]),
        clicks_other: parseNumber(row["Other Clicks"]),

        ctr_total: parseNumber(row["Total Ctr"]),
        ctr_display: parseNumber(row["Display Ctr"]),
        ctr_search: parseNumber(row["Search Ctr"]),
        ctr_social: parseNumber(row["Social Ctr"]),
        ctr_video: parseNumber(row["Video Ctr"]),
        ctr_other: parseNumber(row["Other Ctr"])

    }));
}

async function parseSpend(filePath) {

    const rows = await loadCSV(filePath);

    if (rows.length === 0) {
        return [];
    }

    const requiredColumns = [
        "Business Name",
        "Campaign Name",
        "User",
        "Date",
        "Spend",
        "Activation Date"
    ];

    for (const column of requiredColumns) {
        if (!(column in rows[0])) {
            throw new Error(`Missing required column: ${column}`);
        }
    }

    return rows.map(row => ({

        report_date: formatDate(row["Date"]),

        campaign_name: row["Campaign Name"],

        business_name: row["Business Name"],

        user_email: row["User"],

        activation_date: formatDate(row["Activation Date"]),

        spend: parseNumber(row["Spend"])

    }));
}

function parseBudget(budgetObject) {

    if (!budgetObject || typeof budgetObject !== "object") {
        throw new Error("Invalid budget object");
    }

    return Object.entries(budgetObject).map(([channel, allocation]) => ({

        channel,

        allocation_percent: parseNumber(allocation)

    }));
}

module.exports = {
    loadCSV,
    parseMetrics,
    parseSpend,
    parseBudget
};