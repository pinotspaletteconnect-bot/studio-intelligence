require("dotenv").config();

const crypto = require("crypto");
const { chromium } = require("playwright");

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

function snakeCase(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[%#]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
}

function numberValue(value) {
    const normalized = String(value ?? "")
        .replace(/[,$%]/g, "")
        .replace(/^\((.*)\)$/, "-$1")
        .trim();
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
}

function firstValue(row, aliases) {
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== "") {
            return row[alias];
        }
    }

    return null;
}

function normalizeProductRows(rows) {
    return rows.map(row => {
        const minimizedRow = Object.fromEntries(
            Object.entries(row).filter(
                ([key]) => !["customer", "customer_name"].includes(key)
            )
        );

        return {
            source_row_hash: crypto
                .createHash("sha256")
                .update(JSON.stringify(minimizedRow))
                .digest("hex"),
            category: firstValue(minimizedRow, ["category", "product_category"]),
            subcategory: firstValue(minimizedRow, [
                "subcategory",
                "sub_category",
                "sub_cat"
            ]),
            item_name: firstValue(minimizedRow, [
                "item_name",
                "product",
                "product_name",
                "name",
                "item"
            ]),
            quantity: numberValue(
                firstValue(minimizedRow, ["quantity", "qty", "units"])
            ),
            gross_sales: numberValue(
                firstValue(minimizedRow, [
                    "gross_sales",
                    "gross",
                    "sales",
                    "total_sales"
                ])
            ),
            discounts: numberValue(
                firstValue(minimizedRow, ["discounts", "discount"])
            ),
            net_sales: numberValue(
                firstValue(minimizedRow, ["net_sales", "net", "sales_net"])
            ),
            tax: numberValue(
                firstValue(minimizedRow, ["tax", "taxes", "sales_tax"])
            ),
            raw_payload: minimizedRow
        };
    });
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

    await page.locator(".k-grid").nth(0).waitFor({ state: "attached" });
}

async function readProductGrid(page) {
    const grids = await page.locator(".k-grid").evaluateAll(elements =>
        elements.map(grid => {
            const domHeaders = Array.from(grid.querySelectorAll("thead th"))
                .map(header => header.textContent?.trim() ?? "")
                .filter(Boolean);
            const domRows = Array.from(grid.querySelectorAll("tbody tr"))
                .map(row =>
                    Array.from(row.querySelectorAll("td")).map(
                        cell => cell.textContent?.trim() ?? ""
                    )
                )
                .filter(row => row.some(Boolean));
            const kendoGrid = globalThis.jQuery?.(grid).data("kendoGrid");
            const kendoColumns = (kendoGrid?.columns ?? []).filter(
                column => column.field
            );
            const dataRows = Array.from(kendoGrid?.dataSource?.data?.() ?? []).map(
                item => {
                    const value = item?.toJSON ? item.toJSON() : { ...item };

                    return Object.fromEntries(
                        kendoColumns.map(column => [
                            column.field,
                            value[column.field] ?? null
                        ])
                    );
                }
            );

            return {
                id: grid.id || null,
                visible: Boolean(grid.offsetWidth || grid.offsetHeight),
                headers:
                    kendoColumns.length > 0
                        ? kendoColumns.map(column => column.title || column.field)
                        : domHeaders,
                fields: kendoColumns.map(column => column.field),
                rows: domRows,
                dataRows
            };
        })
    );

    const scored = grids
        .map(grid => {
            const normalizedHeaders = grid.headers.map(snakeCase);
            const headerText = normalizedHeaders.join(" ");
            const score =
                (headerText.includes("category") ? 4 : 0) +
                (/(product|item|name)/.test(headerText) ? 3 : 0) +
                (/(sales|gross|net|total)/.test(headerText) ? 2 : 0) +
                (/(quantity|qty|units)/.test(headerText) ? 1 : 0) +
                (grid.dataRows.length > 0 || grid.rows.length > 0 ? 1 : 0);

            return { ...grid, normalizedHeaders, score };
        })
        .sort((a, b) => b.score - a.score);
    const selected = scored[0];

    if (!selected || selected.score < 6) {
        throw new Error(
            `PTS Product Sales grid was not identified (${JSON.stringify(
                scored.map(grid => ({
                    id: grid.id,
                    visible: grid.visible,
                    headers: grid.headers,
                    rowCount: Math.max(
                        grid.dataRows.length,
                        grid.rows.length
                    ),
                    score: grid.score
                }))
            )})`
        );
    }

    const rawRows =
        selected.dataRows.length > 0
            ? selected.dataRows.map(row =>
                  Object.fromEntries(
                      Object.entries(row).map(([key, value]) => [
                          snakeCase(key),
                          value
                      ])
                  )
              )
            : selected.rows.map(values =>
                  Object.fromEntries(
                      selected.normalizedHeaders.map((header, index) => [
                          header || `column_${index + 1}`,
                          values[index] ?? null
                      ])
                  )
              );

    return {
        gridId: selected.id,
        columns:
            selected.fields.length > 0
                ? selected.fields.map(snakeCase)
                : selected.normalizedHeaders,
        rows: normalizeProductRows(rawRows)
    };
}

async function runPtsProductSalesReport({ reportDate, studioCodes } = {}) {
    const date = validateDate(reportDate);
    const studios = requestedStudios(studioCodes);
    let browser;

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await login(page);
        const results = [];

        for (const studio of studios) {
            await page.goto(`${PTS_URL}/Reports/ProductSalesReport`, {
                waitUntil: "domcontentloaded"
            });
            await selectStudio(page, studio);
            await runReport(page, date);
            const report = await readProductGrid(page);

            results.push({
                studioId: studio.studioId,
                studioCode: studio.code,
                locationId: studio.locationId,
                locationName: studio.locationName,
                reportDate: date,
                gridId: report.gridId,
                columns: report.columns,
                rowCount: report.rows.length,
                rows: report.rows
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
    normalizeProductRows,
    runPtsProductSalesReport
};
