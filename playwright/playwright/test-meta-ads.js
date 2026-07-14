const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const ads = require("./services/meta/ads");

async function main() {

    const results = await ads.getInsights("act_261037936");

    console.log(JSON.stringify(results, null, 2));

}

main().catch(console.error);