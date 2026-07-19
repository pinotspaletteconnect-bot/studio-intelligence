const auth = require("./auth");
const config = require("./config");

async function download() {

    const pages = await auth.getPages();

    const records = [];

    for (const page of pages) {

       for (const metric of config.PAGE_INSIGHT_METRICS) {

            try {

                const response = await auth.graphRequestWithToken(
                    `/${page.id}/insights`,
                    page.accessToken,
                    {
                        metric
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