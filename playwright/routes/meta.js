console.log("✅ Loaded Meta Routes");

const express = require("express");
const router = express.Router();

const ads = require("../services/meta/ads");

/**
 * Health Check
 */
router.get("/health", async (req, res) => {

    res.json({
        integration: "meta_ads",
        status: "ok"
    });

});

/**
 * Download Meta Ads Data
 */
router.post("/download", async (req, res) => {

    try {

        const data = await ads.download();

        res.json(data);

    } catch (error) {

    console.error(error.response?.data || error);

    res.status(500).json({
        success: false,
        message: error.response?.data?.error?.message || error.message,
        code: error.response?.data?.error?.code,
        type: error.response?.data?.error?.type,
        fbtrace_id: error.response?.data?.error?.fbtrace_id
    });

}

});

module.exports = router;