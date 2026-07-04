const express = require("express");

const router = express.Router();

console.log("✅ Eulerity router loaded");

router.get("/", (req, res) => {
    res.json({
        success: true,
        route: "GET /eulerity"
    });
});

router.post("/download", (req, res) => {
    console.log("✅ POST /eulerity/download hit");

    res.json({
        success: true,
        message: "Eulerity route is working"
    });
});

module.exports = router;