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

function numericValue(value) {
    if (typeof value === "number") {
        return value;
    }

    const normalized = String(value ?? "")
        .replace(/[,$%]/g, "")
        .replace(/^\((.*)\)$/, "-$1")
        .trim();
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
}

function percentageValue(value) {
    const numeric = numericValue(value);

    return typeof value === "string" && value.includes("%")
        ? numeric / 100
        : numeric;
}

function rowHash(row) {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(row))
        .digest("hex");
}

function wallClockParts(value) {
    if (typeof value === "string") {
        const ptsDateTime = value.trim().match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        );

        if (ptsDateTime) {
            const [, month, day, year, hourValue, minute, meridiem] =
                ptsDateTime;
            let hour = Number(hourValue) % 12;

            if (meridiem.toUpperCase() === "PM") {
                hour += 12;
            }

            return {
                year: Number(year),
                month: Number(month),
                day: Number(day),
                hour,
                minute: Number(minute),
                second: 0
            };
        }
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds()
    };
}

function dateKey(parts) {
    if (!parts) {
        return null;
    }

    return [parts.year, parts.month, parts.day]
        .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0"))
        .join("-");
}

function zonedWallClockToIso(value, timeZone) {
    const parts = wallClockParts(value);

    if (!parts) {
        return null;
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    });
    const desiredUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );
    let instant = desiredUtc;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const observed = Object.fromEntries(
            formatter
                .formatToParts(new Date(instant))
                .filter(part => part.type !== "literal")
                .map(part => [part.type, Number(part.value)])
        );
        const observedUtc = Date.UTC(
            observed.year,
            observed.month - 1,
            observed.day,
            observed.hour,
            observed.minute,
            observed.second
        );
        instant += desiredUtc - observedUtc;
    }

    return new Date(instant).toISOString();
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

async function parseClassSales(filePath, { timeZone = "America/New_York" } = {}) {
    const rows = await worksheetRows(filePath, [
        "Painting",
        "Time",
        "Seats",
        "Net Sales"
    ]);

    return normalizeClassSalesRows(rows, { timeZone });
}

function normalizeClassSalesRows(
    rows,
    { timeZone = "America/New_York" } = {}
) {
    return rows
        .filter(row => row.painting && row.time && row.type)
        .map(row => {
            const eventIdentity = {
                painting: row.painting,
                time: normalizedValue(row.time),
                room: row.room ?? null
            };

            return {
                source_event_key: rowHash(eventIdentity),
                source_row_hash: rowHash(row),
                event_date: dateKey(wallClockParts(row.time)),
                display_name:
                    row.display_name ??
                    row.class_display_name ??
                    row.event_display_name ??
                    row.class_name ??
                    row.title ??
                    null,
                painting: row.painting,
                class_time: zonedWallClockToIso(row.time, timeZone),
                room: row.room ?? null,
                class_type: row.type,
                seats_sold: numericValue(row.seats),
                capacity: numericValue(row.cap),
                percent_full: percentageValue(row.full),
                lead_time_average:
                    row.lead_avg === null || row.lead_avg === undefined
                        ? null
                        : numericValue(row.lead_avg),
                class_sales: numericValue(row.classes),
                product_sales: numericValue(row.products),
                fee_sales: numericValue(row.fees),
                net_sales: numericValue(row.net_sales),
                raw_payload: row
            };
        });
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
    normalizeClassSalesRows,
    parseClassSales,
    parseNonClassSales
};
