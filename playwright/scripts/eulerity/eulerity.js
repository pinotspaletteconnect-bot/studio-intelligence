require("dotenv").config();

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

// =====================================================
// Configuration
// =====================================================

const DOWNLOAD_FOLDER = path.join(
    __dirname,
    "..",
    "..",
    "downloads"
);

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

const STUDIOS = [
    {
        code: "STM",
        name: "Pinot's Palette - Louisville"
    },
    {
        code: "GIL",
        name: "Pinot's - Gilbert Primary"
    },
    {
        code: "JEF",
        name: "Pinot's Palette Jeffersonville"
    },
    {
        code: "SN",
        name: "Pinot's Palette Short North - Primary Campaign"
    }
];

// =====================================================
// Browser Login
// =====================================================

async function login() {

     console.log("Launching browser...");

    const browser = await chromium.launch({
        headless: true
    });

    console.log("✅ Browser launched");

    const context = await browser.newContext({
        acceptDownloads: true
    });

    console.log("✅ Browser context created");

    const page = await context.newPage();

    console.log("✅ New page created");

    console.log("Opening Eulerity...");

    await page.goto("https://eulerity.ai", {
    waitUntil: "networkidle"
});

    console.log("✅ Eulerity loaded");

    console.log("Waiting for popup...");

const popupPromise = page.waitForEvent("popup");

console.log("Clicking Sign In...");

await page.getByRole("link", {
    name: "Sign In"
}).click();

console.log("Waiting for popup to appear...");

const loginPage = await popupPromise;

console.log("✅ Popup opened");

await loginPage.waitForLoadState();

console.log("✅ Popup finished loading");

    console.log("✅ Login page loaded");

    console.log("Logging in...");

    console.log("Email configured:", !!process.env.EULERITY_EMAIL);
console.log("Password configured:", !!process.env.EULERITY_PASSWORD);

    await loginPage
        .getByRole("button", {
            name: "Sign in with email"
        })
        .click();

    await loginPage
        .getByRole("textbox")
        .fill(process.env.EULERITY_EMAIL);

    await loginPage
        .getByRole("button", {
            name: "Next"
        })
        .click();

    await loginPage
        .locator('input[name="password"]')
        .fill(process.env.EULERITY_PASSWORD);

    await loginPage
        .getByRole("button", {
            name: "Sign In"
        })
        .click();

    console.log("Waiting for dashboard...");

    await loginPage.waitForLoadState();

    await loginPage.waitForTimeout(5000);

    console.log("✅ Logged into Eulerity");

    return {
        browser,
        page: loginPage
    };

}
// =====================================================
// Studio Switching
// =====================================================

async function switchStudio(page, studio) {

    console.log(`\nSwitching to ${studio.code}...`);

    await page.locator(".css-8mmkcg").first().click();

    switch (studio.code) {
    case "GIL":
        await page.getByText("Pinot's - Gilbert Primary").click();
        break;
    case "JEF":
        await page.getByText("Pinot's Palette Jeffersonville").nth(1).click();
        break;
    case "SN":
        await page.getByText("Pinot's Palette Short North - Primary Campaign").click();
        break;
    case "STM":
        await page.getByText("Pinot's Palette - Louisville").click();
        break;
}

    await page.waitForTimeout(3000);

    // Return to the report landing page
    await page.getByText("Ads Displayed").click();

    await page.waitForTimeout(1000);

    await page.getByText("BY CHANNEL").click();

    await page.waitForTimeout(2000);

    console.log(`✅ ${studio.code} selected`);

}
// =====================================================
// Metrics Download
// =====================================================

async function downloadMetrics(page, studio) {

    console.log(`Downloading Metrics for ${studio.code}...`);

    await page.getByText("BY CHANNEL").click();

    await page.waitForTimeout(1500);

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("link", {
        name: "Download CSV"
    }).click();

    const download = await downloadPromise;

    const filename = path.join(
        DOWNLOAD_FOLDER,
        `${studio.code}_metrics.csv`
    );

    await download.saveAs(filename);

    console.log(`✅ ${studio.code} metrics downloaded`);

    return filename;

}

// =====================================================
// Spend Download
// =====================================================

async function downloadSpend(page, studio) {

    console.log(`Downloading Spend for ${studio.code}...`);

    await page.getByText("Advertising Budget").click();

    await page.waitForTimeout(1500);

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("link", {
        name: "Download CSV"
    }).click();

    const download = await downloadPromise;

    const filename = path.join(
        DOWNLOAD_FOLDER,
        `${studio.code}_spend.csv`
    );

    await download.saveAs(filename);

    console.log(`✅ ${studio.code} spend downloaded`);

    return filename;

}

// =====================================================
// Budget Distribution
// =====================================================

async function getBudgetDistribution(page, studio) {

    console.log(`Reading budget distribution for ${studio.code}...`);

    await page.getByText("Budget Distribution").click();

    await page.waitForTimeout(1500);

    const text = await page.locator("body").innerText();

    function extract(label) {

        const regex = new RegExp("(\\d+)\\%\\s+" + label, "i");

        const match = text.match(regex);

        return match ? Number(match[1]) : 0;

    }

    const budget = {

        search: extract("Search"),
        social: extract("Social"),
        video: extract("Video"),
        display: extract("Displays"),
        other: 0

    };

    console.log(budget);

    return budget;

}
// =====================================================
// Main
// =====================================================

async function runEulerity() {

    let browser;

    try {

        const session = await login();

        browser = session.browser;

        const page = session.page;

        const results = [];

        let firstStudio = true;

for (const studio of STUDIOS) {

    console.log("");
    console.log("==================================");
    console.log(`Processing ${studio.code}`);
    console.log("==================================");

    if (!firstStudio) {
        await switchStudio(page, studio);
    }

    firstStudio = false;

    const metricsFile = await downloadMetrics(page, studio);

    const spendFile = await downloadSpend(page, studio);

    const budget = await getBudgetDistribution(page, studio);

    results.push({
        studioCode: studio.code,
        studioName: studio.name,
        metricsFile,
        spendFile,
        budget
    });

}

        console.log("");
        console.log("==================================");
        console.log("Eulerity Complete");
        console.log("==================================");

        console.log(results);

        await browser.close();

        return results;

    } catch (err) {

        console.error("");
        console.error("==================================");
        console.error("PLAYWRIGHT ERROR");
        console.error(err);
        console.error("==================================");

        if (browser) {
            await browser.close();
        }

        throw err;

    }

}

// =====================================================
// Exports
// =====================================================

module.exports = {
    runEulerity
};

// =====================================================
// Standalone Test Runner
// =====================================================

if (require.main === module) {

    runEulerity()
        .then(results => {

            console.log("");
            console.log("Returned Results");
            console.log("================");

            console.dir(results, { depth: null });

        })
        .catch(err => {

            console.error(err);

            process.exit(1);

        });

}