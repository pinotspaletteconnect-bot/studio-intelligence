const auth = require("./auth");

/**
 * Downloads Meta Ads insights for a single ad account.
 */
async function getInsights(adAccountId) {

    const response = await auth.graphRequest(
        `/${adAccountId}/insights`,
        {
            fields: [
                "campaign_name",
                "campaign_id",
                "adset_name",
                "adset_id",
                "ad_name",
                "ad_id",
                "impressions",
                "reach",
                "clicks",
                "spend",
                "ctr",
                "cpc",
                "cpm",
                "date_start",
                "date_stop"
            ].join(","),
            level: "ad",
            date_preset: "yesterday"
        }
    );

    return response.data;

}

/**
 * Downloads insights for every available ad account.
 */
async function download() {

    const accounts = await auth.getAdAccounts();

    const results = [];

    for (const account of accounts) {

        console.log(`Downloading ${account.name}...`);

        const insights = await getInsights(account.id);

        results.push({
            account,
            insights
        });

    }

    return {
        integration: "meta_ads",
        runDate: new Date().toISOString(),
        accountCount: results.length,
        accounts: results
    };

}

module.exports = {
    getInsights,
    download
};