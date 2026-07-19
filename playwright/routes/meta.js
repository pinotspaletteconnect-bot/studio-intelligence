console.log("✅ Loaded Meta Routes");

const express = require("express");
const router = express.Router();

const ads = require("../services/meta/ads");
const pageInsights = require("../services/meta/pageInsights");
const auth = require("../services/meta/auth");
/**
 * Health Check
 */
router.get("/health", async (req, res) => {
    res.json({
        integration: "meta_ads",
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

/**
 * Download Meta Ads Data
 */
router.post("/download", async (req, res) => {

    try {

        console.log("📥 Meta download requested");

        const data = await ads.download(req.body || {});

        res.json({
            success: true,
            ...data
        });

    } catch (error) {

        console.error("❌ Meta download failed");

        if (error.response?.data) {
            console.error(error.response.data);
        } else {
            console.error(error);
        }

        res.status(500).json({
            success: false,
            message: error.response?.data?.error?.message || error.message,
            code: error.response?.data?.error?.code,
            type: error.response?.data?.error?.type,
            fbtrace_id: error.response?.data?.error?.fbtrace_id
        });

    }

});

/**
 * Begin Meta OAuth Login
 */
router.get("/auth", (req, res) => {

    const { appId } = auth.getAppCredentials();

    const redirectUri = "http://localhost:3000/meta/callback";

    const scopes = [
    "ads_read",
    "ads_management",
    "business_management",
    "pages_show_list",
    "pages_read_engagement",
    "read_insights"
].join(",");

    const url =
        `https://www.facebook.com/v25.0/dialog/oauth` +
        `?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}`;

    res.redirect(url);

});

/**
 * Meta OAuth Callback
 */
router.get("/callback", async (req, res) => {

    try {

        const result = await auth.completeOAuth(req.query.code);

        res.json({
            success: true,
            message: "Meta authentication completed successfully.",
            expiresIn: result.expiresIn
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.response?.data?.error?.message || error.message
        });

    }

});
/**
 * Show Meta App Configuration
 */
router.get("/config", (req, res) => {

    const config = auth.getAppCredentials();

    res.json({
        appId: config.appId,
        appSecretLoaded: !!config.appSecret
    });

});

/**
 * List Business Managers
 */
router.get("/businesses", async (req, res) => {

    try {

        const businesses = await auth.getBusinesses();

        res.json({
            success: true,
            businesses
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.response?.data?.error?.message || error.message
        });

    }

});

/**
 * List Ad Accounts
 */
router.get("/accounts", async (req, res) => {

    try {

        const accounts = await auth.getAdAccounts();

        res.json({
            success: true,
            accounts
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.response?.data?.error?.message || error.message
        });

    }

});

/**
 * List Facebook Pages
 */
router.get("/pages", async (req, res) => {

    try {

        const pages = await auth.getPages();

        res.json({
            success: true,
            pages
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.response?.data?.error?.message || error.message
        });

    }

});
/**
 * Meta Page Insights Health
 */
router.get("/page-insights/health", async (req, res) => {

    try {

        const result = await pageInsights.health();

        res.json({
            success: true,
            ...result
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.response?.data?.error?.message || error.message
        });

    }

});

/**
 * Download Meta Page Insights
 */
router.post("/page-insights/download", async (req, res) => {

    try {

        const result = await pageInsights.download();

        res.json({
            success: true,
            ...result
        });

    } catch (error) {

        console.error(error.response?.data || error);

        res.status(500).json({
            success: false,
            message: error.response?.data?.error?.message || error.message
        });

    }

});
module.exports = router;