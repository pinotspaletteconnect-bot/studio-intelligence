const { chromium } = require("playwright");

const PTS_URL = "https://admin.pinotspalette.com";
const TEXTELLENT_URL = "https://client.textellent.com/api/v1/messages.json";

function validateIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error("targetDate must use YYYY-MM-DD");
    return value;
}

function digits(value) {
    return String(value ?? "").replace(/\D/g, "");
}

function e164(value) {
    const normalized = digits(value);
    if (normalized.length === 10) return `+1${normalized}`;
    if (normalized.length >= 8 && normalized.length <= 15) return `+${normalized}`;
    return null;
}

function renderMessage(template, values) {
    return template.replace(/\{(studio|class_name|class_date|class_time|reservations)\}/g, (_, key) => String(values[key] ?? ""));
}

function isLowReservation(reservationCount, minimumReservations) {
    return Number.isInteger(reservationCount) && reservationCount > 0 && reservationCount < minimumReservations;
}

function scheduledAlertAt(classStartsAt, leadHours, earliestSendTime, timeZone) {
    const start = new Date(classStartsAt);
    const lead = new Date(start.getTime() - leadHours * 60 * 60 * 1000);
    const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(start).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    const [hour, minute] = earliestSendTime.split(":").map(Number);
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" });
    const offset = formatter.formatToParts(start).find(part => part.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
    const earliest = new Date(`${dateParts.year}-${dateParts.month}-${dateParts.day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`);
    return lead > earliest ? lead : earliest;
}

async function login(page, credentials) {
    await page.goto(`${PTS_URL}/Account/LogOn`, { waitUntil: "domcontentloaded" });
    await page.locator("#UserName").fill(credentials.username);
    await page.locator("#Password").fill(credentials.password);
    await Promise.all([
        page.waitForURL(url => !url.pathname.includes("/Account/LogOn")),
        page.getByRole("button", { name: "Sign In" }).click()
    ]);
}

async function calendarCandidates(page, studio, targetDate) {
    await page.goto(`${PTS_URL}/Class/CalendarView`, { waitUntil: "domcontentloaded" });
    await page.locator("#LocationSelect").selectOption(String(studio.ptsLocationId));
    await page.locator("#searchBtn").click();
    await page.waitForFunction(() => document.querySelectorAll('a[href^="/Class/Edit/"]').length > 0);
    const events = await page.evaluate(() => {
        const jq = window.jQuery;
        if (!jq?.fn?.fullCalendar) throw new Error("PTS class calendar API is unavailable");
        return jq("#calendar").fullCalendar("clientEvents").map(event => ({
            classId: String(event.url || "").match(/\/Class\/Edit\/(\d+)/)?.[1] || null,
            title: String(event.title || ""),
            startsAt: event.start?.toISOString?.() || null,
            localDate: event.start?.format?.("YYYY-MM-DD") || null
        }));
    });
    return events.filter(event => event.classId && event.startsAt && event.localDate === targetDate);
}

async function readClass(page, classId) {
    await page.goto(`${PTS_URL}/Class/Edit/${classId}`, { waitUntil: "domcontentloaded" });
    return page.evaluate(() => {
        const heading = document.querySelector("main h2")?.textContent?.trim() || "";
        const summaryTable = Array.from(document.querySelectorAll("table")).find(table => {
            const directRows = Array.from(table.querySelectorAll(":scope > tbody > tr"));
            const directHeaders = directRows[0] ? Array.from(directRows[0].querySelectorAll(":scope > td")).map(cell => cell.textContent?.trim()) : [];
            return directHeaders.includes("Maximum") && directHeaders.includes("Reserved") && directHeaders.includes("Ordered");
        });
        const rows = summaryTable ? Array.from(summaryTable.querySelectorAll(":scope > tbody > tr")) : [];
        const headers = rows[0] ? Array.from(rows[0].querySelectorAll(":scope > td")).map(cell => cell.textContent?.trim() || "") : [];
        const values = rows[1] ? Array.from(rows[1].querySelectorAll(":scope > td")).map(cell => cell.textContent?.trim() || "") : [];
        const reservedIndex = headers.findIndex(value => value === "Reserved");
        const classTypeSelect = Array.from(document.querySelectorAll("select")).find(select =>
            Array.from(select.options).some(option => option.textContent?.trim() === "Private Party")
        );
        return {
            heading,
            reservationCount: reservedIndex >= 0 ? Number(values[reservedIndex]) : null,
            classType: classTypeSelect?.selectedOptions[0]?.textContent?.trim() || ""
        };
    });
}

async function uniquePurchaserPhones(page, classId) {
    await page.goto(`${PTS_URL}/Class/SeatingChart/${classId}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("Purchaser Phone"));
    return page.evaluate(() => {
        const table = Array.from(document.querySelectorAll("table")).find(node => /Purchaser Phone/i.test(node.innerText));
        if (!table) throw new Error("PTS Seating Chart contact table was not found");
        const headers = Array.from(table.querySelectorAll("thead th")).map(node => node.textContent?.trim() || "");
        const phoneIndex = headers.findIndex(value => /Purchaser Phone/i.test(value));
        return [...new Set(Array.from(table.querySelectorAll("tbody tr")).map(row => row.querySelectorAll("td")[phoneIndex]?.textContent?.trim()).filter(Boolean))];
    });
}

async function sendTextellent({ authCode, from, to, text }) {
    const response = await fetch(TEXTELLENT_URL, {
        method: "POST",
        headers: { authCode, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ text, from, to, ignoreQuietHours: false }),
        signal: AbortSignal.timeout(15000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.messageId) throw new Error(`Textellent send failed (${response.status})`);
    return String(result.messageId);
}

async function runLowReservationClassAlerts({ targetDate, now = new Date(), execute = false, approvedClassIds = [], credentials, studios }) {
    validateIsoDate(targetDate);
    const approved = new Set(approvedClassIds.map(String));
    if (execute && approved.size === 0) throw new Error("Live execution requires claimed class IDs");
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await (await browser.newContext()).newPage();
        await login(page, credentials);
        const results = [];
        for (const studio of studios) {
            const candidates = await calendarCandidates(page, studio, targetDate);
            for (const candidate of candidates) {
                const countMatch = candidate.title.match(/Res:(\d+)\//i);
                const count = countMatch ? Number(countMatch[1]) : null;
                const excludedTitle = studio.excludedTitlePatterns.some(pattern => candidate.title.toLowerCase().includes(pattern.toLowerCase()));
                if (!isLowReservation(count, studio.minimumReservations) || excludedTitle) continue;
                if (execute && !approved.has(candidate.classId)) continue;
                const dueAt = scheduledAlertAt(candidate.startsAt, studio.leadHours, studio.earliestSendTime, studio.timeZone);
                if (now < dueAt) continue;
                const current = await readClass(page, candidate.classId);
                if (!isLowReservation(current.reservationCount, studio.minimumReservations) || studio.excludedClassTypes.includes(current.classType)) {
                    results.push({ studioId: studio.studioId, classId: candidate.classId, status: "skipped", reservationCount: current.reservationCount, recipientCount: 0, messageIds: [] });
                    continue;
                }
                const phones = [...new Set((await uniquePurchaserPhones(page, candidate.classId)).map(e164).filter(Boolean))];
                const message = renderMessage(studio.messageTemplate, { studio: studio.studioName, class_name: candidate.title.replace(/Res:.*/i, "").trim(), class_date: targetDate, class_time: new Intl.DateTimeFormat("en-US", { timeZone: studio.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(candidate.startsAt)), reservations: current.reservationCount });
                const messageIds = [];
                if (execute) for (const phone of phones) messageIds.push(await sendTextellent({ authCode: studio.authCode, from: studio.senderNumber, to: phone, text: message }));
                results.push({ studioId: studio.studioId, classId: candidate.classId, classStartsAt: candidate.startsAt, scheduledFor: dueAt.toISOString(), status: execute ? "sent" : "preview", reservationCount: current.reservationCount, recipientCount: phones.length, messageIds });
            }
        }
        return results;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { e164, isLowReservation, renderMessage, scheduledAlertAt, runLowReservationClassAlerts };
