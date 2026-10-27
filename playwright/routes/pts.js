const express = require("express");
const { requireCollectorAuth } = require("../middleware/collectorAuth");

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
const { collectPrivatePartyStudio } = require("../scripts/pts/privateParties.cjs");

router.post("/private-party-leads", requireCollectorAuth, async (req, res) => {
    const accountId = Number(req.body?.accountId);
    const studioId = Number(req.body?.studioId);
    const knownLeads = req.body?.knownLeads ?? [];
    if (!Number.isSafeInteger(accountId) || accountId <= 0 ||
        !Number.isSafeInteger(studioId) || studioId <= 0 || !Array.isArray(knownLeads) || knownLeads.length > 30000 ||
        knownLeads.some(row => !Number.isSafeInteger(Number(row.source_lead_id)) || Number(row.source_lead_id) <= 0 ||
            row.received_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(row.received_date))) {
        return res.status(400).json({ success: false, error: "Invalid private-party collection request" });
    }
    try {
        const result = await runPtsReportQueued(accountId, async () => {
            const account = await resolvePtsAccount(accountId);
            const studio = account.studios.find(target => Number(target.studioId) === studioId);
            if (!studio) throw Error("Private-party studio is not mapped to account");
            return collectPrivatePartyStudio({ credentials: account.credentials,
                target: { studio_id: studioId, account_id: accountId, pts_location_id: studio.locationId },
                knownLeads: knownLeads.map(row => ({ source_lead_id: Number(row.source_lead_id),
                    received_date: row.received_date, received_date_basis: row.received_date_basis })),
            });
        });
        return res.json({ body: { mode: "daily_refresh", studioId, accountId, sourceCount: result.sourceCount,
            historyFrom: result.historyFrom, rows: result.rows } });
    } catch {
        console.error("PTS private-party collection failed", { accountId, studioId });
        return res.status(502).json({ success: false, error: "Private-party collection failed; no complete snapshot returned" });
    }
});


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
                orderFromDate: req.body?.orderFromDate,
                orderToDate: req.body?.orderToDate,
                classFromDate: req.body?.classFromDate,
                classToDate: req.body?.classToDate,
                includeOrderAttributes: req.body?.includeOrderAttributes === true,
                studioCodes: req.body?.studioCodes,
                credentials: account.credentials,
                studioTargets: account.studios
            });
        });

        res.json({
            success: true,
            organizationId: req.body?.organizationId,
            orderDate: req.body.orderDate,
            orderFromDate: req.body?.orderFromDate,
            orderToDate: req.body?.orderToDate,
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
