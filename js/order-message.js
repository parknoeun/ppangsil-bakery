/* 빵실빵실 베이커리 — 단체주문 DM 문구 만들기 (DOM 없음, Node 테스트 가능) */
(function (root) {
  'use strict';

  var TYPE_LABEL = { tuile: '튀일 선물세트', bread: '빵 단체주문', etc: '기타 문의' };
  var WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

  // "2026-09-20", "14:00" -> "9월 20일(일) 오후 2시". 둘 다 비면 ""
  function formatPickup(date, time) {
    var parts = [];
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
    if (d) {
      var weekday = WEEKDAY[new Date(Date.UTC(+d[1], +d[2] - 1, +d[3])).getUTCDay()];
      parts.push(Number(d[2]) + '월 ' + Number(d[3]) + '일(' + weekday + ')');
    }
    var t = /^(\d{2}):(\d{2})/.exec(time || '');
    if (t) {
      var h = Number(t[1]);
      var m = Number(t[2]);
      var hour12 = h % 12 === 0 ? 12 : h % 12;
      parts.push((h < 12 ? '오전 ' : '오후 ') + hour12 + '시' + (m ? ' ' + m + '분' : ''));
    }
    return parts.join(' ');
  }

  // [{name:'아몬드', count:2}, ...] -> "■ 맛 구성 (세트당 5개): 아몬드 2개, 코코넛 3개". 고른 게 없으면 ""
  function flavorLine(flavors, packSize) {
    var picked = (flavors || []).filter(function (f) { return f && f.count > 0; });
    if (picked.length === 0) return '';
    var total = picked.reduce(function (sum, f) { return sum + f.count; }, 0);
    var line = '■ 맛 구성' + (packSize ? ' (세트당 ' + packSize + '개)' : '') + ': ' +
      picked.map(function (f) { return f.name + ' ' + f.count + '개'; }).join(', ');
    if (packSize && total < packSize) line += ' · 나머지 ' + (packSize - total) + '개는 DM으로 상의할게요';
    return line;
  }

  // fields: { type, pack, packSize, quantity, flavors[{name,count}], date, time, note }
  // pack은 화면에 적힌 그대로의 구성 이름 (예: "10개입 (19,900원)") — 가격은 HTML에서만 관리
  function buildOrderMessage(fields) {
    var f = fields || {};
    var type = TYPE_LABEL[f.type] ? f.type : 'etc';
    var pack = String(f.pack || '').trim();
    var quantity = String(f.quantity || '').trim();
    var note = String(f.note || '').trim();
    var pickup = formatPickup(f.date, f.time);
    var lines = ['안녕하세요! 빵실빵실 베이커리 홈페이지 보고 문의드려요 :)', '', '■ 문의 종류: ' + TYPE_LABEL[type]];

    if (type === 'tuile' && pack) lines.push('■ 구성: ' + pack);
    if (type !== 'etc' && quantity) {
      lines.push('■ 수량: ' + (type === 'tuile' && /^\d+$/.test(quantity) ? quantity + '세트' : quantity));
    }
    var flavors = type === 'tuile' ? flavorLine(f.flavors, pack ? f.packSize : 0) : '';
    if (flavors) lines.push(flavors);
    if (pickup) lines.push('■ 받는 날짜: ' + pickup);
    if (note) lines.push('■ 요청사항: ' + note);

    lines.push('', '감사합니다!');
    return lines.join('\n');
  }

  var api = { formatPickup: formatPickup, buildOrderMessage: buildOrderMessage };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OrderMessage = api;
})(this);
