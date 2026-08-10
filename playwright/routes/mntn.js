const crypto = require("crypto");
const express = require("express");

const { resolveMntnAccount } = require("../services/mntnCredentials");
const { downloadMntnReport } = require("../services/mntnReport");

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

router.get("/health", (_req, res) => {
    const brokerUrlConfigured = Boolean(
        process.env.MNTN_SECRET_BROKER_URL || process.env.PTS_SECRET_BROKER_URL
    );
    const brokerTokenConfigured = Boolean(
        process.env.MNTN_SECRET_BROKER_TOKEN || process.env.PTS_SECRET_BROKER_TOKEN
    );
    res.json({
        success: true,
        service: "MNTN",
        brokerConfigured: brokerUrlConfigured && brokerTokenConfigured,
        brokerUrlConfigured,
        brokerTokenConfigured
    });
});

router.post("/report", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveMntnAccount(req.body?.accountId);
        const source = await downloadMntnReport({ apiKey: account.apiKey, query: req.body?.query });
        res.json({
            success: true,
            target: {
                organizationId: account.target.organization_id,
                brandId: account.target.brand_id,
                studioId: account.target.studio_id,
                studioCode: account.target.studio_code,
                studioName: account.target.studio_name,
                advertiserId: account.target.advertiser_id,
                integrationId: account.target.integration_id
            },
            source
        });
    } catch (error) {
        console.error("MNTN report failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
