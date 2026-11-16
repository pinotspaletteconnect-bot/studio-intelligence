const express = require("express");
const fs = require("fs");
const { requireCollectorAuth } = require("../middleware/collectorAuth");
const { recoveryRange, validateTargets, validatedRecoveryReports } = require("../services/eulerityRecoveryDates");

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
    router.post("/download", async (req, res) => {
        let range;
        try {
            range = recoveryRange(req.body?.fromDate, req.body?.toDate, dependencies.today?.());
        } catch (_error) {
            return res.status(400).json({ success: false, error: "Eulerity recovery requires valid explicit fromDate/toDate covering 1-31 completed days" });
        }
        let folder;
        try {
            const account = await account1();
            validateTargets(account.targets);
            const collected = await browser.collectEulerityAccount(account, account.targets, range);
            folder = collected.folder;
            if (!Array.isArray(collected.results) || collected.results.length !== 4) throw new Error("Eulerity recovery omitted a studio");
            const results = [];
            const seen = new Set();
            const verifiedItems = [];
            for (const item of collected.results) {
                const target = account.targets.find(row => Number(row.studio_id) === Number(item.target?.studio_id));
                if (!target || seen.has(Number(target.studio_id)) || item.target?.selector_key !== target.selector_key) throw new Error("Eulerity recovery returned an unexpected or duplicated studio");
                seen.add(Number(target.studio_id));
                verifiedItems.push({ item, target });
            }
            for (const { item, target } of verifiedItems) {
                const reports = await validatedRecoveryReports(item, target, range, parser);
                results.push({
                    studioId: target.studio_id,
                    studioCode: target.studio_code,
                    studioName: target.studio_name,
                    ...reports
                });
            }
            return res.json({ success: true, schemaVersion: 2, accountId: 1, fromDate: range.fromDate, toDate: range.toDate,
                sourceDatesVerified: true, warehouseReady: false, costAllocationStatus: "unverified", studioCount: results.length, results });
        } catch (_error) {
            return res.status(500).json({ success: false, error: "Eulerity account 1 recovery collection failed" });
        } finally {
            if (folder) removeFolder(folder);
        }
    });
    return router;
}

module.exports = { createEulerityRecoveryRouter };
