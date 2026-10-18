'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { groupOverlappingEvents: group, refreshMilestones } = require('./planner.cjs');

function event(classId, start, end, overrides = {}) {
  return {
    organizationId: 'test-owner', studioId: 'test-studio', classId,
    timeZone: 'America/New_York', painting: 'Example Painting', roomLabel: 'Main',
    isPrivate: false, startAt: `2026-10-24T${start}:00-04:00`,
    endAt: `2026-10-24T${end}:00-04:00`, ...overrides,
  };
}

test('6 PM class and 6:30 party share a file and follow the supplied name format', () => {
  const groups = group([
    event('public', '18:00', '20:00', { painting: 'Boo-tiful Blooms' }),
    event('party', '18:30', '20:30', {
      painting: 'City of Stars and Light', isPrivate: true, roomLabel: 'KLR',
    }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].events.length, 2);
  assert.deepEqual(groups[0].events.map(e => e.documentType), ['seating-chart', 'private-party-form']);
  assert.equal(groups[0].title,
    '20261024 Boo-tiful Blooms (Main), City of Stars and Light PP (KLR)');
});

test('a class in KLR gets a seating chart based on event type, not room name', () => {
  const groups = group([event('klr-class', '18:00', '20:00', { roomLabel: 'KLR' })]);
  assert.equal(groups[0].events[0].documentType, 'seating-chart');
});

test('a chain of overlapping events stays in one file', () => {
  const groups = group([
    event('c', '20:15', '22:00'), event('a', '18:00', '20:00'),
    event('b', '19:30', '20:30'),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].events.map(e => e.classId), ['a', 'b', 'c']);
});

test('back-to-back events and separate sessions have separate files', () => {
  assert.equal(group([
    event('a', '13:00', '15:00'), event('b', '15:00', '17:00'),
    event('c', '18:00', '20:00'),
  ]).length, 3);
});

test('a long event keeps overlapping shorter events together', () => {
  assert.equal(group([
    event('a', '13:00', '20:00'), event('b', '14:00', '15:00'),
    event('c', '18:00', '19:00'),
  ]).length, 1);
});

test('overlapping times never combine different studios or owners', () => {
  assert.equal(group([
    event('a', '18:00', '20:00'),
    event('a', '18:00', '20:00', { studioId: 'other-studio' }),
    event('a', '18:00', '20:00', { organizationId: 'other-owner' }),
  ]).length, 3);
});

test('renaming or rescheduling preserves the source identity', () => {
  const original = group([event('a', '18:00', '20:00')])[0];
  const changed = group([event('a', '19:00', '21:00', { painting: 'New title' })])[0];
  assert.deepEqual(changed.eventKeys, original.eventKeys);
  assert.notEqual(changed.title, original.title);
});

test('missing duration or offset and duplicate source IDs stop planning', () => {
  assert.throws(() => group([event('a', '18:00', '20:00', { endAt: null })]), /endAt/);
  assert.throws(() => group([event('a', '18:00', '18:00')]), /after/);
  assert.throws(() => group([event('a', '18:00', '20:00', {
    startAt: '2026-10-24T18:00:00',
  })]), /offset/);
  assert.throws(() => group([event('a', '18:00', '20:00'), event('a', '19:00', '21:00')]), /Duplicate/);
});

test('conflicting studio timezones stop planning', () => {
  assert.throws(() => group([
    event('a', '18:00', '20:00'),
    event('b', '18:30', '20:30', { timeZone: 'America/Phoenix' }),
  ]), /Conflicting timezones/);
});

test('Arizona uses its own local date when UTC has crossed midnight', () => {
  const groups = group([event('a', '18:00', '20:00', {
    timeZone: 'America/Phoenix', startAt: '2026-10-25T01:00:00Z',
    endAt: '2026-10-25T03:00:00Z',
  })]);
  assert.match(groups[0].title, /^20261024 /);
});

test('an overnight overlap is grouped under its earliest local event date', () => {
  const groups = group([
    event('a', '23:00', '23:30', { endAt: '2026-10-25T01:00:00-04:00' }),
    event('b', '23:30', '23:45', {
      startAt: '2026-10-25T00:30:00-04:00', endAt: '2026-10-25T02:00:00-04:00',
    }),
  ]);
  assert.equal(groups.length, 1);
  assert.match(groups[0].title, /^20261024 /);
});

test('each class has its own final refresh, exactly 75 minutes before start', () => {
  const publicSlots = refreshMilestones('2026-10-24T18:00:00-04:00');
  const partySlots = refreshMilestones('2026-10-24T18:30:00-04:00');
  assert.deepEqual(publicSlots.map(s => s.minutesBefore), [10080, 1440, 360, 300, 240, 180, 120, 75]);
  assert.equal(publicSlots.at(-1).dueAt, '2026-10-24T20:45:00.000Z');
  assert.equal(partySlots.at(-1).dueAt, '2026-10-24T21:15:00.000Z');
  assert.equal(publicSlots.some(s => s.minutesBefore < 75), false);
});

test('refresh offsets remain exact across daylight-saving transitions', () => {
  const start = '2026-11-01T18:00:00-05:00';
  const slots = refreshMilestones(start);
  assert.equal(Date.parse(start) - Date.parse(slots[1].dueAt), 24 * 60 * 60_000);
  assert.equal(Date.parse(start) - Date.parse(slots.at(-1).dueAt), 75 * 60_000);
});
