const crypto = require("crypto");
const express = require("express");
const { resolveHomebaseAccount } = require("../services/homebaseCredentials");
const { collectLabor, discoverLocation } = require("../services/homebaseApi");

const router = express.Router();
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
        res.json({ success: true, target: account.target, location });
    } catch (error) {
        console.error("Homebase discovery failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/labor", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveHomebaseAccount(req.body?.accountId);
        if (!account.target.location_uuid) throw new Error("Homebase account location has not been validated");
        const source = await collectLabor(account.apiKey, {
            locationUuid: account.target.location_uuid,
            startDate: req.body?.startDate,
            endDate: req.body?.endDate,
            timeZone: account.target.timezone || "America/New_York"
        });
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

module.exports = router;
