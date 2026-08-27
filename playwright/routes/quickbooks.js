const crypto = require("crypto");
const express = require("express");
const { resolveQuickBooksAccount } = require("../services/quickbooksCredentials");
const { TRANSACTION_ENTITIES, companyInfo, latestSourceUpdate, queryAll } = require("../services/quickbooksApi");

const router = express.Router();

function requireCollectorAuth(req, res, next) {
    const configured = process.env.COLLECTOR_API_TOKEN || "";
    const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    const left = Buffer.from(configured); const right = Buffer.from(supplied);
    if (!configured) return res.status(503).json({ success: false, error: "Collector authentication is not configured" });
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    next();
}

function envelope(account, entityType, records) {
    return {
        success: true,
        connectionId: account.accountId,
        realmId: account.realmId,
        entityType,
        retrievedAt: new Date().toISOString(),
        sourceMaxUpdatedAt: latestSourceUpdate(records),
        nextCursor: null,
        records,
        warnings: []
    };
}

function failure(res, operation, error) {
    console.error(`QuickBooks ${operation} failed:`, error.message);
    const status = /invalid|unsupported/i.test(error.message) ? 400 : 500;
    return res.status(status).json({ success: false, error: `QuickBooks ${operation} failed` });
}

router.get("/health", (_req, res) => res.json({
    success: true,
    service: "QuickBooks Online read-only collector",
    environment: process.env.QUICKBOOKS_ENVIRONMENT || "sandbox",
    brokerConfigured: Boolean(process.env.QUICKBOOKS_SECRET_BROKER_URL),
    writesEnabled: false
}));

router.post("/company-info", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveQuickBooksAccount(req.body?.accountId);
        const record = await companyInfo(account);
        if (!record) throw new Error("QuickBooks company response is invalid");
        res.json(envelope(account, "company_info", [record]));
    } catch (error) { failure(res, "company discovery", error); }
});

router.post("/accounts", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveQuickBooksAccount(req.body?.accountId);
        res.json(envelope(account, "accounts", await queryAll(account, "Account", req.body)));
    } catch (error) { failure(res, "account collection", error); }
});

router.post("/vendors", requireCollectorAuth, async (req, res) => {
    try {
        const account = await resolveQuickBooksAccount(req.body?.accountId);
        res.json(envelope(account, "vendors", await queryAll(account, "Vendor", req.body)));
    } catch (error) { failure(res, "vendor collection", error); }
});

router.post("/transactions", requireCollectorAuth, async (req, res) => {
    try {
        const requested = typeof req.body?.entityType === "string" ? req.body.entityType : "";
        if (!TRANSACTION_ENTITIES.includes(requested)) throw new Error("QuickBooks transaction entity is unsupported");
        const account = await resolveQuickBooksAccount(req.body?.accountId);
        res.json(envelope(account, requested, await queryAll(account, requested, req.body)));
    } catch (error) { failure(res, "transaction collection", error); }
});

module.exports = router;

