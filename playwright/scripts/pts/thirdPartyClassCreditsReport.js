require("dotenv").config();

const { chromium } = require("playwright");

const PTS_URL = "https://admin.pinotspalette.com";
const MONTHS = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function validateDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        throw new Error("PTS third-party report dates must use YYYY-MM-DD");
    }
    return String(value);
}

function displayDate(value) {
    const [year, month, day] = value.split("-");
    return `${Number(month)}/${Number(day)}/${year}`;
}

function numericValue(value) {
    const normalized = String(value ?? "")
        .replace(/[,$]/g, "")
        .replace(/^\((.*)\)$/, "-$1")
        .trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
    const match = String(value ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function zonedWallClockToIso(parts, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hourCycle: "h23"
    });
    const desiredUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    let instant = desiredUtc;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const observed = Object.fromEntries(
            formatter.formatToParts(new Date(instant))
                .filter(part => part.type !== "literal")
                .map(part => [part.type, Number(part.value)])
        );
        instant += desiredUtc - Date.UTC(
            observed.year, observed.month - 1, observed.day,
            observed.hour, observed.minute, observed.second
        );
    }
    return new Date(instant).toISOString();
}

function parseClassDescription(value, timeZone) {
    const text = String(value ?? "").trim();
    const match = text.match(
        /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?-\d{1,2}:\d{2}\s*(AM|PM)/i
    );
    if (!match) return { class_time: null, painting: text || null };
    let hour = Number(match[4]) % 12;
    if (String(match[6] ?? match[7]).toUpperCase() === "PM") hour += 12;
    const classTime = zonedWallClockToIso({
        year: Number(match[3]), month: MONTHS[match[1].toLowerCase()],
        day: Number(match[2]), hour, minute: Number(match[5])
    }, timeZone);
    const painting = text.split(/\s+-\s+/).slice(1).join(" - ").trim() || null;
    return { class_time: classTime, painting };
}

function normalizeCredit(values, timeZone) {
    const [orderId, externalBookingId, orderDate, classDescription, _customerName,
        originalAmount, appliedAmount, postDate] = values;
    const parsedClass = parseClassDescription(classDescription, timeZone);
    return {
        source_credit_key: `${String(orderId).trim()}:${String(externalBookingId).trim()}`,
        order_id: String(orderId).trim() || null,
        external_booking_id: String(externalBookingId).trim() || null,
        order_date: dateOnly(orderDate),
        class_time: parsedClass.class_time,
        painting: parsedClass.painting,
        original_amount: numericValue(originalAmount),
        applied_amount: numericValue(appliedAmount),
        post_date: dateOnly(postDate),
        raw_payload: {
            order_id: String(orderId).trim() || null,
            external_booking_id: String(externalBookingId).trim() || null,
            order_date: dateOnly(orderDate),
            class_description: String(classDescription).trim() || null,
            original_amount: numericValue(originalAmount),
            applied_amount: numericValue(appliedAmount),
            post_date: dateOnly(postDate)
        }
    };
}

function enabledStudios(studioTargets) {
    if (!Array.isArray(studioTargets)) throw new Error("PTS studio targets are required");
    return studioTargets.filter(studio => {
        const reports = Array.isArray(studio.reports) ? studio.reports : [];
        return reports.includes("third_party_class_credits");
    });
}

async function login(page, credentials) {
    if (!credentials?.username || !credentials?.password) {
        throw new Error("PTS credentials are required");
    }
    await page.goto(`${PTS_URL}/Account/LogOn`, { waitUntil: "domcontentloaded" });
    await page.locator("#UserName").fill(credentials.username);
    await page.locator("#Password").fill(credentials.password);
    await Promise.all([
        page.waitForURL(url => !url.pathname.includes("/Account/LogOn")),
        page.getByRole("button", { name: "Sign In" }).click()
    ]);
}

async function selectStudio(page, studio) {
    await page.locator("#LocationSelect").evaluate((input, locationId) => {
        const widget = globalThis.jQuery(input).data("kendoDropDownList");
        widget.value(String(locationId));
        widget.trigger("change");
    }, studio.locationId);
    const actual = await page.locator("#LocationSelect").inputValue();
    if (actual !== String(studio.locationId)) {
        throw new Error(`PTS selected ${actual}, expected ${studio.locationId} for ${studio.code}`);
    }
}

async function runReport(page, fromDate, toDate) {
    await page.locator("#DateFilter_FromDate").fill(displayDate(fromDate));
    await page.locator("#DateFilter_FromDate").press("Tab");
    await page.locator("#DateFilter_ToDate").fill(displayDate(toDate));
    await page.locator("#DateFilter_ToDate").press("Tab");
    const navigation = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
    await page.getByRole("button", { name: "Run", exact: true }).click({ noWaitAfter: true });
    await navigation;
    await page.locator("#gridThirdPartyClassCredits").waitFor({ state: "visible", timeout: 120000 });
}

async function readCredits(page, timeZone) {
    const result = await page.locator("#gridThirdPartyClassCredits").evaluate(element => {
        const grid = globalThis.jQuery(element).data("kendoGrid");
        const rows = Array.from(element.querySelectorAll("tbody tr"))
            .filter(row => !row.classList.contains("k-grouping-row"))
            .map(row => Array.from(row.querySelectorAll("td")).map(cell => cell.textContent?.trim() ?? ""))
            .filter(row => row.length >= 8 && /^\d+$/.test(row[0]));
        return { rows, total: grid?.dataSource?.total?.() ?? rows.length };
    });
    const rows = result.rows.map(values => normalizeCredit(values, timeZone));
    if (result.total > 0 && rows.length !== result.total) {
        throw new Error(`PTS Third Party Class Credits exposed ${result.total} records but ${rows.length} rows were readable`);
    }
    return rows;
}

async function runPtsThirdPartyClassCreditsReport({ fromDate, toDate, credentials, studioTargets } = {}) {
    const from = validateDate(fromDate);
    const to = validateDate(toDate);
    if (from > to) throw new Error("PTS fromDate must be on or before toDate");
    const studios = enabledStudios(studioTargets);
    if (studios.length === 0) return [];
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await (await browser.newContext()).newPage();
        await login(page, credentials);
        const results = [];
        for (const studio of studios) {
            await page.goto(`${PTS_URL}/Reports/ThirdPartyClassCreditsReport`, { waitUntil: "domcontentloaded" });
            await selectStudio(page, studio);
            await runReport(page, from, to);
            const rows = await readCredits(page, studio.timeZone);
            results.push({
                studioId: studio.studioId, brandId: studio.brandId, studioCode: studio.code,
                locationId: studio.locationId, locationName: studio.locationName,
                timeZone: studio.timeZone, fromDate: from, toDate: to,
                rowCount: rows.length, rows
            });
        }
        return results;
    } finally {
        await browser.close();
    }
}

module.exports = {
    enabledStudios,
    normalizeCredit,
    parseClassDescription,
    runPtsThirdPartyClassCreditsReport
};
