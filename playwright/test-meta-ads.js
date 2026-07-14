const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const ads = require("./services/meta/ads");

async function main() {

    console.log("====================================");
    console.log("Meta Ads Download Test");
    console.log("====================================\n");

    const data = await ads.download();

    console.log(JSON.stringify(data, null, 2));

}

main().catch(error => {
    console.error(error);
});