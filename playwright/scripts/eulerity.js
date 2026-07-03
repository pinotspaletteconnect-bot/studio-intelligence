require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const studioName = process.argv[2];
const studioCode = process.argv[3];

if (!studioName || !studioCode) {
    console.error("");
    console.error("Usage:");
    console.error('node scripts/eulerity.js "Business Name" STUDIOCODE');
    process.exit(1);
}

const DOWNLOAD_FOLDER = path.join(__dirname, "..", "downloads");

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

async function switchStudio(page, studioName) {

    console.log(`Switching to ${studioName}...`);

    // Open Business dropdown
    await page.locator('.css-1g6gooi').first().click();

    // Select the business by visible text
    await page.getByText(studioName, { exact: true }).click();

    await page.waitForLoadState('networkidle');

    console.log("✅ Studio switched.");

}

async function downloadMetrics(page, studioCode) {

    console.log("Downloading metrics...");

    await page.getByText('BY CHANNEL').click();

    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('link', {
        name: 'Download CSV'
    }).click();

    const download = await downloadPromise;

    const filename = path.join(
        DOWNLOAD_FOLDER,
        `${studioCode}_metrics.csv`
    );

    await download.saveAs(filename);

    console.log(`✅ Metrics saved to ${filename}`);

    return filename;

}

(async () => {

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

        await loginPage.waitForLoadState('networkidle');

        console.log("✅ Logged in.");

        await switchStudio(loginPage, studioName);

        const metricsFile = await downloadMetrics(
            loginPage,
            studioCode
        );

        console.log("");
        console.log("==================================");
        console.log("DOWNLOAD COMPLETE");
        console.log(metricsFile);
        console.log("==================================");

        await browser.close();

    } catch (err) {

        console.error("");
        console.error("==================================");
        console.error("PLAYWRIGHT ERROR");
        console.error(err);
        console.error("==================================");

        if (browser) {
            await browser.close();
        }

        process.exit(1);

    }

})();