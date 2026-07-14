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

        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

module.exports = router;