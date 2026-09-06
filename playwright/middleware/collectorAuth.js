const crypto = require("crypto");

function requireCollectorAuth(req, res, next) {
    const configuredToken = process.env.COLLECTOR_API_TOKEN;
    if (!configuredToken) {
        return res.status(503).json({ success: false, error: "Collector authentication is not configured" });
    }
    const match = /^Bearer\s+([^\s]+)$/i.exec(req.get("authorization") || "");
    const supplied = Buffer.from(match?.[1] || "");
    const expected = Buffer.from(configuredToken);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    res.set("Cache-Control", "no-store");
    next();
}

module.exports = { requireCollectorAuth };
