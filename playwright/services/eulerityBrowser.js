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

async function locationControl(page) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const comboboxes = page.getByRole("combobox");
        for (let index = 0; index < await comboboxes.count(); index += 1) {
            const candidate = comboboxes.nth(index);
            if (await candidate.isVisible().catch(() => false)) return candidate;
        }
        const reactSelect = page.locator('input[id^="react-select-"][id$="-input"]').first();
        if (await reactSelect.isVisible().catch(() => false)) return reactSelect;
        const legacy = page.locator(".css-8mmkcg").first();
        if (await legacy.isVisible().catch(() => false)) return legacy;
        await page.waitForTimeout(500);
    }
    return null;
}

async function discoverOpenMenuOptions(page) {
    const roleOptions = page.getByRole("option");
    const optionLocator = await roleOptions.count() ? roleOptions : page.locator('[id*="-option-"]');
    const records = [];
    for (let index = 0; index < await optionLocator.count(); index += 1) {
        const option = optionLocator.nth(index);
        if (!await option.isVisible().catch(() => false)) continue;
        const record = await option.evaluate((element) => ({
            displayName: element.textContent || "",
            candidates: [...element.querySelectorAll("*")]
                .filter((child) => child.children.length === 0)
                .map((child) => child.textContent || ""),
            dataValue: element.getAttribute("data-value") || "",
            value: element.getAttribute("value") || "",
            id: element.getAttribute("id") || "",
            href: element.closest("a")?.getAttribute("href") || element.querySelector("a")?.getAttribute("href") || ""
        }));
        const displayName = bestLocationLabel(record);
        if (!displayName) continue;
        records.push({ sourceKey: sourceKeyForOption({ ...record, displayName }), displayName });
    }
    return [...new Map(records.map((record) => [record.sourceKey, record])).values()];
}

async function discoverLocations(page) {
    const control = await locationControl(page);
    if (!control) return [{ sourceKey: "__single__", displayName: "Single location" }];
    const selectedLabel = normalizeLocationLabel(await control.textContent().catch(() => ""));
    await control.click();
    await page.waitForTimeout(250);
    const locations = await discoverOpenMenuOptions(page);
    await page.keyboard.press("Escape").catch(() => {});
    if (locations.length) return locations;
    return [{ sourceKey: "__single__", displayName: selectedLabel || "Single location" }];
}

async function selectLocation(page, target) {
    if (target.selector_key === "__single__") return;
    const control = await locationControl(page);
    if (!control) throw new Error(`Eulerity location selector is unavailable for ${target.selector_label}`);
    await control.click();
    await page.waitForTimeout(200);
    const options = await discoverOpenMenuOptions(page);
    const matched = options.find((option) => option.sourceKey === target.selector_key) ||
        options.find((option) => normalizeLocationLabel(option.displayName) === normalizeLocationLabel(target.selector_label));
    if (!matched) {
        await page.keyboard.press("Escape").catch(() => {});
        throw new Error(`Eulerity location is no longer available: ${target.selector_label}`);
    }
    const exact = page.getByRole("option", { name: matched.displayName, exact: true });
    if (await exact.count()) await exact.first().click({ force: true });
    else {
        const optionContainer = page.locator('[id*="-option-"]').filter({ hasText: matched.displayName }).first();
        if (await optionContainer.count()) await optionContainer.click({ force: true });
        else await page.getByText(matched.displayName, { exact: true }).last().click({ force: true });
    }
    await page.waitForTimeout(1200);
    const selected = normalizeLocationLabel(await control.textContent().catch(() => ""));
    if (selected && !selected.includes(normalizeLocationLabel(matched.displayName))) {
        throw new Error(`Eulerity did not confirm location selection: ${matched.displayName}`);
    }
}

async function prepareChannelReport(page) {
    await page.getByText("Ads Displayed").click();
    await page.waitForTimeout(600);
    await page.getByText("BY CHANNEL").click();
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
    await page.getByText("Advertising Budget").click();
    await page.waitForTimeout(700);
    const spendFile = await downloadCsv(page, folder, `${target.studio_code}_spend.csv`);
    await page.getByText("Budget Distribution").click();
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
    bestLocationLabel
};
