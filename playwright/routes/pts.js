const express = require("express");
const crypto = require("crypto");

const {
    runPtsProductSalesReport
} = require("../scripts/pts/productSalesReport");
const {
    runPtsClassSalesReport,
    runPtsSalesReport
} = require("../scripts/pts/salesReport");

const router = express.Router();

function requireCollectorAuth(req, res, next) {
    const configuredToken = process.env.COLLECTOR_API_TOKEN;
    const suppliedToken = req.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!configuredToken) {
        return res.status(503).json({
            success: false,
            error: "PTS collector authentication is not configured"
        });
    }

    const suppliedBuffer = Buffer.from(suppliedToken ?? "");
    const configuredBuffer = Buffer.from(configuredToken);
    const authorized =
        suppliedBuffer.length === configuredBuffer.length &&
        crypto.timingSafeEqual(suppliedBuffer, configuredBuffer);

    if (!authorized) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized"
        });
    }

    next();
}

router.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "PTS",
        credentialsConfigured: Boolean(
            process.env.PTS_USERNAME && process.env.PTS_PASSWORD
        )
    });
});

router.post("/sales-report", requireCollectorAuth, async (req, res) => {
    try {
        const results = await runPtsSalesReport({
            reportDate: req.body?.reportDate,
            studioCodes: req.body?.studioCodes
        });

        res.json({
            success: true,
            reportDate: req.body.reportDate,
            studioCount: results.length,
            results
        });
    } catch (error) {
        console.error("PTS Sales Report failed:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/product-sales-report", requireCollectorAuth, async (req, res) => {
    try {
        const results = await runPtsProductSalesReport({
            reportDate: req.body?.reportDate,
            fromDate: req.body?.fromDate,
            toDate: req.body?.toDate,
            studioCodes: req.body?.studioCodes
        });

        res.json({
            success: true,
            fromDate: req.body?.fromDate ?? req.body?.reportDate,
            toDate: req.body?.toDate ?? req.body?.reportDate,
            studioCount: results.length,
            rowCount: results.reduce(
                (total, result) => total + result.rowCount,
                0
            ),
            results
        });
    } catch (error) {
        console.error("PTS Product Sales Report failed:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/class-sales-report", requireCollectorAuth, async (req, res) => {
    try {
        const results = await runPtsClassSalesReport({
            fromDate: req.body?.fromDate,
            toDate: req.body?.toDate,
            studioCodes: req.body?.studioCodes,
            debug: req.body?.debug === true
        });

        res.json({
            success: true,
            fromDate: req.body.fromDate,
            toDate: req.body.toDate,
            studioCount: results.length,
            rowCount: results.reduce(
                (total, result) => total + result.rowCount,
                0
            ),
            results
        });
    } catch (error) {
        console.error("PTS Class Sales Report failed:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
