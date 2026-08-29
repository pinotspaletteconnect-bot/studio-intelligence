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
        const spendRows = [];

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

            for (const row of spend) {
                spendRows.push({
                    studioCode: studio.studioCode,
                    studioName: studio.studioName,
                    ...row
                });
            }

        }

        console.log("==================================");
        console.log("Eulerity completed successfully");
        console.log("==================================");

        res.json({

            success: true,

            contractVersion: 2,

            studioCount: results.length,

            results,

            // Flattened, warehouse-shaped rows for the n8n spend UPSERT branch.
            // The nested results contract is retained for backward compatibility.
            spendRowCount: spendRows.length,

            spendRows

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
