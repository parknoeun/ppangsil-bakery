/* 빵실빵실 베이커리 — 시간 기반 표시 계산 (DOM 없음, Node 테스트 가능) */
(function (root) {
  'use strict';

  var OPEN = 8 * 60;
  var CLOSE = 21 * 60;
  var LUNCH_START = 11 * 60;
  var LUNCH_END = 13 * 60;
  var JUST_BAKED_MINUTES = 30;

  function toMinutes(hhmm) {
    var parts = String(hhmm).split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function parseSeoulTime(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value || '');
    if (!m) return null;
    var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':00+09:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function seoulClock(date) {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
    return { day: Number(parts.day), minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute) };
  }

  function storeStatus(minutes) {
    if (minutes < OPEN) return 'before-open';
    if (minutes >= CLOSE) return 'closed';
    return 'open';
  }

  function bakeHighlights(minutes, batches) {
    var labels = batches.map(function () { return null; });
    var status = storeStatus(minutes);
    if (batches.length === 0 || status === 'closed') return { labels: labels, allDone: false };

    if (status === 'before-open') {
      var first = 0;
      batches.forEach(function (b, i) { if (b.start < batches[first].start) first = i; });
      labels[first] = 'first';
      return { labels: labels, allDone: false };
    }

    var baking = false;
    var just = -1;
    var next = -1;
    batches.forEach(function (b, i) {
      if (b.start <= minutes && minutes < b.end) {
        labels[i] = 'baking';
        baking = true;
      }
      if (b.end <= minutes && minutes < b.end + JUST_BAKED_MINUTES &&
          (just === -1 || b.end >= batches[just].end)) {
        just = i;
      }
      if (b.start > minutes && (next === -1 || b.start < batches[next].start)) {
        next = i;
      }
    });
    if (just !== -1) labels[just] = 'just';
    if (next !== -1) labels[next] = 'next';
    return { labels: labels, allDone: !baking && just === -1 && next === -1 };
  }

  function todayBenefits(day, minutes) {
    var open = storeStatus(minutes) === 'open';
    var couponDay = day >= 1 && day <= 3;
    return {
      coupon: open && couponDay,
      lunch: open && !couponDay && minutes >= LUNCH_START && minutes < LUNCH_END
    };
  }

  var api = {
    OPEN: OPEN,
    CLOSE: CLOSE,
    toMinutes: toMinutes,
    parseSeoulTime: parseSeoulTime,
    seoulClock: seoulClock,
    storeStatus: storeStatus,
    bakeHighlights: bakeHighlights,
    todayBenefits: todayBenefits
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Schedule = api;
})(this);
