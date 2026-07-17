const auth = require("./auth");

/**
 * Downloads Meta Ads insights for a single ad account.
 */
async function getInsights(adAccountId, options = {}) {

    const params = {
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
        level: options.level || "ad"
    };

    if (options.date_preset) {

        params.date_preset = options.date_preset;

    } else if (options.since && options.until) {

        params.time_range = JSON.stringify({
            since: options.since,
            until: options.until
        });

    } else {

        params.date_preset = "yesterday";

    }

    const response = await auth.graphRequest(
        `/${adAccountId}/insights`,
        params
    );

    return response.data || [];

}

/**
 * Downloads insights for every available ad account.
 */
async function download(options = {}) {

    const accounts = await auth.getAdAccounts();

    console.log(`Found ${accounts.length} Meta ad account(s).`);

    const results = [];

    for (const account of accounts) {

        console.log(`Downloading ${account.name} (${account.id})...`);

        try {

            const insights = await getInsights(account.id, options);

            console.log(`✓ ${account.name}: ${insights.length} row(s)`);

            results.push({
                account,
                success: true,
                recordCount: insights.length,
                insights
            });

        } catch (error) {

            console.error(`✗ ${account.name} failed`);

            if (error.response?.data) {
                console.error(error.response.data);
            } else {
                console.error(error.message);
            }

            results.push({
                account,
                success: false,
                error: error.response?.data?.error?.message || error.message
            });

        }

    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
        success: failed === 0,
        integration: "meta_ads",
        graphVersion: "v25.0",
        runDate: new Date().toISOString(),
        accountCount: accounts.length,
        successfulAccounts: successful,
        failedAccounts: failed,
        accounts: results
    };

}

module.exports = {
    getInsights,
    download
};