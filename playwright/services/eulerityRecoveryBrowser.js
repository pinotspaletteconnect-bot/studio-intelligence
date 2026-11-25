const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");
const { recoveryRange, sourceDate, validateTargets } = require("./eulerityRecoveryDates");

function normalizeLocationLabel(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function fallbackSourceKey(label) {
    return `label:${normalizeLocationLabel(label).toLocaleLowerCase("en-US")}`;
}

function sourceKeyForOption(option) {
    return normalizeLocationLabel(option.dataValue || option.value || option.href) ||
        fallbackSourceKey(option.displayName);
}

function bestLocationLabel(record) {
    const candidates = (record.candidates || [])
        .map(normalizeLocationLabel)
        .filter((value) => value.length >= 3 && !value.includes("@") && !value.includes(",") && !/^\d/.test(value));
    return candidates.sort((left, right) => right.length - left.length)[0] || normalizeLocationLabel(record.displayName);
}

async function loginEulerity({ email, password }) {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({ acceptDownloads: true });
        const landing = await context.newPage();
        await landing.goto("https://eulerity.ai", { waitUntil: "networkidle" });
        const popupPromise = landing.waitForEvent("popup");
        await landing.getByRole("link", { name: "Sign In" }).click();
        const page = await popupPromise;
        await page.waitForLoadState();
        await page.getByRole("button", { name: "Sign in with email" }).click();
        await page.getByRole("textbox").fill(email);
        await page.getByRole("button", { name: "Next" }).click();
        await page.locator('input[name="password"]').fill(password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await page.waitForLoadState();
        await page.waitForTimeout(5000);
        return { browser, page };
    } catch (error) {
        await browser.close();
        throw error;
    }
}

// Eulerity's campaign chooser is not a combobox. React Select controls on this
// page operate on ads (including Bulk Delete), so never use global options.
async function locationControl(page) {
    const heading = page.getByText(/^Select a campaign$/i);
    const switchHeading = page.getByText(/^Switch Campaign\s*\(\d+\)$/i);
    await heading.or(switchHeading).first().waitFor({ state: "visible", timeout: 15000 });
    if (await heading.count() + await switchHeading.count() !== 1) throw new Error("Eulerity campaign chooser is ambiguous");
    const modern = await switchHeading.count() === 1;
    // Observed Nov24 structure: Switch Campaign paragraph -> icon row ->
    // aria-disabled campaign control -> root containing its scoped menu.
    const control = modern ? switchHeading.locator("xpath=../..") : heading.locator("xpath=../..").locator('[aria-disabled]');
    const root = modern ? control.locator("xpath=..") : heading.locator("xpath=../..");
    if (await control.count() !== 1 || !await control.isVisible() || await control.getAttribute("aria-disabled") !== "false") {
        throw new Error("Eulerity campaign chooser control is unavailable or ambiguous");
    }
    const advertisedCount = modern ? Number((await switchHeading.innerText()).match(/\((\d+)\)/)[1]) : null;
    if (modern && (!Number.isSafeInteger(advertisedCount) || advertisedCount < 1)) throw new Error("Eulerity campaign chooser count is invalid");
    return { root, control, advertisedCount };
}

function validateLocations(records, expectedCount) {
    if (!Number.isInteger(expectedCount) || expectedCount < 1 || records.length !== expectedCount) {
        throw new Error("Eulerity campaign discovery is empty or incomplete");
    }
    const keys = new Set();
    const labels = new Set();
    for (const record of records) {
        const label = normalizeLocationLabel(record.displayName);
        if (!label || /^(bulk (delete|clone)|select\.\.\.|create new campaign)$/i.test(label) ||
            keys.has(record.sourceKey) || labels.has(label.toLocaleLowerCase("en-US"))) {
            throw new Error("Eulerity campaign discovery contains unrelated or ambiguous locations");
        }
        keys.add(record.sourceKey);
        labels.add(label.toLocaleLowerCase("en-US"));
    }
    return records;
}

async function discoverOpenMenuOptions(root, advertisedCount = null) {
    const search = root.getByPlaceholder("Search campaigns, labels or owners", { exact: true });
    await search.waitFor({ state: "visible", timeout: 5000 });
    if (await search.inputValue()) throw new Error("Eulerity campaign discovery is filtered by search");
    // The current chooser renders each campaign as three direct paragraphs:
    // business name, campaign/address, owner email. Avoid styled class names.
    // Use direct paragraph structure to exclude ancestors, filters and footer.
    const candidates = root.locator('div:has(> div > p[color="accentColor2"])');
    const records = [];
    for (const row of await candidates.all()) {
        if (!await row.isVisible()) continue;
        const record = await row.evaluate((element) => {
            const detail = [...element.children].find((child) =>
                [...child.children].some((p) => p.tagName === "P" && p.textContent.includes("@")));
            if (!detail) return null;
            const paragraphs = [...detail.children].filter((child) => child.tagName === "P");
            if (paragraphs.length !== 3 || !paragraphs[2].textContent.includes("@")) return null;
            const displayName = paragraphs[1].textContent.split("\u00b7")[0].trim();
            return {
                displayName,
                dataValue: element.getAttribute("data-value") || "",
                value: element.getAttribute("value") || "",
                href: element.querySelector("a")?.getAttribute("href") || ""
            };
        });
        if (record) records.push({ ...record, sourceKey: sourceKeyForOption(record), locator: row });
    }
    const countText = await root.getByText(/^\d+ of \d+$/).innerText();
    const counts = countText.match(/^(\d+) of (\d+)$/);
    if (!counts || counts[1] !== counts[2] || advertisedCount !== null && Number(counts[2]) !== advertisedCount) throw new Error("Eulerity campaign discovery is filtered or incomplete");
    return validateLocations(records, Number(counts[2]));
}

async function withLocationMenu(page, action) {
    const { root, control, advertisedCount } = await locationControl(page);
    await control.click();
    try {
        return await action(await discoverOpenMenuOptions(root, advertisedCount), control);
    } finally {
        // The custom chooser does not close on Escape. Collapse only if still open.
        if (await root.getByPlaceholder("Search campaigns, labels or owners", { exact: true }).isVisible()) {
            await control.click();
        }
    }
}

async function discoverLocations(page) {
    return withLocationMenu(page, (locations) => locations.map(({ sourceKey, displayName }) => ({ sourceKey, displayName })));
}

async function selectLocation(page, target) {
    return withLocationMenu(page, async (options, control) => {
        // Old explicitly mapped single-account keys remain usable only after
        // positively discovering exactly one campaign. Absence is never proof.
        if (target.selector_key === "__single__" && options.length !== 1) {
            throw new Error("Eulerity single-location mapping is unavailable or ambiguous");
        }
        const matches = target.selector_key === "__single__" ? options :
            options.filter((option) => option.sourceKey === target.selector_key);
        const matched = matches.length === 1 ? matches[0] : null;
        if (!matched) throw new Error("Eulerity mapped campaign is unavailable or ambiguous");
        const priorLabel = normalizeLocationLabel(await control.locator("p").first().textContent());
        const csv = page.getByRole("link", { name: "Download CSV", exact: true });
        const priorHref = await csv.count() === 1 ? await csv.getAttribute("href") : null;
        await matched.locator.click();
        await page.waitForTimeout(1200);
        const selected = normalizeLocationLabel(await control.locator("p").first().textContent());
        if (selected !== matched.displayName) throw new Error("Eulerity did not confirm campaign selection");
        if (priorLabel !== selected && priorHref) await waitForCondition(page, async () =>
            await csv.count() === 1 && await csv.getAttribute("href") !== priorHref,
            "Eulerity campaign report did not refresh");
        return { sourceKey: matched.sourceKey, displayName: matched.displayName };
    });
}

async function waitForCondition(page, check, message, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await check()) return;
        await page.waitForTimeout(100);
    }
    throw new Error(message);
}

