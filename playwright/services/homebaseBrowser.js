const { storeHomebaseBrowserSession } = require("./homebaseCredentials");
const { launchHomebaseBrowser } = require("./homebaseDisplay");
const csv = require("csv-parser");

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

function parseDetailedRows(rows, retrievedAt = new Date().toISOString()) {
    const totals = new Map();
    for (const row of rows) {
        const location = String(row.Location ?? "").trim();
        if (!location || normalizeLabel(location) === "totals") continue;
        const role = String(row.Role ?? "").replace(/\s+/g, " ").trim();
        const key = `${normalizeLabel(location)}|${normalizeLabel(role)}`;
        const current = totals.get(key) ?? {
            location,
            role: role || null,
            scheduled_hours: 0,
            actual_hours: 0,
            scheduled_cost: 0,
            actual_cost: 0,
            retrieved_at: retrievedAt
        };
        const scheduledHours = numberValue(row["Scheduled Hours"]);
        current.scheduled_hours += scheduledHours;
        current.actual_hours += numberValue(row["Actual Hours"]);
        current.scheduled_cost += scheduledHours * numberValue(row["Wage Rate"]);
        current.actual_cost += numberValue(row["Pay Total"]);
        totals.set(key, current);
    }
    return [...totals.values()];
}

async function exportDetailedRows(page) {
    await page.getByRole("button", { name: "Export" }).click();
    const byLocations = page.getByRole("radiogroup").getByText("By locations", { exact: true });
    await byLocations.waitFor({ state: "visible", timeout: 10000 });
    await byLocations.click();
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await page.getByRole("button", { name: /Export timesheets/i }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const rows = [];
    await new Promise((resolve, reject) => {
        stream.pipe(csv({ skipLines: 1 }))
            .on("data", row => rows.push(row))
            .on("end", resolve)
            .on("error", reject);
    });
    return rows;
}

function dateParts(date) {
    const [year, month, day] = date.split("-").map(Number);
    return { year, month, day };
}

function accountChoiceKey(value) {
    return normalizeLabel(value).replace(/[^a-z0-9]/g, "");
}

function safeLoginMessage(messages) {
    const message = messages.map(value => String(value).replace(/\s+/g, " ").trim()).find(Boolean);
    return message ? message.slice(0, 240) : null;
}

async function selectAccountIfRequired(page, targets = []) {
    const dateInput = page.getByRole("textbox", { name: "Choose a date" });
    if (await dateInput.isVisible().catch(() => false)) return;

    const choices = page.locator("a:visible, button:visible, [role='button']:visible");
    const labels = await choices.allTextContents();
    const targetKeys = targets
        .flatMap(target => [target.location_name, target.studio_name])
        .filter(Boolean)
        .map(accountChoiceKey);
    const choiceIndex = labels.findIndex(label => {
        const key = accountChoiceKey(label);
        if (!key) return false;
        return targetKeys.some(targetKey => key.includes(targetKey) || targetKey.includes(key));
    });
    if (choiceIndex >= 0) {
        await choices.nth(choiceIndex).click();
        await page.waitForTimeout(1500);
        await page.goto(COMPANY_TIMESHEETS_URL, { waitUntil: "domcontentloaded" });
    }

    await dateInput.waitFor({ state: "visible", timeout: 30000 }).catch(() => {
        const pathname = new URL(page.url()).pathname;
        throw new Error(`Homebase Company Timesheets is unavailable after login (${pathname})`);
    });
}

async function login(page, { email, password, targets }, options = {}) {
    await page.goto(COMPANY_TIMESHEETS_URL, { waitUntil: "domcontentloaded" });
    if (page.url().includes("company_timesheets")) {
        await selectAccountIfRequired(page, targets);
        if (options.capture) await options.capture(page, { status: "authenticated", message: null });
        return;
    }
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 20000 });
    await emailInput.fill(email);
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    if (!await passwordInput.isVisible().catch(() => false)) {
        await page.getByRole("button", { name: /continue|next/i }).click();
        await passwordInput.waitFor({ state: "visible", timeout: 10000 });
    }
    await passwordInput.fill(password);
    const formSubmit = page.locator('button[type="submit"]:visible, input[type="submit"]:visible').first();
    if (await formSubmit.count()) {
        await formSubmit.click();
    } else {
        await page.getByRole("button", { name: /^(?:sign in|log in|continue)$/i }).first().click();
    }

    // Allow the SPA authentication request and session cookie to settle before
    // checking the protected page. A fixed short delay can interrupt Homebase's
    // login request on slower production browsers.
    await page.waitForURL(url => !/\/(?:accounts\/sign[-_]?in|login)(?:[/?#]|$)/i.test(url.pathname), {
        timeout: 15000,
        waitUntil: "domcontentloaded"
    }).catch(() => null);
    const messages = await page.locator('[role="alert"], [data-testid*="error" i], .alert, .error')
        .allTextContents().catch(() => []);
    const loginMessage = safeLoginMessage(messages);
    if (options.capture) await options.capture(page, {
        status: /\/(?:accounts\/sign[-_]?in|login)(?:[/?#]|$)/i.test(new URL(page.url()).pathname) ? "sign_in" : "redirected",
        message: loginMessage
    });
    await page.goto(COMPANY_TIMESHEETS_URL, { waitUntil: "domcontentloaded" });
    const redirectedToLogin = /joinhomebase\.com\/(?:accounts\/(?:sign[-_]?in|login)|login)(?:[/?#]|$)/i.test(page.url());
    const loginFormVisible = await page.locator('input[type="email"], input[name="email"]').first()
        .isVisible().catch(() => false);
    if (redirectedToLogin || loginFormVisible) {
        throw new Error(loginMessage
            ? `Homebase login was not accepted: ${loginMessage}`
            : "Homebase login was not accepted or requires additional verification");
    }
    await selectAccountIfRequired(page, targets);
}

async function captureLoginDiagnostic(credentials) {
    const browser = await launchHomebaseBrowser();
    let diagnostic;
    try {
        const context = await browser.newContext({ storageState: credentials.storageState, locale: "en-US" });
        const page = await context.newPage();
        try {
            await login(page, credentials, { capture: async (capturedPage, result) => {
                await capturedPage.locator('input[type="email"], input[name="email"], input[type="password"], input[name="password"]')
                    .evaluateAll(inputs => inputs.forEach(input => { input.value = ""; input.setAttribute("value", ""); }));
                diagnostic = {
                    image: await capturedPage.screenshot({ fullPage: true }),
                    status: result.status,
                    message: result.message,
                    pathname: new URL(capturedPage.url()).pathname
                };
            }});
        } catch (error) {
            if (!diagnostic) {
                await page.locator('input[type="email"], input[name="email"], input[type="password"], input[name="password"]')
                    .evaluateAll(inputs => inputs.forEach(input => { input.value = ""; input.setAttribute("value", ""); }));
                diagnostic = {
                    image: await page.screenshot({ fullPage: true }),
                    status: "error",
                    message: safeLoginMessage([error.message]),
                    pathname: new URL(page.url()).pathname
                };
            }
        }
        return diagnostic;
    } finally {
        await browser.close();
    }
}

async function selectDay(page, date) {
    const { year, month, day } = dateParts(date);
    const dateInput = page.getByRole("textbox", { name: "Choose a date" });
    await dateInput.click();
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
    const roleSource = parseDetailedRows(await exportDetailedRows(page));
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
            },
            roles: roleSource
                .filter(row => normalizeLabel(row.location) === normalizeLabel(target.location_name) || normalizeLabel(row.location) === normalizeLabel(target.studio_name))
                .map(row => ({
                    labor_date: date,
                    role: row.role,
                    scheduled_hours: row.scheduled_hours,
                    actual_hours: row.actual_hours,
                    scheduled_cost: Math.round(row.scheduled_cost * 100) / 100,
                    actual_cost: Math.round(row.actual_cost * 100) / 100,
                    retrieved_at: row.retrieved_at
                }))
        });
    }
    return results;
}

