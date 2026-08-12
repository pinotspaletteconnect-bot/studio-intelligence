const { chromium } = require("playwright");

const COMPANY_TIMESHEETS_URL = "https://app.joinhomebase.com/company_timesheets";

function normalizeLabel(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

function numberValue(value) {
    const normalized = String(value ?? "").replace(/[$,%\s,]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseCompanyRows(rows, retrievedAt = new Date().toISOString()) {
    const totals = new Map();
    for (const cells of rows) {
        if (!Array.isArray(cells) || cells.length < 13) continue;
        const location = String(cells[1] ?? "").trim();
        if (!location) continue;
        const key = normalizeLabel(location);
        const current = totals.get(key) ?? {
            location,
            scheduled_hours: 0,
            actual_hours: 0,
            unpaid_break_hours: 0,
            pto_hours: 0,
            regular_hours: 0,
            overtime_hours: 0,
            actual_cost: 0,
            retrieved_at: retrievedAt
        };
        current.scheduled_hours += numberValue(cells[2]);
        current.actual_hours += numberValue(cells[3]);
        current.unpaid_break_hours += numberValue(cells[4]);
        current.pto_hours += numberValue(cells[5]);
        current.regular_hours += numberValue(cells[7]);
        current.overtime_hours += numberValue(cells[8]) + numberValue(cells[9]);
        current.actual_cost += numberValue(cells[11]);
        totals.set(key, current);
    }
    return [...totals.values()];
}

function dateParts(date) {
    const [year, month, day] = date.split("-").map(Number);
    return { year, month, day };
}

async function login(page, { email, password }) {
    await page.goto(COMPANY_TIMESHEETS_URL, { waitUntil: "domcontentloaded" });
    if (page.url().includes("company_timesheets")) return;
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 20000 });
    await emailInput.fill(email);
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    if (!await passwordInput.isVisible().catch(() => false)) {
        await page.getByRole("button", { name: /continue|next/i }).click();
        await passwordInput.waitFor({ state: "visible", timeout: 10000 });
    }
    await passwordInput.fill(password);
    await page.getByRole("button", { name: /sign in|log in|continue/i }).last().click();

    // Homebase's current sign-in UI can complete authentication without changing
    // the top-level URL. Verify the session by requesting the protected page
    // instead of relying on a redirect from the login form.
    await page.waitForTimeout(2500);
    await page.goto(COMPANY_TIMESHEETS_URL, { waitUntil: "domcontentloaded" });
    const redirectedToLogin = /joinhomebase\.com\/(?:accounts|login)/i.test(page.url());
    const loginFormVisible = await page.locator('input[type="email"], input[name="email"]').first()
        .isVisible().catch(() => false);
    if (redirectedToLogin || loginFormVisible) {
        throw new Error("Homebase login was not accepted or requires additional verification");
    }
}

async function selectDay(page, date) {
    const { year, month, day } = dateParts(date);
    const dateInput = page.getByRole("textbox", { name: "Choose a date" });
    await dateInput.click();
    await page.getByText("Custom", { exact: true }).click();
    const targetMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
        .format(new Date(Date.UTC(year, month - 1, 1)));
    for (let attempt = 0; attempt < 15; attempt += 1) {
        const monthHeading = page.getByText(targetMonth, { exact: true });
        if (await monthHeading.count()) break;
        await page.getByRole("button", { name: "Previous month" }).click();
    }
    const monthGrid = page.getByText(targetMonth, { exact: true }).locator("xpath=following::*[@role='grid'][1]");
    const dayCell = monthGrid.getByRole("gridcell", { name: String(day), exact: true });
    const fallback = page.getByRole("gridcell", { name: String(day), exact: true });
    const cell = await dayCell.count() ? dayCell.first() : fallback.first();
    await cell.click();
    const refreshedCell = await dayCell.count() ? dayCell.first() : fallback.first();
    await refreshedCell.click();
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("button", { name: "Retrieve timesheets" }).click();
    const exportButton = page.getByRole("button", { name: "Export" });
    await exportButton.waitFor({ state: "visible", timeout: 30000 });
    for (let attempt = 0; attempt < 60 && !await exportButton.isEnabled(); attempt += 1) await page.waitForTimeout(500);
    if (!await exportButton.isEnabled()) throw new Error(`Homebase timesheets did not finish loading for ${date}`);
}

async function collectDay(page, date, targets) {
    await selectDay(page, date);
    const rows = await page.locator("table tbody tr").evaluateAll(elements =>
        elements.map(row => [...row.querySelectorAll("td")].map(cell => cell.textContent?.trim() ?? ""))
    );
    const source = parseCompanyRows(rows);
    const results = [];
    for (const target of targets) {
        const matched = source.find(row =>
            normalizeLabel(row.location) === normalizeLabel(target.location_name) ||
            normalizeLabel(row.location) === normalizeLabel(target.studio_name)
        );
        results.push({
            accountId: Number(target.account_id),
            studioId: Number(target.studio_id),
            studioName: target.studio_name,
            daily: {
                labor_date: date,
                scheduled_hours: matched?.scheduled_hours ?? 0,
                actual_hours: matched?.actual_hours ?? 0,
                scheduled_cost: 0,
                actual_cost: matched?.actual_cost ?? 0,
                regular_hours: matched?.regular_hours ?? 0,
                overtime_hours: matched?.overtime_hours ?? 0,
                double_overtime_hours: 0,
                retrieved_at: matched?.retrieved_at ?? new Date().toISOString()
            }
        });
    }
    return results;
}

async function collectCompanyTimesheets(credentials, dates) {
    if (!Array.isArray(dates) || dates.length < 1 || dates.length > 31 || dates.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
        throw new Error("Homebase timesheet dates are invalid");
    }
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        await login(page, credentials);
        const byTarget = new Map(credentials.targets.map(target => [Number(target.account_id), { target, daily: [] }]));
        for (const date of dates) {
            for (const result of await collectDay(page, date, credentials.targets)) {
                byTarget.get(result.accountId).daily.push(result.daily);
            }
        }
        return [...byTarget.values()].map(({ target, daily }) => ({ target, daily, shifts: [] }));
    } finally {
        await browser.close();
    }
}

module.exports = { collectCompanyTimesheets, normalizeLabel, numberValue, parseCompanyRows };
