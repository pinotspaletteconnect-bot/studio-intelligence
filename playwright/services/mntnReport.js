const ALLOWED_QUERY_FIELDS = new Set([
    "begin", "end", "format", "sum", "data", "sort", "fullname", "filter"
]);

function normalizeQuery(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("MNTN report query is required");
    }
    const normalized = {};
    for (const [key, value] of Object.entries(input)) {
        if (!ALLOWED_QUERY_FIELDS.has(key)) throw new Error(`Unsupported MNTN query field: ${key}`);
        if (!["string", "number", "boolean"].includes(typeof value)) {
            throw new Error(`Invalid MNTN query value: ${key}`);
        }
        const text = String(value);
        if (!text.length || text.length > 8000) throw new Error(`Invalid MNTN query length: ${key}`);
        normalized[key] = text;
    }
    if (!normalized.begin || !normalized.data) {
        throw new Error("MNTN report query requires begin and data");
    }
    normalized.format = normalized.format || "json";
    return normalized;
}

function buildMntnReportUrl(apiKey, query) {
    const url = new URL("https://api3.mountain.com/apidata");
    for (const [key, value] of Object.entries(normalizeQuery(query))) {
        url.searchParams.set(key, value);
    }
    url.searchParams.set("key", apiKey);
    return url;
}

async function downloadMntnReport({ apiKey, query, fetchImpl = fetch }) {
    const response = await fetchImpl(buildMntnReportUrl(apiKey, query), {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) throw new Error(`MNTN Reporting API failed (${response.status})`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("json")) {
        throw new Error("MNTN Reporting API returned a non-JSON response");
    }
    return response.json();
}

module.exports = { buildMntnReportUrl, downloadMntnReport, normalizeQuery };