async function dateControls(page) {
    const controls = page.locator(".react-datepicker__input-container button:visible");
    if (await controls.count() !== 2) throw new Error("Eulerity report date controls are unavailable or ambiguous");
    return controls;
}

function calendarParts(date) {
    const value = new Date(`${date}T00:00:00Z`);
    const day = value.getUTCDate();
    const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th");
    const month = value.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
    const weekday = value.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" });
    return { monthLabel: `${month} ${value.getUTCFullYear()}`, monthIndex: value.getUTCFullYear() * 12 + value.getUTCMonth(),
        optionLabel: `Choose ${weekday}, ${month} ${day}${suffix}, ${value.getUTCFullYear()}` };
}

async function chooseCalendarDate(page, index, date) {
    const controls = await dateControls(page);
    await controls.nth(index).click();
    const popup = page.locator(".react-datepicker:visible");
    await popup.first().waitFor({ state: "visible", timeout: 5000 });
    if (await popup.count() !== 1) throw new Error("Eulerity date picker is ambiguous");
    const desired = calendarParts(date);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (let attempt = 0; attempt < 60; attempt++) {
        const header = popup.locator(".react-datepicker__current-month");
        if (await header.count() !== 1) throw new Error("Eulerity calendar month is unavailable");
        const label = normalizeLocationLabel(await header.textContent());
        if (label === desired.monthLabel) break;
        const match = /^(\w+) (\d{4})$/.exec(label);
        const month = match && monthNames.indexOf(match[1]);
        if (!match || month < 0) throw new Error("Eulerity calendar month is invalid");
        const direction = Number(match[2]) * 12 + month > desired.monthIndex ? "Previous Month" : "Next Month";
        const button = popup.getByRole("button", { name: direction, exact: true });
        if (await button.count() !== 1 || !await button.isEnabled()) throw new Error("Eulerity requested calendar month is unavailable");
        await button.click();
        await waitForCondition(page, async () => normalizeLocationLabel(await header.textContent()) !== label, "Eulerity calendar did not navigate");
    }
    if (normalizeLocationLabel(await popup.locator(".react-datepicker__current-month").textContent()) !== desired.monthLabel) {
        throw new Error("Eulerity requested date exceeds bounded calendar navigation");
    }
    const option = popup.getByRole("option", { name: desired.optionLabel, exact: true });
    if (await option.count() !== 1 || !await option.isVisible() || !await option.isEnabled() ||
        await option.getAttribute("aria-disabled") === "true" || (await option.getAttribute("class") || "").includes("--disabled")) {
        throw new Error("Eulerity requested report date is unavailable");
    }
    await option.click();
    await waitForCondition(page, async () => sourceDate(await controls.nth(index).textContent()) === date, "Eulerity did not apply the requested report date");
    if (await popup.count() && await popup.first().isVisible()) await controls.nth(index).click();
}

