const crypto = require("crypto");
const express = require("express");
const { resolveHomebaseAccount, resolveHomebaseBrowserAccount } = require("../services/homebaseCredentials");
const { collectLabor, discoverLocation } = require("../services/homebaseApi");
const { captureLoginDiagnostic, collectCompanyTimesheets } = require("../services/homebaseBrowser");

const router = express.Router();
const browserCollections = new Map();

function datesInRange(startDate, endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Homebase labor dates are invalid");
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (start > end || (end - start) / 86400000 > 30) throw new Error("Homebase labor date range is invalid");
    const dates = [];
    for (let current = start; current <= end; current = new Date(current.getTime() + 86400000)) dates.push(current.toISOString().slice(0, 10));
    return dates;
}

async function collectBrowserLabor(accountId, startDate, endDate) {
    const account = await resolveHomebaseBrowserAccount(accountId);
    const dates = datesInRange(startDate, endDate);
    const organizationId = Number(account.targets[0]?.organization_id);
    const key = `${organizationId}:${startDate}:${endDate}`;
    if (!browserCollections.has(key)) {
        const promise = collectCompanyTimesheets(account, dates).finally(() => {
            setTimeout(() => browserCollections.delete(key), 10 * 60 * 1000).unref();
        });
        browserCollections.set(key, promise);
    }
    const results = await browserCollections.get(key);
    const selected = results.find(result => Number(result.target.account_id) === Number(accountId));
    if (!selected) throw new Error("Homebase browser collection did not return the requested studio");
    return { account, selected };
}
function requireCollectorAuth(req, res, next) {
    const configured = process.env.COLLECTOR_API_TOKEN ?? "";
    const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const a = Buffer.from(configured); const b = Buffer.from(supplied);
    if (!configured || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ success: false, error: "Unauthorized" });
    next();
}

router.get("/health", (_req, res) => res.json({ success: true, service: "Homebase", readOnly: true }));
router.post("/discover", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveHomebaseAccount(req.body?.accountId);
        const location = await discoverLocation(account.apiKey, account.target.location_uuid);
        res.json({
            success: true,
            target: { ...account.target, account_id: Number(req.body.accountId) },
            location
        });
    } catch (error) {
        console.error("Homebase discovery failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/labor", requireCollectorAuth, async (req, res) => {
    try {
        let account;
        let source;
        try {
            const browserResult = await collectBrowserLabor(req.body?.accountId, req.body?.startDate, req.body?.endDate);
            account = { target: browserResult.selected.target };
            source = { daily: browserResult.selected.daily, shifts: browserResult.selected.shifts };
        } catch (browserError) {
            if (!/web login is not configured/i.test(browserError.message)) throw browserError;
            account = await resolveHomebaseAccount(req.body?.accountId);
            if (!account.target.location_uuid) throw new Error("Homebase account location has not been validated");
            source = await collectLabor(account.apiKey, {
                locationUuid: account.target.location_uuid,
                startDate: req.body?.startDate,
                endDate: req.body?.endDate,
                timeZone: account.target.timezone || "America/New_York"
            });
        }
        res.json({
            success: true,
            target: account.target,
            period: { startDate: req.body.startDate, endDate: req.body.endDate },
            source
        });
    } catch (error) {
        console.error("Homebase labor collection failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/timesheets", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveHomebaseBrowserAccount(req.body?.accountId);
        const dates = req.body?.dates;
        const results = await collectCompanyTimesheets(account, dates);
        res.json({ success: true, accountId: account.accountId, dates, results });
    } catch (error) {
        console.error("Homebase timesheet collection failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/debug-login", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveHomebaseBrowserAccount(req.body?.accountId);
        const diagnostic = await captureLoginDiagnostic(account);
        if (!diagnostic?.image) throw new Error("Homebase diagnostic image was not captured");
        res.set({
            "Cache-Control": "no-store, private",
            "Content-Type": "image/png",
            "X-Homebase-Path": diagnostic.pathname || "unknown",
            "X-Homebase-Status": diagnostic.status || "unknown",
            "X-Homebase-Message": encodeURIComponent(diagnostic.message || "")
        });
        res.send(diagnostic.image);
    } catch (error) {
        console.error("Homebase login diagnostic failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
module.exports.datesInRange = datesInRange;