async function collectCompanyTimesheets(credentials, dates) {
    if (!Array.isArray(dates) || dates.length < 1 || dates.length > 31 || dates.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
        throw new Error("Homebase timesheet dates are invalid");
    }
    const browser = await launchHomebaseBrowser();
    try {
        const context = await browser.newContext({
            storageState: credentials.storageState,
            locale: "en-US",
            timezoneId: "America/New_York"
        });
        const page = await context.newPage();
        await login(page, credentials);
        try {
            const storageState = await context.storageState();
            await storeHomebaseBrowserSession(credentials.accountId, storageState);
        } catch (error) {
            // Third-party origins embedded by Homebase can abort while
            // Playwright snapshots storage. The authenticated page remains
            // valid, so do not discard an otherwise successful collection.
            console.warn("Homebase browser session refresh was skipped:", error.message);
        }
        const byTarget = new Map(credentials.targets.map(target => [Number(target.account_id), { target, daily: [], roles: [] }]));
        for (const date of dates) {
            for (const result of await collectDay(page, date, credentials.targets)) {
                byTarget.get(result.accountId).daily.push(result.daily);
                byTarget.get(result.accountId).roles.push(...result.roles);
            }
        }
        return [...byTarget.values()].map(({ target, daily, roles }) => ({ target, daily, roles, shifts: [] }));
    } finally {
        await browser.close();
    }
}

module.exports = { accountChoiceKey, captureLoginDiagnostic, collectCompanyTimesheets, normalizeLabel, numberValue, parseCompanyRows, parseDetailedRows, safeLoginMessage };
