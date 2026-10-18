'use strict';

// Pure planning only: this module never collects, writes files, or calls APIs.
const MINUTE = 60_000;
const REFRESH_MINUTES = [1440, 360, 300, 240, 180, 120, 75];

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${field}`);
  return value.trim();
}

function instant(value, field) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
    throw new Error(`${field} must be an ISO timestamp with an explicit offset`);
  }
  return Date.parse(value);
}

function localDate(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const part = name => parts.find(p => p.type === name).value;
  return `${part('year')}${part('month')}${part('day')}`;
}

function validateEvent(event) {
  const result = { ...event };
  for (const field of ['organizationId', 'studioId', 'classId', 'timeZone', 'painting', 'roomLabel']) {
    result[field] = text(event[field], field);
  }
  if (typeof event.isPrivate !== 'boolean') throw new Error('Missing isPrivate');
  result.start = instant(event.startAt, 'startAt');
  result.end = instant(event.endAt, 'endAt');
  if (result.end <= result.start) throw new Error('End time must be after start time');
  // Validate the configured timezone even if this record forms no group.
  localDate(result.start, result.timeZone);
  result.key = JSON.stringify([result.organizationId, result.studioId, result.classId]);
  return result;
}

function eventLabel(event) {
  return `${event.painting}${event.isPrivate ? ' PP' : ''} (${event.roomLabel})`;
}

function groupOverlappingEvents(events) {
  const seen = new Set();
  const partitions = new Map();
  for (const input of events) {
    const event = validateEvent(input);
    if (seen.has(event.key)) throw new Error('Duplicate source class identity');
    seen.add(event.key);
    const partition = JSON.stringify([event.organizationId, event.studioId]);
    if (!partitions.has(partition)) partitions.set(partition, []);
    const siblings = partitions.get(partition);
    if (siblings.length && siblings[0].timeZone !== event.timeZone) {
      throw new Error('Conflicting timezones for one studio');
    }
    siblings.push(event);
  }

  const groups = [];
  for (const partition of [...partitions.keys()].sort()) {
    const ordered = partitions.get(partition).sort((a, b) =>
      a.start - b.start || a.key.localeCompare(b.key));
    let group;
    for (const event of ordered) {
      // Touching endpoints do not overlap. A chain of overlaps stays together.
      if (!group || event.start >= group.end) {
        group = {
          organizationId: event.organizationId, studioId: event.studioId,
          timeZone: event.timeZone, start: event.start, end: event.end, events: [],
        };
        groups.push(group);
      }
      group.events.push(event);
      group.end = Math.max(group.end, event.end);
    }
  }
  return groups.map(group => ({
    organizationId: group.organizationId,
    studioId: group.studioId,
    timeZone: group.timeZone,
    startAt: new Date(group.start).toISOString(),
    endAt: new Date(group.end).toISOString(),
    title: `${localDate(group.start, group.timeZone)} ${group.events.map(eventLabel).join(', ')}`,
    // Title and group membership are display/planning data, NOT durable file IDs.
    eventKeys: group.events.map(event => event.key),
    events: group.events.map(({ start, end, key, ...event }) => ({
      ...event, documentType: event.isPrivate ? 'private-party-form' : 'seating-chart',
    })),
  }));
}

function refreshMilestones(startAt) {
  const start = instant(startAt, 'startAt');
  return [
    { kind: 'create', minutesBefore: 7 * 24 * 60 },
    ...REFRESH_MINUTES.map(minutesBefore => ({
      kind: minutesBefore === 75 ? 'final' : 'refresh', minutesBefore,
    })),
  ].map(slot => ({
    ...slot, dueAt: new Date(start - slot.minutesBefore * MINUTE).toISOString(),
  }));
}

module.exports = { groupOverlappingEvents, refreshMilestones };
