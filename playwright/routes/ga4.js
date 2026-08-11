const crypto = require("crypto");
const express = require("express");
const { resolveGa4Account } = require("../services/ga4Credentials");
const { discoverGa4Properties, runGa4Report } = require("../services/ga4Api");

const router = express.Router();

function requireCollectorAuth(req, res, next) {
    const configured = process.env.COLLECTOR_API_TOKEN || "";
    const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    const left = Buffer.from(configured); const right = Buffer.from(supplied);
    if (!configured) return res.status(503).json({ success: false, error: "Collector authentication is not configured" });
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return res.status(401).json({ success: false, error: "Unauthorized" });
    next();
}

router.get("/health", (_req, res) => res.json({ success: true, service: "GA4", brokerConfigured: Boolean(process.env.GA4_SECRET_BROKER_URL || process.env.MNTN_SECRET_BROKER_URL || process.env.PTS_SECRET_BROKER_URL) }));

router.post("/discover", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveGa4Account(req.body?.accountId);
        const properties = await discoverGa4Properties(account.credentials);
        res.json({ success: true, accountId: account.accountId, properties });
    } catch (error) {
        console.error("GA4 property discovery failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/report", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveGa4Account(req.body?.accountId);
        const requestedPropertyId = req.body?.propertyId ? String(req.body.propertyId) : null;
        const targets = requestedPropertyId ? account.targets.filter(target => String(target.property_id) === requestedPropertyId) : account.targets;
        if (!targets.length) return res.status(409).json({ success: false, error: "GA4 account has no matching mapped property" });
        const results = [];
        for (const target of targets) {
            results.push({ target, source: await runGa4Report(account.credentials, target.property_id, req.body?.report) });
        }
        res.json({ success: true, accountId: account.accountId, propertyCount: results.length, results });
    } catch (error) {
        console.error("GA4 report failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
