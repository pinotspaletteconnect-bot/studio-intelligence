require("dotenv").config();

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const {
    normalizeClassSalesRows,
    parseClassSales,
    parseNonClassSales
} = require("../../services/ptsParser");

const PTS_URL = "https://admin.pinotspalette.com";
const DEFAULT_STUDIOS = [
    {
        studioId: 1,
        code: "STM",
        locationId: "19",
        locationName: "St. Matthews",
        timeZone: "America/New_York"
    },
    {
        studioId: 2,
        code: "SN",
        locationId: "228",
        locationName: "Short North",
        timeZone: "America/New_York"
    },
    {
        studioId: 3,
        code: "GIL",
        locationId: "198",
        locationName: "Gilbert",
        timeZone: "America/Phoenix"
    },
    {
        studioId: 4,
        code: "JEF",
        locationId: "243",
        locationName: "Jeffersonville",
        timeZone: "America/New_York"
    }
];
const DEFAULT_TIME_ZONES = Object.fromEntries(
    DEFAULT_STUDIOS.map(studio => [studio.code, studio.timeZone])
);

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

function isoDateOffset(isoDate, days) {
    const value = new Date(`${isoDate}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

function weeklyWindows(fromDate, toDate) {
    const windows = [];
    let start = fromDate;

    while (start <= toDate) {
        const end = [isoDateOffset(start, 6), toDate].sort()[0];
        windows.push({ fromDate: start, toDate: end });
        start = isoDateOffset(end, 1);
    }

    return windows;
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

function snakeCase(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[%#]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
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

async function runReport(page, fromDate, toDate = fromDate) {
    const from = displayDate(fromDate);
    const to = displayDate(toDate);

    await page.locator("#DateFilter_FromDate").fill(from);
    await page.locator("#DateFilter_FromDate").press("Tab");
    await page.locator("#DateFilter_ToDate").fill(to);
    await page.locator("#DateFilter_ToDate").press("Tab");

    const navigation = page
        .waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: 10000
        })
        .catch(() => null);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await navigation;
    await page.waitForTimeout(4000);

    // The report heading's date formatting can vary (for example, padded
    // month/day values), so use the report controls as the readiness signal.
    // Navigation guarantees these are from the newly requested report.
    await page.locator("table.SalesSummary").waitFor({ state: "visible" });
    await page.locator(".k-grid-excel").nth(0).waitFor({ state: "attached" });
    await page.locator(".k-grid-excel").nth(1).waitFor({ state: "attached" });
}

async function downloadClassWorkbook(page, folder, studio, fromDate, toDate) {
    const excelButton = page.locator(".k-grid-excel").nth(0);

    if (!(await excelButton.isVisible())) {
        return null;
    }

    const [download] = await Promise.all([
        page.waitForEvent("download"),
        excelButton.click({ force: true })
    ]);
    const filePath = path.join(
        folder,
        `${studio.code}_${fromDate}_${toDate}_class-sales.xlsx`
    );
    await download.saveAs(filePath);

    return filePath;
}

async function refreshClassGrid(page) {
    const refreshResult = await page.evaluate(async () => {
        const grid = globalThis.jQuery
            ? globalThis
                  .jQuery("#gridClassSummarySalesData")
                  .data("kendoGrid")
            : null;

        if (!grid?.dataSource) {
            return { initialized: false };
        }

        return new Promise(resolve => {
            const dataSource = grid.dataSource;
            let settled = false;
            let timeout;

            const finish = error => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timeout);
                dataSource.unbind("change", handleChange);
                dataSource.unbind("error", handleError);
                resolve({
                    initialized: true,
                    error,
                    total: dataSource.total?.() ?? null,
                    viewCount: dataSource.view?.()?.length ?? null
                });
            };
            const handleChange = () => {
                // Kendo's change event means the refreshed records have been
                // applied. Give the grid two paint frames to update its rows
                // before Playwright reads the DOM.
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => finish(null))
                );
            };
            const handleError = event => {
                finish(
                    event?.xhr?.status ??
                        event?.errorThrown ??
                        event?.status ??
                        "request failed"
                );
            };

            dataSource.bind("change", handleChange);
            dataSource.bind("error", handleError);
            timeout = setTimeout(() => finish("request timed out"), 15000);

            try {
                dataSource.read();
            } catch (error) {
                finish(error?.message ?? "request failed");
            }
        });
    });

    if (!refreshResult.initialized) {
        throw new Error("PTS Class Sales grid was not initialized");
    }

    if (refreshResult.error) {
        throw new Error(`PTS Class Sales grid ${refreshResult.error}`);
    }
}

async function readClassGrid(page, { timeZone }) {
    const grid = page.locator("#gridClassSummarySalesData");
    const result = await grid.evaluate(element => {
        const kendoGrid = globalThis.jQuery
            ? globalThis.jQuery(element).data("kendoGrid")
            : null;
        const headers = (kendoGrid?.columns ?? [])
            .filter(column => !column.hidden)
            .map(column => column.title || column.field || "");
        const rows = Array.from(element.querySelectorAll("tbody tr"))
            .filter(row => !row.classList.contains("k-grouping-row"))
            .map(row =>
                Array.from(row.querySelectorAll("td")).map(
                    cell => cell.textContent?.trim() ?? ""
                )
            )
            .filter(row => row.some(Boolean));

        return {
            headers,
            rows,
            total: kendoGrid?.dataSource?.total?.() ?? null
        };
    });

    if (!result.headers.length) {
        throw new Error("PTS Class Sales grid did not expose columns");
    }

    const headers = result.headers.map(snakeCase);
    const rawRows = result.rows.map(values =>
        Object.fromEntries(
            headers.map((header, index) => [
                header || `column_${index + 1}`,
                values[index] ?? null
            ])
        )
    );
    const rows = normalizeClassSalesRows(rawRows, { timeZone });

    if (result.total > 0 && rows.length === 0) {
        throw new Error(
            `PTS Class Sales grid contained ${result.total} records but no class rows were parsed`
        );
    }

    return rows;
}

async function inspectClassReportControls(page) {
    return page.evaluate(() => {
        const classGrid = document.querySelector("#gridClassSummarySalesData");
        const kendoGrid = globalThis.jQuery
            ? globalThis
                  .jQuery("#gridClassSummarySalesData")
                  .data("kendoGrid")
            : null;
        const dataSource = kendoGrid?.dataSource;
        const transportRead = dataSource?.transport?.options?.read;
        const controls = Array.from(document.querySelectorAll("input, select"))
            .filter(control => control.getAttribute("type") !== "password")
            .map(control => ({
                tag: control.tagName.toLowerCase(),
                type: control.getAttribute("type"),
                id: control.id || null,
                name: control.getAttribute("name"),
                value: control.value,
                checked:
                    "checked" in control
                        ? Boolean(control.checked)
                        : undefined
            }));
        const labels = Array.from(document.querySelectorAll("label"))
            .map(label => ({
                for: label.getAttribute("for"),
                text: label.textContent?.trim() || null
            }))
            .filter(label => label.text);

        return {
            pageUrl: window.location.href,
            locationValue:
                document.querySelector("#LocationSelect")?.value ?? null,
            fromDateValue:
                document.querySelector("#DateFilter_FromDate")?.value ?? null,
            toDateValue:
                document.querySelector("#DateFilter_ToDate")?.value ?? null,
            classGridState: {
                initialized: Boolean(kendoGrid),
                total: dataSource?.total?.() ?? null,
                viewCount: dataSource?.view?.()?.length ?? null,
                requestInProgress:
                    dataSource?._requestInProgress ?? null,
                readUrl:
                    typeof transportRead === "string"
                        ? transportRead
                        : transportRead?.url ?? null,
                readMethod:
                    typeof transportRead === "object"
                        ? transportRead.type ?? null
                        : null
            },
            classGridText: classGrid?.textContent?.trim().slice(0, 500) ?? null,
            controls,
            labels
        };
    });
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
        const excelButton = excelButtons.nth(index);
        const details = await excelButton.evaluate(button => {
            const grid = button.closest(".k-grid");

            return {
                buttonClass: button.className,
                buttonStyle: button.getAttribute("style"),
                buttonText: button.textContent?.trim(),
                gridClass: grid?.className,
                gridId: grid?.id,
                gridStyle: grid?.getAttribute("style"),
                gridText: grid?.textContent?.trim().slice(0, 160)
            };
        });

        if (!(await excelButton.isVisible())) {
            files.push(null);
            continue;
        }

        let download;

        try {
            [download] = await Promise.all([
                page.waitForEvent("download"),
                excelButton.click({ force: true })
            ]);
        } catch (error) {
            throw new Error(
                `PTS ${label} export failed (${JSON.stringify(details)}): ${error.message}`
            );
        }
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
                classSales: classFile
                    ? await parseClassSales(classFile, {
                        timeZone:
                            studio.timeZone ??
                            DEFAULT_TIME_ZONES[studio.code] ??
                            "America/New_York"
                    })
                    : [],
                nonClassSales: nonClassFile ? await parseNonClassSales(nonClassFile) : []
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

async function runPtsClassSalesReport({
    fromDate,
    toDate,
    studioCodes,
    debug = false
} = {}) {
    const from = validateDate(fromDate);
    const to = validateDate(toDate);

    if (from > to) {
        throw new Error("PTS fromDate must be on or before toDate");
    }

    const studios = requestedStudios(studioCodes);
    const windows = weeklyWindows(from, to);
    let browser;

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();
        await login(page);
        const results = [];

        for (const studio of studios) {
            const eventRows = new Map();
            let diagnostics = null;

            for (const window of windows) {
                await page.goto(`${PTS_URL}/Reports/SalesReport`, {
                    waitUntil: "domcontentloaded"
                });
                await selectStudio(page, studio);
                await runReport(page, window.fromDate, window.toDate);
                await refreshClassGrid(page);

                if (debug && diagnostics === null) {
                    diagnostics = await inspectClassReportControls(page);
                }

                const rows = await readClassGrid(page, {
                    timeZone:
                        studio.timeZone ??
                        DEFAULT_TIME_ZONES[studio.code] ??
                        "America/New_York"
                });

                for (const row of rows) {
                    eventRows.set(row.source_event_key, row);
                }
            }

            const rows = Array.from(eventRows.values());

            results.push({
                studioId: studio.studioId,
                studioCode: studio.code,
                locationId: studio.locationId,
                locationName: studio.locationName,
                timeZone:
                    studio.timeZone ??
                    DEFAULT_TIME_ZONES[studio.code] ??
                    "America/New_York",
                fromDate: from,
                toDate: to,
                windowCount: windows.length,
                rowCount: rows.length,
                rows,
                ...(debug ? { diagnostics } : {})
            });
        }

        return results;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    runPtsClassSalesReport,
    runPtsSalesReport
};
