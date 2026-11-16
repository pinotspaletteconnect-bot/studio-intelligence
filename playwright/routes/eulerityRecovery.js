const express = require("express");
const fs = require("fs");
const { requireCollectorAuth } = require("../middleware/collectorAuth");

// Deliberately separate from the existing Eulerity endpoints. This temporary
// recovery boundary authorizes account 1 only; it does not define studio maps.
function createEulerityRecoveryRouter(dependencies = {}) {
    const resolveAccount = dependencies.resolveAccount || require("../services/eulerityCredentials").resolveEulerityAccount;
    const browser = dependencies.browser || require("../services/eulerityRecoveryBrowser");
    const parser = dependencies.parser || require("../services/eulerityParser");
    const removeFolder = dependencies.removeFolder || ((folder) => fs.rmSync(folder, { recursive: true, force: true }));
    const router = express.Router();
    router.use(requireCollectorAuth);
    router.use((req, res, next) => {
        if (req.body?.accountId !== 1 && req.body?.accountId !== "1") {
            return res.status(403).json({ success: false, error: "Eulerity recovery is restricted to account 1" });
        }
        next();
    });
    async function account1() {
        const account = await resolveAccount(1);
        if (account.accountId !== 1 || Number(account.account?.account_id) !== 1 || Number(account.account?.organization_id) !== 1) {
            throw new Error("Eulerity recovery credential account mismatch");
        }
        return account;
    }
    router.post("/discover", async (_req, res) => {
        try {
            const account = await account1();
            const locations = await browser.discoverEulerityAccount(account);
            return res.json({ success: true, accountId: 1, locations });
        } catch (_error) {
            return res.status(500).json({ success: false, error: "Eulerity account 1 recovery discovery failed" });
        }
    });
    router.post("/download", async (_req, res) => {
        let folder;
        try {
            const account = await account1();
            if (!Array.isArray(account.targets) || !account.targets.length || account.targets.some(target => Number(target.account_id) !== 1 || Number(target.organization_id) !== 1)) {
                throw new Error("Eulerity recovery targets are missing or cross-account");
            }
            const collected = await browser.collectEulerityAccount(account, account.targets);
            folder = collected.folder;
            const results = [];
            for (const item of collected.results) {
                results.push({
                    studioId: item.target.studio_id,
                    studioCode: item.target.studio_code,
                    studioName: item.target.studio_name,
                    metrics: await parser.parseMetrics(item.metricsFile),
                    spend: await parser.parseSpend(item.spendFile),
                    budget: parser.parseBudget(item.budget)
                });
            }
            return res.json({ success: true, accountId: 1, studioCount: results.length, results });
        } catch (_error) {
            return res.status(500).json({ success: false, error: "Eulerity account 1 recovery collection failed" });
        } finally {
            if (folder) removeFolder(folder);
        }
    });
    return router;
}

module.exports = { createEulerityRecoveryRouter };
