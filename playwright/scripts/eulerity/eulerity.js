require("dotenv").config();

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const DOWNLOAD_FOLDER = path.join(
    __dirname,
    "..",
    "..",
    "downloads"
);

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

async function switchStudio(page, studioName) {

    console.log(`Switching to ${studioName}...`);

    await page.locator(".css-1g6gooi").first().click();

    await page.waitForTimeout(2000);

    const texts = await page.locator("body *:visible").evaluateAll(elements =>
        elements
            .map(e => e.textContent?.trim())
            .filter(t => t && t.length > 0)
    );

    console.log(texts);

    await page.pause();

}

async function downloadMetrics(page, studioCode) {

    console.log("===== ENTERED downloadMetrics() =====");

    console.log("Waiting for page...");
    await page.waitForTimeout(3000);

    console.log("Clicking BY CHANNEL...");
    await page.getByText("BY CHANNEL").click();

    await page.waitForTimeout(1500);

    console.log("Waiting for download...");

    const downloadPromise = page.waitForEvent("download");

    console.log("Clicking Download CSV...");
    await page.getByRole("link", {
        name: "Download CSV"
    }).click();

    const download = await downloadPromise;

    const filename = path.join(
        DOWNLOAD_FOLDER,
        `${studioCode}_metrics.csv`
    );

    console.log(`Saving to ${filename}`);

    await download.saveAs(filename);

    console.log("✅ Metrics downloaded.");

    return filename;

}

async function runEulerity(studioName, studioCode) {

    let browser;

    try {

        console.log("Launching browser...");

        browser = await chromium.launch({
            headless: false,
            slowMo: 250
        });

        const context = await browser.newContext({
            acceptDownloads: true
        });

        const page = await context.newPage();

        console.log("Opening Eulerity...");

        await page.goto("https://eulerity.ai");

        const popupPromise = page.waitForEvent("popup");

        await page.getByRole("link", {
            name: "Sign In"
        }).click();

        const loginPage = await popupPromise;

        await loginPage.waitForLoadState();

        console.log("Logging in...");

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

        console.log("Waiting after login...");
        await loginPage.waitForTimeout(5000);

        console.log("✅ Logged in.");

        console.log("Skipping studio switch...");

        console.log("===== BEFORE downloadMetrics =====");

        const metricsFile = await downloadMetrics(
            loginPage,
            studioCode
        );

        console.log("===== AFTER downloadMetrics =====");

        console.log("");
        console.log("==================================");
        console.log("DOWNLOAD COMPLETE");
        console.log(metricsFile);
        console.log("==================================");

        console.log("Waiting 10 seconds before closing...");
        await loginPage.waitForTimeout(10000);

        await browser.close();

        return metricsFile;

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

module.exports = {
    runEulerity
};

if (require.main === module) {

    const studioName = process.argv[2];
    const studioCode = process.argv[3];

    if (!studioName || !studioCode) {

        console.error("");
        console.error("Usage:");
        console.error('node scripts/eulerity/eulerity.js "Business Name" STUDIOCODE');
        process.exit(1);

    }

    runEulerity(studioName, studioCode)
        .then(file => {
            console.log(`Finished: ${file}`);
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });

}