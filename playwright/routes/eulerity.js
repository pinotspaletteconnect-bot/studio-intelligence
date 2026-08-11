const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const { runEulerity } = require("../scripts/eulerity/eulerity");
const { resolveEulerityAccount } = require("../services/eulerityCredentials");
const { collectEulerityAccount, discoverEulerityAccount } = require("../services/eulerityBrowser");
const {
    parseMetrics,
    parseSpend,
    parseBudget
} = require("../services/eulerityParser");

const router = express.Router();

function requireCollectorAuth(req, res, next) {
    const configuredToken = process.env.COLLECTOR_API_TOKEN;
    const suppliedToken = req.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!configuredToken) return res.status(503).json({ success: false, error: "Collector authentication is not configured" });
    const supplied = Buffer.from(suppliedToken);
    const configured = Buffer.from(configuredToken);
    if (supplied.length !== configured.length || !crypto.timingSafeEqual(supplied, configured)) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    next();
}

console.log("✅ Eulerity router loaded");

// -----------------------------------------------------
// Health Check
// -----------------------------------------------------

router.get("/", (req, res) => {

    res.json({
        success: true,
        service: "Eulerity",
        status: "online"
    });

});

router.post("/discover", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveEulerityAccount(req.body?.accountId);
        const locations = await discoverEulerityAccount(account);
        res.json({ success: true, accountId: account.accountId, locations });
    } catch (error) {
        console.error("Eulerity discovery failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// -----------------------------------------------------
// Run Eulerity Automation
// -----------------------------------------------------

router.post("/download", async (req, res) => {

    console.log("==================================");
    console.log("Eulerity download requested");
    console.log("==================================");

    try {

        const accountId = req.body?.accountId;
        if (accountId) {
            return requireCollectorAuth(req, res, async () => {
                let folder;
                try {
                    const account = await resolveEulerityAccount(accountId);
                    const collected = await collectEulerityAccount(account, account.targets);
                    folder = collected.folder;
                    const results = [];
                    for (const item of collected.results) {
                        results.push({
                            studioId: item.target.studio_id,
                            studioCode: item.target.studio_code,
                            studioName: item.target.studio_name,
                            metrics: await parseMetrics(item.metricsFile),
                            spend: await parseSpend(item.spendFile),
                            budget: parseBudget(item.budget)
                        });
                    }
                    return res.json({ success: true, accountId: account.accountId, studioCount: results.length, results });
                } catch (error) {
                    console.error("Eulerity account collection failed:", error.message);
                    return res.status(500).json({ success: false, error: error.message });
                } finally {
                    if (folder) fs.rmSync(folder, { recursive: true, force: true });
                }
            });
        }

        const browserResults = await runEulerity();

        const results = [];

        for (const studio of browserResults) {

            console.log(`Parsing ${studio.studioCode}...`);

            const metrics = await parseMetrics(
                studio.metricsFile
            );

            const spend = await parseSpend(
                studio.spendFile
            );

            const budget = parseBudget(
                studio.budget
            );

            results.push({

                studioCode: studio.studioCode,

                studioName: studio.studioName,

                metrics,

                spend,

                budget

            });

        }

        console.log("==================================");
        console.log("Eulerity completed successfully");
        console.log("==================================");

        res.json({

            success: true,

            studioCount: results.length,

            results

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

module.exports = router;
