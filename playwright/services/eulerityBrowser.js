const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

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
    await heading.first().waitFor({ state: "visible", timeout: 15000 });
    if (await heading.count() !== 1) throw new Error("Eulerity campaign chooser is ambiguous");
    const root = heading.locator("xpath=../..");
    const control = root.locator('[aria-disabled]');
    if (await control.count() !== 1 || !await control.isVisible()) {
        throw new Error("Eulerity campaign chooser control is unavailable or ambiguous");
    }
    return { root, control };
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

async function discoverOpenMenuOptions(root) {
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
    if (!counts || counts[1] !== counts[2]) throw new Error("Eulerity campaign discovery is filtered or incomplete");
    return validateLocations(records, Number(counts[2]));
}

async function withLocationMenu(page, action) {
    const { root, control } = await locationControl(page);
    await control.click();
    try {
        return await action(await discoverOpenMenuOptions(root), control);
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
    await withLocationMenu(page, async (options, control) => {
        // Old explicitly mapped single-account keys remain usable only after
        // positively discovering exactly one campaign. Absence is never proof.
        const matches = target.selector_key === "__single__" && options.length === 1 ? options :
            options.filter((option) => option.sourceKey === target.selector_key);
        const labelMatches = options.filter((option) => normalizeLocationLabel(option.displayName) === normalizeLocationLabel(target.selector_label));
        const matched = matches.length === 1 ? matches[0] : labelMatches.length === 1 ? labelMatches[0] : null;
        if (!matched) throw new Error("Eulerity mapped campaign is unavailable or ambiguous");
        await matched.locator.click();
        await page.waitForTimeout(1200);
        const selected = normalizeLocationLabel(await control.textContent());
        if (!selected.includes(matched.displayName)) throw new Error("Eulerity did not confirm campaign selection");
    });
}

async function prepareChannelReport(page) {
    await page.getByText("Ads Displayed", { exact: true }).last().click();
    await page.waitForTimeout(600);
    await page.getByText("BY CHANNEL", { exact: true }).last().click();
    await page.waitForTimeout(900);
}

async function downloadCsv(page, folder, filename) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download CSV" }).click();
    const download = await downloadPromise;
    const file = path.join(folder, filename);
    await download.saveAs(file);
    return file;
}

async function collectTarget(page, target, folder) {
    await selectLocation(page, target);
    await prepareChannelReport(page);
    const metricsFile = await downloadCsv(page, folder, `${target.studio_code}_metrics.csv`);
    await page.getByText("Advertising Budget", { exact: true }).last().click();
    await page.waitForTimeout(700);
    const spendFile = await downloadCsv(page, folder, `${target.studio_code}_spend.csv`);
    await page.getByText("Budget Distribution", { exact: true }).last().click();
    await page.waitForTimeout(700);
    const text = await page.locator("body").innerText();
    const extract = (label) => Number(text.match(new RegExp(`(\\d+)\\%\\s+${label}`, "i"))?.[1] ?? 0);
    return {
        target,
        metricsFile,
        spendFile,
        budget: { search: extract("Search"), social: extract("Social"), video: extract("Video"), display: extract("Displays"), other: 0 }
    };
}

async function discoverEulerityAccount(credentials) {
    const { browser, page } = await loginEulerity(credentials);
    try {
        return await discoverLocations(page);
    } finally {
        await browser.close();
    }
}

async function collectEulerityAccount(credentials, targets) {
    if (!targets.length) throw new Error("Eulerity account has no mapped studio targets");
    const { browser, page } = await loginEulerity(credentials);
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "eulerity-"));
    try {
        const results = [];
        for (const target of targets) results.push(await collectTarget(page, target, folder));
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
    validateLocations
};
