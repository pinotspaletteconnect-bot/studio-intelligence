const express = require("express");

const { runEulerity } = require("../scripts/eulerity/eulerity");
const {
    parseMetrics,
    parseSpend,
    parseBudget
} = require("../services/eulerityParser");

const router = express.Router();

console.log("✅ Eulerity router loaded");

// -----------------------------------------------------
// Health Check
// -----------------------------------------------------

router.get("/", (req, res) => {

    res.json({
        success: true,
        service: "Eulerity",
        status: "online"
    });

});

// -----------------------------------------------------
// Run Eulerity Automation
// -----------------------------------------------------

router.post("/download", async (req, res) => {

    console.log("==================================");
    console.log("Eulerity download requested");
    console.log("==================================");

    try {

        const browserResults = await runEulerity();

        const results = [];

        for (const studio of browserResults) {

            console.log(`Parsing ${studio.studioCode}...`);

            const metrics = await parseMetrics(
                studio.metricsFile
            );

            const spend = await parseSpend(
                studio.spendFile
            );

            const budget = parseBudget(
                studio.budget
            );

            results.push({

                studioCode: studio.studioCode,

                studioName: studio.studioName,

                metrics,

                spend,

                budget

            });

        }

        console.log("==================================");
        console.log("Eulerity completed successfully");
        console.log("==================================");

        res.json({

            success: true,

            studioCount: results.length,

            results

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

module.exports = router;