async function selectReportRange(page, range) {
    const controls = await dateControls(page);
    const previous = await controls.allTextContents();
    const csv = page.getByRole("link", { name: "Download CSV", exact: true });
    if (await csv.count() !== 1) throw new Error("Eulerity report export is unavailable or ambiguous");
    const priorHref = await csv.getAttribute("href");
    // Click both source dates even when the default already matches the request.
    await chooseCalendarDate(page, 0, range.fromDate);
    await chooseCalendarDate(page, 1, range.toDate);
    if (sourceDate(previous[0]) !== range.fromDate || sourceDate(previous[1]) !== range.toDate) {
        await waitForCondition(page, async () => await csv.getAttribute("href") !== priorHref, "Eulerity dated report export did not refresh");
    }
}

async function assertReportContext(page, report, selected, range) {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await page.getByText("Loading Chart", { exact: true }).waitFor({ state: "hidden", timeout: 15000 });
    const heading = report === "metrics" ? page.getByRole("heading", { name: "Ads Displayed", exact: true }) :
        page.getByText("Advertising Budget (USD)", { exact: true });
    if (await heading.count() !== 1 || !await heading.isVisible()) throw new Error("Eulerity downloaded report identity is ambiguous");
    const { control } = await locationControl(page);
    if (normalizeLocationLabel(await control.locator("p").first().textContent()) !== selected.displayName) throw new Error("Eulerity campaign changed before export");
    const controls = await dateControls(page);
    const [fromDate, toDate] = (await controls.allTextContents()).map(sourceDate);
    if (fromDate !== range.fromDate || toDate !== range.toDate) throw new Error("Eulerity displayed report range does not match request");
    const csv = page.getByRole("link", { name: "Download CSV", exact: true });
    if (await csv.count() !== 1 || !await csv.isVisible() || !(await csv.getAttribute("href") || "").startsWith("blob:")) {
        throw new Error("Eulerity dated CSV export is not ready");
    }
    return { fromDate, toDate };
}

async function downloadCsv(page, folder, filename, verify) {
    const evidence = await verify();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download CSV", exact: true }).click();
    const download = await downloadPromise;
    const file = path.join(folder, filename);
    await download.saveAs(file);
    return { file, evidence };
}

async function collectTarget(page, target, folder, range) {
    const selected = await selectLocation(page, target);
    await page.getByText("Ads Displayed", { exact: true }).first().click();
    await page.getByRole("heading", { name: "Ads Displayed", exact: true }).waitFor({ state: "visible" });
    await page.getByText("BY CHANNEL", { exact: true }).click();
    await selectReportRange(page, range);
    const metrics = await downloadCsv(page, folder, `${target.studio_code}_metrics.csv`, () => assertReportContext(page, "metrics", selected, range));
    await page.getByText("Advertising Budget", { exact: true }).click();
    await page.getByText("Advertising Budget (USD)", { exact: true }).waitFor({ state: "visible" });
    await selectReportRange(page, range);
    const spend = await downloadCsv(page, folder, `${target.studio_code}_spend.csv`, () => assertReportContext(page, "spend", selected, range));
    // Do not scrape current Budget Distribution as historical cost evidence.
    return { target, metricsFile: metrics.file, spendFile: spend.file,
        sourceEvidence: { selectorKey: selected.sourceKey, displayName: selected.displayName, metricsRange: metrics.evidence, spendRange: spend.evidence } };
}

async function discoverEulerityAccount(credentials) {
    const { browser, page } = await loginEulerity(credentials);
    try {
        return await discoverLocations(page);
    } finally {
        await browser.close();
    }
}

async function collectEulerityAccount(credentials, targets, requestedRange) {
    const range = recoveryRange(requestedRange?.fromDate, requestedRange?.toDate);
    validateTargets(targets);
    const { browser, page } = await loginEulerity(credentials);
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "eulerity-"));
    try {
        const results = [];
        for (const target of targets) results.push(await collectTarget(page, target, folder, range));
        return { folder, results };
    } catch (error) {
        fs.rmSync(folder, { recursive: true, force: true });
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = {
    collectEulerityAccount,
    discoverEulerityAccount,
    fallbackSourceKey,
    normalizeLocationLabel,
    sourceKeyForOption,
    bestLocationLabel,
    discoverLocations,
    selectLocation,
    validateLocations,
    calendarParts,
    selectReportRange,
    assertReportContext,
    collectTarget
};
