require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const { parseNonClassSales } = require("../../services/ptsParser");

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
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
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
            category: firstValue(minimizedRow, [
                "category",
                "product_category",
                "item_category"
            ]),
            subcategory: firstValue(minimizedRow, [
                "subcategory",
                "sub_category",
                "sub_cat",
                "item_subcategory"
            ]),
            item_name: firstValue(minimizedRow, [
                "item_name",
                "product",
                "product_name",
                "name",
                "item",
                "item_name_short"
            ]),
            quantity: numberValue(
                firstValue(minimizedRow, [
                    "quantity",
                    "qty",
                    "units",
                    "quantity_towards_total"
                ])
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

async function runReport(page, fromDate, toDate) {
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

    await page.locator(".k-grid").nth(0).waitFor({ state: "attached" });
    await page.locator(".k-grid-excel").nth(0).waitFor({ state: "attached" });
}

async function downloadProductWorkbook(page, folder, studio, fromDate, toDate) {
    const excelButton = page.locator(".k-grid-excel").nth(0);

    const [download] = await Promise.all([
        page.waitForEvent("download"),
        excelButton.dispatchEvent("click")
    ]);
    const filePath = path.join(
        folder,
        `${studio.code}_${fromDate}_${toDate}_product-sales.xlsx`
    );
    await download.saveAs(filePath);

    return filePath;
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
            const dataSource = kendoGrid?.dataSource;
            const kendoItems =
                [
                    dataSource?.view?.(),
                    dataSource?.data?.(),
                    dataSource?._data,
                    dataSource?._pristineData
                ].find(items => items?.length > 0) ?? [];
            const dataRows = Array.from(kendoItems).map(item => {
                const value = item?.toJSON ? item.toJSON() : { ...item };

                return Object.fromEntries(
                    kendoColumns.map(column => [
                        column.field,
                        value[column.field] ?? null
                    ])
                );
            });

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

async function runPtsProductSalesReport({
    reportDate,
    fromDate,
    toDate,
    studioCodes
} = {}) {
    const from = validateDate(fromDate ?? reportDate);
    const to = validateDate(toDate ?? reportDate);

    if (from > to) {
        throw new Error("PTS fromDate must be on or before toDate");
    }

    const studios = requestedStudios(studioCodes);
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "pts-products-"));
    let browser;

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();
        await login(page);
        const results = [];

        for (const studio of studios) {
            await page.goto(`${PTS_URL}/Reports/ProductSalesReport`, {
                waitUntil: "domcontentloaded"
            });
            await selectStudio(page, studio);
            await runReport(page, from, to);
            const productFile = await downloadProductWorkbook(
                page,
                folder,
                studio,
                from,
                to
            );
            const rows = (await parseNonClassSales(productFile)).filter(
                row => row.category && row.item_name
            );

            results.push({
                studioId: studio.studioId,
                studioCode: studio.code,
                locationId: studio.locationId,
                locationName: studio.locationName,
                fromDate: from,
                toDate: to,
                gridId: "griddDetailsData",
                columns: [
                    "order_number",
                    "sale_date",
                    "order_date",
                    "sale_or_order",
                    "source",
                    "payment_method",
                    "item_type",
                    "category",
                    "subcategory",
                    "item_name",
                    "quantity",
                    "gross_sales",
                    "net_sales",
                    "tax",
                    "alcohol_tax",
                    "nat_sales"
                ],
                rowCount: rows.length,
                rows
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

async function parsePtsProductSalesUpload({ file, studioCode }) {
    if (!Buffer.isBuffer(file) || file.length === 0) {
        throw new Error("PTS Product Sales upload must include a non-empty Excel file");
    }

    const normalizedCode = String(studioCode ?? "")
        .trim()
        .toUpperCase();
    const studio = configuredStudios().find(
        candidate => String(candidate.code).toUpperCase() === normalizedCode
    );

    if (!studio) {
        throw new Error(`Unknown PTS studio code: ${normalizedCode || "missing"}`);
    }

    const rows = normalizeProductRows(await parseNonClassSales(file));

    if (rows.length === 0) {
        throw new Error("PTS Product Sales workbook contained no product rows");
    }

    return {
        studioId: studio.studioId,
        studioCode: studio.code,
        locationId: studio.locationId,
        locationName: studio.locationName,
        rowCount: rows.length,
        rows
    };
}

module.exports = {
    normalizeProductRows,
    parsePtsProductSalesUpload,
    runPtsProductSalesReport
};
