const express = require("express");
const crypto = require("crypto");

const {
    parsePtsProductSalesUpload,
    runPtsProductSalesReport
} = require("../scripts/pts/productSalesReport");
const {
    parsePtsClassSalesUpload,
    runPtsClassSalesReport,
    runPtsSalesReport
} = require("../scripts/pts/salesReport");
const {
    runPtsReservationsReport
} = require("../scripts/pts/reservationsReport");
const { runLowReservationClassAlerts } = require("../scripts/pts/lowReservationClassAlerts");
const { resolveClassAlertContext } = require("../services/classAlertContext");
const { runPtsReportQueued } = require("../services/ptsReportQueue");
const { runPtsThirdPartyClassCreditsReport } = require("../scripts/pts/thirdPartyClassCreditsReport");

const router = express.Router();
const { resolvePtsAccount } = require("../services/ptsCredentials");

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
        const results = await runPtsReportQueued(req.body?.accountId, async () => {
            const account = await resolvePtsAccount(req.body?.accountId);
            return runPtsSalesReport({
                reportDate: req.body?.reportDate,
                studioCodes: req.body?.studioCodes,
                credentials: account.credentials,
                studioTargets: account.studios
            });
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
        const results = await runPtsReportQueued(req.body?.accountId, async () => {
            const account = await resolvePtsAccount(req.body?.accountId);
            return runPtsProductSalesReport({
                reportDate: req.body?.reportDate,
                fromDate: req.body?.fromDate,
                toDate: req.body?.toDate,
                studioCodes: req.body?.studioCodes,
                credentials: account.credentials,
                studioTargets: account.studios
            });
        });

        res.json({
            success: true,
            // Preserve the original single-day response contract used by the
            // production 06 workflow while also exposing range boundaries.
            reportDate:
                req.body?.reportDate ??
                req.body?.fromDate ??
                req.body?.toDate,
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
        const requestedStudioCodes = Array.isArray(req.body?.studioCodes)
            ? req.body.studioCodes
                  .map(code => String(code).trim().toUpperCase())
                  .filter(Boolean)
                  .sort()
            : [];
        const queueScope =
            requestedStudioCodes.length === 1
                ? `${req.body?.accountId ?? "legacy-default"}:${requestedStudioCodes[0]}`
                : req.body?.accountId;

        const results = await runPtsReportQueued(queueScope, async () => {
            const account = await resolvePtsAccount(req.body?.accountId);
            return runPtsClassSalesReport({
                fromDate: req.body?.fromDate,
                toDate: req.body?.toDate,
                studioCodes: requestedStudioCodes,
                debug: req.body?.debug === true,
                credentials: account.credentials,
                studioTargets: account.studios
            });
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

router.post(
    "/product-sales-upload",
    requireCollectorAuth,
    express.raw({
        type: [
            "application/octet-stream",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ],
        limit: "25mb"
    }),
    async (req, res) => {
        try {
            const result = await parsePtsProductSalesUpload({
                file: req.body,
                studioCode: req.get("x-pts-studio-code")
            });

            res.json({
                success: true,
                studioCount: 1,
                rowCount: result.rowCount,
                results: [result]
            });
        } catch (error) {
            console.error("PTS Product Sales upload failed:", error.message);
            res.status(400).json({ success: false, error: error.message });
        }
    }
);

router.post(
    "/class-sales-upload",
    requireCollectorAuth,
    express.raw({
        type: [
            "application/octet-stream",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ],
        limit: "25mb"
    }),
    async (req, res) => {
        try {
            const result = await parsePtsClassSalesUpload({
                file: req.body,
                studioCode: req.get("x-pts-studio-code")
            });

            res.json({
                success: true,
                studioCount: 1,
                rowCount: result.rowCount,
                results: [result]
            });
        } catch (error) {
            console.error("PTS Class Sales upload failed:", error.message);
            res.status(400).json({ success: false, error: error.message });
        }
    }
);

router.post("/reservations-report", requireCollectorAuth, async (req, res) => {
    try {
        const results = await runPtsReportQueued(req.body?.accountId, async () => {
            const account = await resolvePtsAccount(req.body?.accountId);
            return runPtsReservationsReport({
                orderDate: req.body?.orderDate,
                classFromDate: req.body?.classFromDate,
                classToDate: req.body?.classToDate,
                studioCodes: req.body?.studioCodes,
                credentials: account.credentials,
                studioTargets: account.studios
            });
        });

        res.json({
            success: true,
            orderDate: req.body.orderDate,
            studioCount: results.length,
            rowCount: results.reduce((total, result) => total + result.rowCount, 0),
            results
        });
    } catch (error) {
        console.error("PTS Reservations Report failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/third-party-class-credits-report", requireCollectorAuth, async (req, res) => {
    try {
        const results = await runPtsReportQueued(req.body?.accountId, async () => {
            const account = await resolvePtsAccount(req.body?.accountId);
            return runPtsThirdPartyClassCreditsReport({
                fromDate: req.body?.fromDate,
                toDate: req.body?.toDate,
                credentials: account.credentials,
                studioTargets: account.studios
            });
        });
        res.json({
            success: true,
            organizationId: req.body?.organizationId,
            fromDate: req.body?.fromDate,
            toDate: req.body?.toDate,
            studioCount: results.length,
            rowCount: results.reduce((total, result) => total + result.rowCount, 0),
            results
        });
    } catch (error) {
        console.error("PTS Third Party Class Credits failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post("/low-reservation-class-alerts", requireCollectorAuth, async (req, res) => {
    try {
        const results = await runPtsReportQueued(req.body?.ptsAccountId, async () => {
            const context = await resolveClassAlertContext(req.body?.ptsAccountId);
            return runLowReservationClassAlerts({
                targetDate: req.body?.targetDate,
                execute: req.body?.execute === true,
                approvedClassIds: Array.isArray(req.body?.approvedClassIds) ? req.body.approvedClassIds : [],
                credentials: context.credentials,
                studios: context.studios
            });
        });
        res.set("Cache-Control", "no-store, private");
        res.json({
            success: true,
            mode: req.body?.execute === true ? "execute" : "preview",
            ptsAccountId: Number(req.body?.ptsAccountId),
            targetDate: req.body?.targetDate,
            resultCount: results.length,
            results
        });
    } catch (error) {
        console.error("PTS low-reservation class alerts failed:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
