const BASE_URL = "https://api.joinhomebase.com";

async function homebaseRequest(apiKey, path, params = {}) {
    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    const response = await fetch(url, {
        headers: { authorization: `Bearer ${apiKey}`, accept: "application/vnd.homebase-v1+json" },
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Homebase API request failed (${response.status})`);
    return response.json();
}

async function discoverLocation(apiKey) {
    const payload = await homebaseRequest(apiKey, "/locations");
    const locations = Array.isArray(payload) ? payload : payload?.data ?? payload?.locations ?? [];
    if (locations.length !== 1) throw new Error(`Homebase location key returned ${locations.length} locations; expected exactly one`);
    const location = locations[0];
    if (!location?.uuid || !location?.name) throw new Error("Homebase location response is incomplete");
    return { uuid: String(location.uuid), name: String(location.name), timeZone: location.time_zone ?? null };
}

module.exports = { discoverLocation, homebaseRequest };
