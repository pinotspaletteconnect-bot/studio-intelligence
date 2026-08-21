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
    await Promise.all([
        page.waitForResponse(response => {
            const url = new URL(response.url());
            return url.pathname.replace(/\/$/, "") === "/Class/GetCalendarData" && response.ok();
        }),
        page.locator("#searchBtn").click()
    ]);
    await page.waitForFunction(() => {
        const jq = window.jQuery;
        return Boolean(jq?.fn?.fullCalendar && jq("#calendar").fullCalendar("clientEvents").length);
    });
    const events = await page.evaluate(() => {
        const jq = window.jQuery;
        if (!jq?.fn?.fullCalendar) throw new Error("PTS class calendar API is unavailable");
        return jq("#calendar").fullCalendar("clientEvents").map(event => {
            const container = document.createElement("div");
            container.innerHTML = String(event.eventhtml || "");
            const availability = container.querySelector(".calevent-availability")?.textContent || "";
            const reservationMatch = availability.match(/Res:(\d+)\//i);
            return {
                classId: String(event.url || "").match(/\/Class\/Edit\/(\d+)/)?.[1] || null,
                title: container.querySelector(".calevent-painting-name")?.textContent?.trim() || container.firstElementChild?.getAttribute("title")?.split("\n")[0]?.trim() || "",
                reservationCount: reservationMatch ? Number(reservationMatch[1]) : null,
                startsAt: event.start?.toISOString?.() || null
            };
        });
    });
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: studio.timeZone, year: "numeric", month: "2-digit", day: "2-digit"
    });
    return events.filter(event => event.classId && event.startsAt && dateFormatter.format(new Date(event.startsAt)) === targetDate);
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

function activeReservationContacts(rows) {
    const activeRows = Array.isArray(rows) ? rows : [];
    return {
        reservationCount: activeRows.length,
        phones: [...new Set(activeRows.map(row => row?.purchaserPhone).filter(Boolean))]
    };
}

async function readActiveReservations(page, classId) {
    await page.goto(`${PTS_URL}/Class/SeatingChart/${classId}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Array.from(document.querySelectorAll("table")).some(node => /Purchaser Phone/i.test(node.innerText)));
    await page.locator(".k-loading-mask").waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const rows = await page.evaluate(() => {
        const table = Array.from(document.querySelectorAll("table")).find(node => /Purchaser Phone/i.test(node.innerText));
        if (!table) throw new Error("PTS Seating Chart contact table was not found");
        const headers = Array.from(table.querySelectorAll("thead th")).map(node => node.textContent?.trim() || "");
        const phoneIndex = headers.findIndex(value => /Purchaser Phone/i.test(value));
        const grid = window.jQuery?.(table).closest(".k-grid").data("kendoGrid");
        const models = grid?.dataSource?.view?.();
        if (Array.isArray(models) || models?.length >= 0) {
            return Array.from(models).map(model => ({
                purchaserPhone: String(model.PurchaserPhone ?? "").trim()
            }));
        }
        const columnCount = headers.length;
        return Array.from(table.querySelectorAll("tbody tr"))
            .filter(row => row.querySelectorAll(":scope > td").length === columnCount)
            .map(row => ({ purchaserPhone: row.querySelectorAll(":scope > td")[phoneIndex]?.textContent?.trim() || "" }));
    });
    return activeReservationContacts(rows);
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
            const localTime = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
                timeZone: studio.timeZone,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            }).formatToParts(now).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
            const localMinutes = Number(localTime.hour) * 60 + Number(localTime.minute);
            if (localMinutes < 8 * 60 || localMinutes > 16 * 60) continue;
            const candidates = await calendarCandidates(page, studio, targetDate);
            for (const candidate of candidates) {
                const count = candidate.reservationCount;
                const excludedTitle = studio.excludedTitlePatterns.some(pattern => candidate.title.toLowerCase().includes(pattern.toLowerCase()));
                if (execute && !approved.has(candidate.classId)) continue;
                if (!execute && (count === 0 || excludedTitle)) continue;
                const dueAt = scheduledAlertAt(candidate.startsAt, studio.leadHours, studio.earliestSendTime, studio.timeZone);
                if (now < dueAt) continue;
                if (now >= new Date(candidate.startsAt)) continue;
                const current = await readClass(page, candidate.classId);
                let activeReservations;
                try {
                    activeReservations = await readActiveReservations(page, candidate.classId);
                } catch {
                    results.push({ studioId: studio.studioId, classId: candidate.classId, classStartsAt: candidate.startsAt, scheduledFor: dueAt.toISOString(), status: "failed", reservationCount: current.reservationCount, recipientCount: 0, messageIds: [], errorCode: "PTS_CONTACT_LOOKUP_FAILED" });
                    continue;
                }
                const activeCount = activeReservations.reservationCount;
                if (!isLowReservation(activeCount, studio.minimumReservations) || excludedTitle || studio.excludedClassTypes.includes(current.classType)) {
                    results.push({ studioId: studio.studioId, classId: candidate.classId, status: "skipped", reservationCount: activeCount, recipientCount: 0, messageIds: [] });
                    continue;
                }
                const phones = [...new Set(activeReservations.phones.map(e164).filter(Boolean))];
                const message = renderMessage(studio.messageTemplate, { studio: studio.studioName, class_name: candidate.title.replace(/Res:.*/i, "").trim(), class_date: targetDate, class_time: new Intl.DateTimeFormat("en-US", { timeZone: studio.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(candidate.startsAt)), reservations: activeCount });
                const messageIds = [];
                if (execute && phones.length === 0) {
                    results.push({ studioId: studio.studioId, classId: candidate.classId, classStartsAt: candidate.startsAt, scheduledFor: dueAt.toISOString(), status: "skipped", reservationCount: activeCount, recipientCount: 0, messageIds, errorCode: "NO_VALID_RECIPIENTS" });
                    continue;
                }
                if (execute) {
                    try {
                        for (const phone of phones) messageIds.push(await sendTextellent({ authCode: studio.authCode, from: studio.senderNumber, to: phone, text: message }));
                    } catch {
                        results.push({ studioId: studio.studioId, classId: candidate.classId, classStartsAt: candidate.startsAt, scheduledFor: dueAt.toISOString(), status: "failed", reservationCount: activeCount, recipientCount: phones.length, messageIds, errorCode: "TEXTELLENT_SEND_FAILED" });
                        continue;
                    }
                }
                results.push({ studioId: studio.studioId, classId: candidate.classId, classStartsAt: candidate.startsAt, scheduledFor: dueAt.toISOString(), status: execute ? "sent" : "preview", reservationCount: activeCount, recipientCount: phones.length, messageIds });
            }
        }
        return results;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { activeReservationContacts, e164, isLowReservation, renderMessage, scheduledAlertAt, runLowReservationClassAlerts };
