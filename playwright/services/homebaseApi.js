const BASE_URL = "https://api.joinhomebase.com";

function normalizeApiKey(value) {
    return String(value ?? "")
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/^Bearer\s+/i, "")
        .trim();
}

async function homebaseRequest(apiKey, path, params = {}) {
    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    const response = await fetch(url, {
        headers: { authorization: `Bearer ${normalizeApiKey(apiKey)}`, accept: "application/vnd.homebase-v1+json" },
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
        const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 300);
        throw new Error(`Homebase API request failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    return response.json();
}

async function discoverLocation(apiKey, locationUuid) {
    const payload = await homebaseRequest(apiKey, "/locations");
    const locations = Array.isArray(payload) ? payload : payload?.data ?? payload?.locations ?? [];
    const location = locationUuid
        ? locations.find(candidate => String(candidate?.uuid) === String(locationUuid))
        : locations.length === 1 ? locations[0] : null;
    if (!location) throw new Error(`Homebase location UUID was not available to this account (${locations.length} locations returned)`);
    if (!location?.uuid || !location?.name) throw new Error("Homebase location response is incomplete");
    return { uuid: String(location.uuid), name: String(location.name), timeZone: location.time_zone ?? null };
}

function payloadRows(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.[key])) return payload[key];
    return [];
}

async function paginatedRequest(apiKey, path, params, key) {
    const rows = [];
    for (let page = 1; page <= 100; page += 1) {
        const payload = await homebaseRequest(apiKey, path, { ...params, page, per_page: 100 });
        const batch = payloadRows(payload, key);
        rows.push(...batch);
        if (batch.length < 100) return rows;
    }
    throw new Error("Homebase pagination exceeded the supported limit");
}

function numberValue(value) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
}

function laborCost(labor) {
    return numberValue(labor?.costs ?? labor?.cost ?? labor?.wages);
}

function dateInZone(value, timeZone) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function normalizeLabor({ shifts, timecards, timeZone, retrievedAt = new Date().toISOString() }) {
    const timecardByShift = new Map(timecards.filter(row => row.shift_id != null).map(row => [String(row.shift_id), row]));
    const shiftRows = shifts.filter(shift => shift.id != null).map(shift => {
        const timecard = shift.timecard ?? timecardByShift.get(String(shift.id)) ?? null;
        const scheduledHours = numberValue(shift.labor?.scheduled_hours ?? ((new Date(shift.end_at) - new Date(shift.start_at)) / 3600000));
        const actualHours = numberValue(timecard?.labor?.paid_hours ?? timecard?.labor?.actual_hours);
        return {
            source_shift_id: Number(shift.id),
            source_timecard_id: timecard?.id == null ? null : Number(timecard.id),
            role: shift.role ?? timecard?.role ?? null,
            department: shift.department ?? timecard?.department ?? null,
            scheduled_start: shift.start_at ?? null,
            scheduled_end: shift.end_at ?? null,
            clock_in: timecard?.clock_in ?? null,
            clock_out: timecard?.clock_out ?? null,
            labor_date: dateInZone(timecard?.clock_in ?? shift.start_at, timeZone),
            scheduled_hours: Math.max(scheduledHours, 0),
            actual_hours: Math.max(actualHours, 0),
            scheduled_cost: Math.max(laborCost(shift.labor), 0),
            actual_cost: Math.max(laborCost(timecard?.labor), 0),
            regular_hours: Math.max(numberValue(timecard?.labor?.regular_hours), 0),
            overtime_hours: Math.max(numberValue(timecard?.labor?.weekly_overtime ?? timecard?.labor?.daily_overtime), 0),
            double_overtime_hours: Math.max(numberValue(timecard?.labor?.double_overtime), 0),
            retrieved_at: retrievedAt
        };
    });

    const daily = new Map();
    for (const row of shiftRows) {
        if (!row.labor_date) continue;
        const total = daily.get(row.labor_date) ?? { labor_date: row.labor_date, scheduled_hours: 0, actual_hours: 0, scheduled_cost: 0, actual_cost: 0, regular_hours: 0, overtime_hours: 0, double_overtime_hours: 0, retrieved_at: retrievedAt };
        for (const field of ["scheduled_hours", "actual_hours", "scheduled_cost", "actual_cost", "regular_hours", "overtime_hours", "double_overtime_hours"]) total[field] += row[field];
        daily.set(row.labor_date, total);
    }
    return { shifts: shiftRows, daily: [...daily.values()].sort((a, b) => a.labor_date.localeCompare(b.labor_date)) };
}

async function collectLabor(apiKey, { locationUuid, startDate, endDate, timeZone }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Homebase labor dates are invalid");
    const params = { start_date: `${startDate}T00:00:00Z`, end_date: `${endDate}T23:59:59Z` };
    const [shifts, timecards] = await Promise.all([
        paginatedRequest(apiKey, `/locations/${encodeURIComponent(locationUuid)}/shifts`, { ...params, date_filter: "start_at", with_note: false }, "shifts"),
        paginatedRequest(apiKey, `/locations/${encodeURIComponent(locationUuid)}/timecards`, { ...params, date_filter: "clock_in" }, "timecards")
    ]);
    return normalizeLabor({ shifts, timecards, timeZone });
}

module.exports = { collectLabor, discoverLocation, homebaseRequest, normalizeApiKey, normalizeLabor, payloadRows };
