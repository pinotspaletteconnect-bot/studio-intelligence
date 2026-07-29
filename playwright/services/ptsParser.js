const crypto = require("crypto");
const { readSheet } = require("read-excel-file/node");

function snakeCase(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[%#]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
}

function normalizedValue(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return value === undefined ? null : value;
}

function rowHash(row) {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(row))
        .digest("hex");
}

async function worksheetRows(filePath, requiredHeaders) {
    const rows = await readSheet(filePath);
    const headerIndex = rows.findIndex(row => {
        const headers = row.map(value => String(value ?? "").trim());
        return requiredHeaders.every(header => headers.includes(header));
    });

    if (headerIndex < 0) {
        throw new Error(
            `PTS workbook is missing required headers: ${requiredHeaders.join(", ")}`
        );
    }

    const headers = rows[headerIndex].map(snakeCase);

    return rows
        .slice(headerIndex + 1)
        .filter(row => row.some(value => value !== null && value !== ""))
        .map(row =>
            Object.fromEntries(
                headers.map((header, index) => [
                    header || `column_${index + 1}`,
                    normalizedValue(row[index])
                ])
            )
        );
}

async function parseClassSales(filePath) {
    const rows = await worksheetRows(filePath, [
        "Painting",
        "Time",
        "Seats",
        "Net Sales"
    ]);

    return rows.map(row => ({
        source_row_hash: rowHash(row),
        painting: row.painting ?? null,
        class_time: row.time ?? null,
        room: row.room ?? null,
        class_type: row.type ?? null,
        seats_sold: row.seats ?? 0,
        capacity: row.cap ?? 0,
        percent_full: row.full ?? 0,
        lead_time_average: row.lead_avg ?? null,
        class_sales: row.classes ?? 0,
        product_sales: row.products ?? 0,
        fee_sales: row.fees ?? 0,
        net_sales: row.net_sales ?? 0,
        raw_payload: row
    }));
}

async function parseNonClassSales(filePath) {
    const rows = await worksheetRows(filePath, [
        "Order #",
        "Sale Date",
        "Name",
        "Net"
    ]);

    return rows.map(row => {
        // Customer name is deliberately removed. Product and revenue reporting
        // does not require this personal data.
        const { customer: _customer, ...minimizedRow } = row;

        return {
            source_row_hash: rowHash(minimizedRow),
            order_number: row.order ?? null,
            sale_date: row.sale_date ?? null,
            order_date: row.order_date ?? null,
            sale_or_order: row.sale_order ?? null,
            source: row.source ?? null,
            payment_method: row.payment ?? null,
            item_type: row.type ?? null,
            category: row.category ?? null,
            subcategory: row.sub_cat ?? null,
            item_name: row.name ?? null,
            quantity: row.qty ?? 0,
            gross_sales: row.gross ?? 0,
            net_sales: row.net ?? 0,
            tax: row.tax ?? 0,
            alcohol_tax: row.alc_tax ?? 0,
            nat_sales: row.nat ?? 0,
            raw_payload: minimizedRow
        };
    });
}

module.exports = {
    parseClassSales,
    parseNonClassSales
};
