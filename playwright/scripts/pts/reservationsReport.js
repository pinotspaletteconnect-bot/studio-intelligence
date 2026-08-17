require("dotenv").config();

const crypto = require("crypto");
const { chromium } = require("playwright");

const PTS_URL = "https://admin.pinotspalette.com";
const DEFAULT_STUDIOS = [
    { studioId: 1, code: "STM", locationId: "19", locationName: "St. Matthews", timeZone: "America/New_York" },
    { studioId: 2, code: "SN", locationId: "228", locationName: "Short North", timeZone: "America/New_York" },
    { studioId: 3, code: "GIL", locationId: "198", locationName: "Gilbert", timeZone: "America/Phoenix" },
    { studioId: 4, code: "JEF", locationId: "243", locationName: "Jeffersonville", timeZone: "America/New_York" }
];
const MONTHS = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

function configuredStudios() {
    if (!process.env.PTS_STUDIOS_JSON) return DEFAULT_STUDIOS;
    const studios = JSON.parse(process.env.PTS_STUDIOS_JSON);
    if (!Array.isArray(studios) || studios.length === 0) {
        throw new Error("PTS_STUDIOS_JSON must be a non-empty array");
    }
    return studios;
}

function validateDate(value, label = "orderDate") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        throw new Error(`PTS ${label} must use YYYY-MM-DD`);
    }
    return value;
}

