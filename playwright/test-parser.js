const { parseMetrics } = require("./services/eulerityParser");

async function main() {
    try {

        const rows = await parseMetrics("./downloads/STM_metrics.csv");

        console.log(`Rows parsed: ${rows.length}`);
        console.log(rows[0]);

    } catch (err) {
        console.error(err);
    }
}

main();