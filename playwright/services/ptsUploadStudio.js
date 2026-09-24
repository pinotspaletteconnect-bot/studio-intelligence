// Uploads need source metadata, not a PTS login. Resolve it through the existing
// authenticated broker; never infer a tenant from the collector's pilot list.
async function resolvePtsUploadStudio(studioCode) {
    const scopedCode = String(studioCode ?? "").trim();
    if (!scopedCode) throw new Error("PTS upload requires a studio selection");
    const match = scopedCode.match(/^([1-9]\d*):([1-9]\d*):(.+)$/);
    const sourceCode = match ? match[3] : scopedCode;
    const organizationId = match ? Number(match[1]) : undefined;
    const studioId = match ? Number(match[2]) : undefined;
    if (match && (![organizationId, studioId].every(Number.isSafeInteger) || !sourceCode.trim())) {
        throw new Error("PTS upload studio selection is invalid");
    }
    const url = process.env.PTS_SECRET_BROKER_URL;
    const token = process.env.PTS_SECRET_BROKER_TOKEN;
    if (!url || !token) throw new Error("PTS upload studio broker is not configured");
    const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ purpose: "backfill", studioCode: sourceCode, ...(match ? { organizationId, studioId } : {}) }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`PTS upload studio resolution failed (${response.status})`);
    const { studio } = await response.json();
    if (!studio || ![studio.organizationId, studio.brandId, studio.studioId].every(
        id => Number.isSafeInteger(id) && id > 0
    ) || String(studio.locationId) !== sourceCode ||
        (match && (studio.organizationId !== organizationId || studio.studioId !== studioId)) ||
        ![studio.code, studio.locationName, studio.timeZone].every(value => typeof value === "string" && value.trim())) {
        throw new Error("PTS upload studio broker returned an invalid target");
    }
    try { new Intl.DateTimeFormat("en-US", { timeZone: studio.timeZone }); }
    catch { throw new Error("PTS upload studio timezone is invalid"); }
    return studio;
}

module.exports = { resolvePtsUploadStudio };