function isoDateOffset(isoDate, days) {
    const value = new Date(`${isoDate}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

function displayDate(isoDate) {
    const [year, month, day] = isoDate.split("-");
    return `${Number(month)}/${Number(day)}/${year}`;
}

function requestedStudios(studioCodes, studioTargets) {
    const studios = studioTargets ?? configuredStudios();
    if (!Array.isArray(studios) || studios.length === 0 || studios.some(studio =>
        !studio.studioId || !studio.code || !studio.locationId || !studio.locationName || !studio.timeZone
    )) {
        throw new Error("PTS studio configuration is invalid");
    }
    if (!studioCodes?.length) return studios;
    const requested = new Set(studioCodes.map(code => String(code).toUpperCase()));
    const selected = studios.filter(studio => requested.has(studio.code));
    if (selected.length !== requested.size) {
        throw new Error("One or more requested PTS studio codes are not configured");
    }
    return selected;
}

function numberValue(value) {
    const parsed = Number(String(value ?? "").replace(/[$,]/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseOrderLocalDate(value) {
    const match = String(value ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (!match) return null;
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function parseEventDate(value) {
    const match = String(value ?? "").match(/\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\b/i);
    if (!match) return null;
    const month = MONTHS[match[1].toLowerCase()];
    return month ? `${match[3]}-${month}-${match[2].padStart(2, "0")}` : null;
}

function normalizeReservationRow(rawRow) {
    const sourceIdentity = [
        rawRow.order_id || rawRow.confirmation,
        rawRow.class_label,
        rawRow.order_datetime_text
    ].join("|");

    return {
        source_row_key: crypto.createHash("sha256").update(sourceIdentity).digest("hex"),
        order_id: rawRow.order_id || null,
        confirmation: rawRow.confirmation || null,
        order_date: parseOrderLocalDate(rawRow.order_datetime_text),
        order_datetime_text: rawRow.order_datetime_text || null,
        event_date: parseEventDate(rawRow.class_label),
        class_label: rawRow.class_label || null,
        active_reservations: numberValue(rawRow.active_reservations),
        refunded_reservations: numberValue(rawRow.refunded_reservations),
        on_hold_reservations: numberValue(rawRow.on_hold_reservations),
        checked_in_reservations: numberValue(rawRow.checked_in_reservations),
        ordered_seats: numberValue(rawRow.ordered_seats),
        booked_sales: numberValue(rawRow.booked_sales)
    };
}

function normalizePostalCode(value) {
    const match = String(value ?? "").trim().match(/^(\d{5})(?:-\d{4})?$/);
    return match?.[1] ?? null;
}

function moneyValue(value) {
    const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

async function readOrderAttributes(page, orderId) {
    await page.goto(`${PTS_URL}/Order/View/${encodeURIComponent(orderId)}`, {
        waitUntil: "domcontentloaded"
    });
    return page.evaluate(() => {
        const postalMatch = String(document.querySelector("#BillingZip")?.value ?? "")
            .trim()
            .match(/^(\d{5})(?:-\d{4})?$/);
        const itemTable = Array.from(document.querySelectorAll("table")).find(table =>
            Array.from(table.querySelectorAll("tr")).some(row => {
                const cells = Array.from(row.querySelectorAll(":scope > th, :scope > td"));
                return cells.some(cell => cell.textContent?.trim() === "Discount") &&
                    cells.some(cell => cell.textContent?.trim() === "Gross");
            })
        );
        const rows = itemTable ? Array.from(itemTable.querySelectorAll("tr")) : [];
        const headerRow = rows.find(row =>
            Array.from(row.querySelectorAll(":scope > th, :scope > td"))
                .some(cell => cell.textContent?.trim() === "Discount")
        );
        const headers = headerRow
            ? Array.from(headerRow.querySelectorAll(":scope > th, :scope > td"))
                .map(cell => cell.textContent?.trim() ?? "")
            : [];
        const discountIndex = headers.indexOf("Discount");
        const typeIndex = headers.indexOf("Type");
        const itemIndex = headers.indexOf("Item");
        const detailRows = rows.filter(row => row !== headerRow).map(row => {
            const cells = row.querySelectorAll(":scope > td");
            const discountText = cells[discountIndex]?.textContent ?? "";
            const parsed = Number(discountText.replace(/[^0-9.-]/g, ""));
            const code = discountText.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null;
            return {
                type: cells[typeIndex]?.textContent?.trim() ?? "",
                item: cells[itemIndex]?.textContent?.trim() ?? "",
                amount: Number.isFinite(parsed) ? Math.abs(parsed) : 0,
                code
            };
        });
        const descriptions = new Map(detailRows
            .filter(row => row.type === "Apply Discount" && row.code)
            .map(row => [row.code, row.item]));
        const discounts = detailRows
            .filter(row => row.amount > 0)
            .map(row => ({
                code: row.code,
                description: row.code ? descriptions.get(row.code) ?? null : null,
                amount: Math.round(row.amount * 100) / 100
            }));
        const discountAmount = discounts.reduce((sum, discount) => sum + discount.amount, 0);
        return {
            postal_code: postalMatch?.[1] ?? null,
            discount_amount: Math.round(discountAmount * 100) / 100,
            discount_used: discountAmount > 0,
            discounts
        };
    });
}

async function login(page, credentials = {}) {
    const username = credentials.username ?? process.env.PTS_USERNAME;
    const password = credentials.password ?? process.env.PTS_PASSWORD;
    if (!username || !password) {
        throw new Error("PTS_USERNAME and PTS_PASSWORD must be configured");
    }
    await page.goto(`${PTS_URL}/Account/LogOn`, { waitUntil: "domcontentloaded" });
    await page.locator("#UserName").fill(username);
    await page.locator("#Password").fill(password);
    await Promise.all([
        page.waitForURL(url => !url.pathname.includes("/Account/LogOn")),
        page.getByRole("button", { name: "Sign In" }).click()
    ]);
    if (page.url().includes("/Account/LogOn")) throw new Error("PTS login failed");
}

async function waitForGrid(page) {
    await page.locator("#list").waitFor({ state: "attached" });
    await page.waitForFunction(() => {
        const grid = document.querySelector("#list");
        const loading = document.querySelector("#load_list");
        return Boolean(grid) && (!loading || loading.style.display === "none");
    });
}

async function searchStudio(page, studio, fromDate, toDate) {
    await page.goto(`${PTS_URL}/Reservation`, { waitUntil: "domcontentloaded" });
    await page.locator("#LocationSelect").selectOption(String(studio.locationId));
    await page.locator("#FromDateFilter").fill(displayDate(fromDate));
    await page.locator("#ToDateFilter").fill(displayDate(toDate));
    await page.locator("#searchBtn").click();
    await page.waitForTimeout(500);
    await waitForGrid(page);

    const pageSize = page.locator("#pager select");
    if ((await pageSize.count()) === 1) {
        await pageSize.selectOption("500");
        await page.waitForTimeout(500);
        await waitForGrid(page);
    }
}

async function readReservationRows(page) {
    const result = await page.locator("#list").evaluate(table => {
        const rows = Array.from(table.querySelectorAll("tbody tr"))
            .filter(row => !row.classList.contains("jqgfirstrow"))
            .map(row => {
                const cells = Array.from(row.querySelectorAll("td"));
                const text = cells.map(cell => cell.textContent?.trim() ?? "");
                const orderHref = cells[10]?.querySelector("a")?.getAttribute("href") ?? "";
                return {
                    confirmation: text[1] || null,
                    order_datetime_text: text[2] || null,
                    class_label: text[3] || null,
                    active_reservations: text[4],
                    refunded_reservations: text[5],
                    on_hold_reservations: text[6],
                    checked_in_reservations: text[7],
                    ordered_seats: text[8],
                    booked_sales: text[9],
                    order_id: orderHref.match(/\/Order\/View\/(\d+)/)?.[1] ?? null
                };
            })
            .filter(row => row.confirmation && row.order_datetime_text);
        const pagerText = document.querySelector("#pager")?.textContent ?? "";
        const totalMatch = pagerText.match(/of\s+(\d+)\s*$/i);
        return { rows, total: totalMatch ? Number(totalMatch[1]) : rows.length };
    });

    if (result.total > result.rows.length) {
        throw new Error(
            `PTS Reservations grid exposed ${result.total} rows but only ${result.rows.length} were loaded`
        );
    }

    const rows = result.rows.map(normalizeReservationRow);
    const dates = rows.map(row => row.order_date).filter(Boolean);
    for (let index = 1; index < dates.length; index += 1) {
        if (dates[index] > dates[index - 1]) {
            throw new Error("PTS Reservations grid is not sorted by Order Date descending");
        }
    }
    return rows;
}

async function runPtsReservationsReport({
    orderDate,
    classFromDate,
    classToDate,
    includeOrderAttributes = false,
    studioCodes,
    credentials,
    studioTargets
} = {}) {
    const targetDate = validateDate(orderDate);
    const fromDate = validateDate(classFromDate ?? targetDate, "classFromDate");
    const toDate = validateDate(classToDate ?? isoDateOffset(targetDate, 516), "classToDate");
    if (fromDate > toDate) throw new Error("PTS classFromDate must be on or before classToDate");

    const studios = requestedStudios(studioCodes, studioTargets);
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await login(page, credentials);
        const results = [];

        for (const studio of studios) {
            await searchStudio(page, studio, fromDate, toDate);
            const allRows = await readReservationRows(page);
            const rows = allRows.filter(row => row.order_date === targetDate);
            const orderRows = includeOrderAttributes ? [...rows.filter(row => row.order_id).reduce((ordersById, row) => {
                const existing = ordersById.get(row.order_id);
                ordersById.set(row.order_id, existing
                    ? { ...existing, booked_sales: existing.booked_sales + row.booked_sales }
                    : { ...row });
                return ordersById;
            }, new Map()).values()] : [];
            const orders = [];
            for (const row of orderRows) {
                const attributes = await readOrderAttributes(page, row.order_id);
                orders.push({
                    order_id: row.order_id,
                    confirmation: row.confirmation,
                    order_date: row.order_date,
                    booked_sales: row.booked_sales,
                    postal_code: normalizePostalCode(attributes.postal_code),
                    discount_amount: moneyValue(attributes.discount_amount),
                    discount_used: attributes.discount_used === true,
                    discount_details: Array.isArray(attributes.discounts) ? attributes.discounts : []
                });
            }
            results.push({
                studioId: studio.studioId,
                brandId: studio.brandId,
                studioCode: studio.code,
                locationId: studio.locationId,
                locationName: studio.locationName,
                timeZone: studio.timeZone,
                orderDate: targetDate,
                classFromDate: fromDate,
                classToDate: toDate,
                rowCount: rows.length,
                orderCount: orders.length,
                totals: rows.reduce(
                    (sum, row) => ({
                        activeReservations: sum.activeReservations + row.active_reservations,
                        refundedReservations: sum.refundedReservations + row.refunded_reservations,
                        onHoldReservations: sum.onHoldReservations + row.on_hold_reservations,
                        orderedSeats: sum.orderedSeats + row.ordered_seats,
                        bookedSales: sum.bookedSales + row.booked_sales
                    }),
                    { activeReservations: 0, refundedReservations: 0, onHoldReservations: 0, orderedSeats: 0, bookedSales: 0 }
                ),
                orders,
                rows
            });
        }
        return results;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = {
    normalizeReservationRow,
    normalizePostalCode,
    moneyValue,
    readOrderAttributes,
    parseEventDate,
    parseOrderLocalDate,
    runPtsReservationsReport
};
