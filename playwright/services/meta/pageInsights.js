const auth = require("./auth");
const config = require("./config");

function insightDateRange(options) {
    if (options.since === undefined && options.until === undefined) return {};
    const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
        new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
    if (!validDate(options.since) || !validDate(options.until)) {
        throw new Error("Page Insights requires both since and until as valid YYYY-MM-DD dates");
    }
    const days = (Date.parse(options.until) - Date.parse(options.since)) / 86400000;
    if (days < 0 || days > 90) throw new Error("Page Insights date range must be ordered and at most 90 days");
    return { since: options.since, until: options.until };
}

async function download(options = {}) {

    const dateRange = insightDateRange(options);

    const pages = await auth.getPages(options.accessToken);

    const records = [];

    for (const page of pages) {

       for (const metric of config.PAGE_INSIGHT_METRICS) {

            try {

                const response = await auth.graphRequestWithToken(
                    `/${page.id}/insights`,
                    page.accessToken,
                    {
                        metric,
                        ...dateRange
                    }
                );

                for (const insight of response.data || []) {

                    for (const value of insight.values || []) {

                        records.push({
                            page_id: page.id,
                            page_name: page.name,
                            metric: insight.name,
                            period: insight.period,
                            insight_date: value.end_time,
                            value: value.value,
                            title: insight.title,
                            description: insight.description,
                            raw_data: insight
                        });

                    }

                }

            }
            catch (err) {

                console.error(`Failed ${page.name} (${metric})`);

                records.push({
                    page_id: page.id,
                    page_name: page.name,
                    metric,
                    error: err.message
                });

            }

        }

    }

    return {

        success: true,

        integration: "meta_page_insights",

        pageCount: pages.length,

        metricCount: config.PAGE_INSIGHT_METRICS.length,

        recordCount: records.length,

        records

    };

}

module.exports = {
    download
};
