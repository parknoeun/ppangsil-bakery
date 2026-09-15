const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/schedule.js');

// 8:00~9:00, 9:30, 9:40, 10:30, 11:00
const BATCHES = [
  { start: 480, end: 540 },
  { start: 570, end: 570 },
  { start: 580, end: 580 },
  { start: 630, end: 630 },
  { start: 660, end: 660 },
];

test('영업 시간 상수', () => {
  assert.equal(S.OPEN, 480);
  assert.equal(S.CLOSE, 1260);
});

test('toMinutes', () => {
  assert.equal(S.toMinutes('09:30'), 570);
  assert.equal(S.toMinutes('8:00'), 480);
});

test('parseSeoulTime + seoulClock', () => {
  const d = S.parseSeoulTime('2026-09-01T11:30');
  assert.deepEqual(S.seoulClock(d), { date: '2026-09-01', day: 1, minutes: 690 });
  assert.equal(S.parseSeoulTime('2026-09-01 11:30'), null);
  assert.equal(S.parseSeoulTime(''), null);
  assert.equal(S.parseSeoulTime(null), null);
});

test('seoulClock은 UTC 날짜를 한국 시간으로 바꾼다', () => {
  assert.deepEqual(S.seoulClock(new Date('2026-09-01T15:30:00Z')), { date: '2026-09-02', day: 2, minutes: 30 });
  assert.deepEqual(S.seoulClock(new Date('2026-12-31T15:05:00Z')), { date: '2027-01-01', day: 1, minutes: 5 });
});

test('휴무일에는 영업 상태가 holiday', () => {
  assert.equal(S.storeStatus(720, true), 'holiday');
  assert.equal(S.storeStatus(450, true), 'holiday');
  assert.equal(S.storeStatus(720, false), 'open');
});

test('휴무일에는 빵 시간·혜택 배지가 없다', () => {
  assert.deepEqual(S.bakeHighlights(575, BATCHES, true), { labels: [null, null, null, null, null], allDone: false });
  assert.deepEqual(S.todayBenefits(2, 720, true), { coupon: false, lunch: false });
  assert.deepEqual(S.todayBenefits(15, 720, true), { coupon: false, lunch: false });
});

test('isShownUntil: 그 날짜까지 보이고 다음 날부터 숨김', () => {
  assert.equal(S.isShownUntil('2026-09-15', '2026-09-25'), true);
  assert.equal(S.isShownUntil('2026-09-25', '2026-09-25'), true);
  assert.equal(S.isShownUntil('2026-09-26', '2026-09-25'), false);
  assert.equal(S.isShownUntil('2026-09-26', ''), true);
});

test('storeStatus 경계값', () => {
  assert.equal(S.storeStatus(479), 'before-open');
  assert.equal(S.storeStatus(480), 'open');
  assert.equal(S.storeStatus(1259), 'open');
  assert.equal(S.storeStatus(1260), 'closed');
});

test('bakeHighlights 시나리오', () => {
  const at = (m) => S.bakeHighlights(m, BATCHES);
  assert.deepEqual(at(450), { labels: ['first', null, null, null, null], allDone: false });
  assert.deepEqual(at(480), { labels: ['baking', 'next', null, null, null], allDone: false });
  assert.deepEqual(at(500), { labels: ['baking', 'next', null, null, null], allDone: false });
  assert.deepEqual(at(550), { labels: ['just', 'next', null, null, null], allDone: false });
  assert.deepEqual(at(575), { labels: [null, 'just', 'next', null, null], allDone: false });
  assert.deepEqual(at(585), { labels: [null, null, 'just', 'next', null], allDone: false });
  assert.deepEqual(at(670), { labels: [null, null, null, null, 'just'], allDone: false });
  assert.deepEqual(at(690), { labels: [null, null, null, null, null], allDone: true });
  assert.deepEqual(at(720), { labels: [null, null, null, null, null], allDone: true });
  assert.deepEqual(at(1320), { labels: [null, null, null, null, null], allDone: false });
});

test('bakeHighlights: 빈 목록', () => {
  assert.deepEqual(S.bakeHighlights(600, []), { labels: [], allDone: false });
});

test('todayBenefits', () => {
  assert.deepEqual(S.todayBenefits(1, 720), { coupon: true, lunch: false });
  assert.deepEqual(S.todayBenefits(3, 900), { coupon: true, lunch: false });
  assert.deepEqual(S.todayBenefits(15, 660), { coupon: false, lunch: true });
  assert.deepEqual(S.todayBenefits(15, 779), { coupon: false, lunch: true });
  assert.deepEqual(S.todayBenefits(15, 780), { coupon: false, lunch: false });
  assert.deepEqual(S.todayBenefits(2, 450), { coupon: false, lunch: false });
  assert.deepEqual(S.todayBenefits(15, 1300), { coupon: false, lunch: false });
});
