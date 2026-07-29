require("dotenv").config();

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const { parseClassSales, parseNonClassSales } = require("../../services/ptsParser");

const PTS_URL = "https://admin.pinotspalette.com";
const DEFAULT_STUDIOS = [
    { studioId: 1, code: "STM", locationId: "19", locationName: "St. Matthews" },
    { studioId: 2, code: "SN", locationId: "228", locationName: "Short North" },
    { studioId: 3, code: "GIL", locationId: "198", locationName: "Gilbert" },
    { studioId: 4, code: "JEF", locationId: "243", locationName: "Jeffersonville" }
];

function configuredStudios() {
    if (!process.env.PTS_STUDIOS_JSON) {
        return DEFAULT_STUDIOS;
    }

    const studios = JSON.parse(process.env.PTS_STUDIOS_JSON);

    if (!Array.isArray(studios) || studios.length === 0) {
        throw new Error("PTS_STUDIOS_JSON must be a non-empty array");
    }

    return studios;
}

function validateDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        throw new Error("PTS reportDate must use YYYY-MM-DD");
    }

    return value;
}

function displayDate(isoDate) {
    const [year, month, day] = isoDate.split("-");
    return `${Number(month)}/${Number(day)}/${year}`;
}

function requestedStudios(studioCodes) {
    const studios = configuredStudios();

    if (!studioCodes?.length) {
        return studios;
    }

    const requested = new Set(studioCodes.map(code => String(code).toUpperCase()));
    const selected = studios.filter(studio => requested.has(studio.code));

    if (selected.length !== requested.size) {
        throw new Error("One or more requested PTS studio codes are not configured");
    }

    return selected;
}

async function login(page) {
    if (!process.env.PTS_USERNAME || !process.env.PTS_PASSWORD) {
        throw new Error("PTS_USERNAME and PTS_PASSWORD must be configured");
    }

    await page.goto(`${PTS_URL}/Account/LogOn`, {
        waitUntil: "domcontentloaded"
    });

    await page.locator("#UserName").fill(process.env.PTS_USERNAME);
    await page.locator("#Password").fill(process.env.PTS_PASSWORD);

    await Promise.all([
        page.waitForURL(url => !url.pathname.includes("/Account/LogOn")),
        page.getByRole("button", { name: "Sign In" }).click()
    ]);

    if (page.url().includes("/Account/LogOn")) {
        throw new Error("PTS login failed");
    }
}

async function selectStudio(page, studio) {
    await page.locator('[aria-owns="LocationSelect_listbox"]').click();
    await page
        .getByRole("option", { name: studio.locationName, exact: true })
        .click();

    const selectedLocationId = await page.locator("#LocationSelect").inputValue();

    if (selectedLocationId !== String(studio.locationId)) {
        throw new Error(
            `PTS selected ${selectedLocationId}, expected ${studio.locationId} for ${studio.code}`
        );
    }
}

async function runReport(page, reportDate) {
    const date = displayDate(reportDate);

    await page.locator("#DateFilter_FromDate").fill(date);
    await page.locator("#DateFilter_FromDate").press("Tab");
    await page.locator("#DateFilter_ToDate").fill(date);
    await page.locator("#DateFilter_ToDate").press("Tab");

    await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        page.getByRole("button", { name: "Run", exact: true }).click()
    ]);

    // The report heading's date formatting can vary (for example, padded
    // month/day values), so use the report controls as the readiness signal.
    // Navigation guarantees these are from the newly requested report.
    await page.locator("table.SalesSummary").waitFor({ state: "visible" });
    await page.locator(".k-grid-excel").nth(0).waitFor({ state: "attached" });
    await page.locator(".k-grid-excel").nth(1).waitFor({ state: "attached" });
}

async function readSummary(page) {
    const rows = await page.locator("table.SalesSummary tr").evaluateAll(elements =>
        elements.map(row =>
            Array.from(row.querySelectorAll("td"))
                .map(cell => cell.textContent.trim())
                .filter(Boolean)
        )
    );
    const pageText = await page.locator("body").innerText();

    const numberFrom = value => {
        const matches = String(value ?? "").match(/-?\$?[\d,]+(?:\.\d+)?/g);
        if (!matches?.length) {
            return 0;
        }
        return Number(matches.at(-1).replace(/[$,]/g, ""));
    };
    const valueFor = label => {
        const row = rows.find(candidate => candidate[0]?.startsWith(label));
        return numberFrom(row?.join(" "));
    };
    const textMetric = pattern => {
        const match = pageText.match(pattern);
        return match ? Number(match[1].replace(/,/g, "")) : 0;
    };

    return {
        gross_sales: valueFor("Gross Sales"),
        refunds: valueFor("Refunds"),
        reschedules: valueFor("Reschedules"),
        discounts: valueFor("Discounts"),
        net_sales: valueFor("Net Sales"),
        class_sales: valueFor("Classes ("),
        alcohol_sales: valueFor("Alcohol ("),
        other_product_sales: valueFor("Other Products ("),
        taxes: valueFor("Taxes"),
        nat_sales: valueFor("NAT Sales"),
        seats_sold: textMetric(/([\d,]+)\s+Seats Sold/i),
        attendance_percent: textMetric(/([\d,.]+)%\s+% Attendance/i),
        lead_time_average_days: textMetric(/([\d,.]+)\s+days\s+Lead Time Avg/i)
    };
}

async function downloadWorkbooks(page, folder, studio, reportDate) {
    const excelButtons = page.locator(".k-grid-excel");

    if ((await excelButtons.count()) !== 2) {
        throw new Error("PTS Sales Report did not expose both Excel exports");
    }

    const files = [];

    for (const [index, label] of ["class-sales", "non-class-sales"].entries()) {
        const downloadPromise = page.waitForEvent("download");
        await excelButtons.nth(index).click({ force: true });
        const download = await downloadPromise;
        const filePath = path.join(
            folder,
            `${studio.code}_${reportDate}_${label}.xlsx`
        );
        await download.saveAs(filePath);
        files.push(filePath);
    }

    return files;
}

async function runPtsSalesReport({ reportDate, studioCodes } = {}) {
    const date = validateDate(reportDate);
    const studios = requestedStudios(studioCodes);
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "pts-sales-"));
    let browser;

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();
        await login(page);
        const results = [];

        for (const studio of studios) {
            await page.goto(`${PTS_URL}/Reports/SalesReport`, {
                waitUntil: "domcontentloaded"
            });
            await selectStudio(page, studio);
            await runReport(page, date);

            const summary = await readSummary(page);
            const [classFile, nonClassFile] = await downloadWorkbooks(
                page,
                folder,
                studio,
                date
            );

            results.push({
                studioId: studio.studioId,
                studioCode: studio.code,
                locationId: studio.locationId,
                locationName: studio.locationName,
                reportDate: date,
                summary,
                classSales: await parseClassSales(classFile),
                nonClassSales: await parseNonClassSales(nonClassFile)
            });
        }

        return results;
    } finally {
        if (browser) {
            await browser.close();
        }
        fs.rmSync(folder, { recursive: true, force: true });
    }
}

module.exports = {
    runPtsSalesReport
};
