const crypto = require("crypto");
const express = require("express");
const { resolveHomebaseAccount } = require("../services/homebaseCredentials");
const { discoverLocation } = require("../services/homebaseApi");

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
        const location = await discoverLocation(account.apiKey);
        res.json({ success: true, target: account.target, location });
    } catch (error) {
        console.error("Homebase discovery failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
