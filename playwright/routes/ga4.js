const crypto = require("crypto");
const express = require("express");
const { resolveGa4Account } = require("../services/ga4Credentials");
const { discoverGa4Properties, runGa4Report } = require("../services/ga4Api");
const { accessToken } = require("../services/ga4Api");
const { buildFunnelRequest, runPartyFunnel, buildReachRequest } = require("../services/ga4/party-funnel");

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

router.post("/report/:accountId/:propertyId", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveGa4Account(req.params.accountId);
        const propertyId = String(req.params.propertyId);
        const target = account.targets.find(candidate => String(candidate.property_id) === propertyId);
        if (!target) return res.status(409).json({ success: false, error: "GA4 property is not mapped to this account" });
        const source = await runGa4Report(account.credentials, propertyId, req.body);
        res.json(source);
    } catch (error) {
        console.error("GA4 compatible report failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Source-only, bounded report collection. Existing broker and mapped-property
// authorization are retained; no credentials or upstream error bodies returned.
router.post('/party-funnel/:accountId/:propertyId', requireCollectorAuth, async (req, res) => {
    try {
        const { startDate, endDate, pathPrefix } = req.body || {};
        try { buildFunnelRequest({ startDate, endDate, pathPrefix }); }
        catch { return res.status(400).json({ error: 'Invalid party report configuration or period' }); }
        if ((Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 366) return res.status(400).json({ error: 'Period exceeds 367 days' });
        const account = await resolveGa4Account(req.params.accountId);
        const propertyId = String(req.params.propertyId);
        const target = account.targets.find(candidate => String(candidate.property_id) === propertyId);
        if (!target) return res.status(409).json({ error: 'GA4 property is not mapped to this account' });
        const token = await accessToken(account.credentials);
        const source = {};
        for (const variant of ['core', 'addons', 'inquiry']) source[variant] = await runPartyFunnel({ propertyId, accessToken: token, startDate, endDate, pathPrefix, variant });
        const reach = {};
        for (const name of ['total', 'device', 'sourceMedium']) {
            reach[name] = await runGa4Report(account.credentials, propertyId, buildReachRequest({ startDate, endDate, pathPrefix, breakdown: name }));
        }
        res.set('Cache-Control', 'private, no-store').json({ success: true, definitionVersion: 2, geography: 'US', target, period: { startDate, endDate }, pathPrefix, source, reach, retrievedAt: new Date().toISOString() });
    } catch (error) {
        const permission = error.message === 'GA4 funnel permission denied';
        res.status(permission ? 403 : 502).json({ success: false, error: permission ? 'GA4 funnel permission denied' : 'GA4 party report is unavailable' });
    }
});

module.exports = router;
