const test = require('node:test');
const assert = require('node:assert/strict');
const O = require('../js/order-message.js');

const HEAD = '안녕하세요! 빵실빵실 베이커리 홈페이지 보고 문의드려요 :)';

test('formatPickup: 날짜·시간을 한국어로', () => {
  assert.equal(O.formatPickup('2026-09-20', '14:00'), '9월 20일(일) 오후 2시');
  assert.equal(O.formatPickup('2026-09-21', '09:30'), '9월 21일(월) 오전 9시 30분');
  assert.equal(O.formatPickup('2026-09-25', '12:00'), '9월 25일(금) 오후 12시');
  assert.equal(O.formatPickup('2026-10-01', ''), '10월 1일(목)');
  assert.equal(O.formatPickup('', '08:00'), '오전 8시');
  assert.equal(O.formatPickup('', ''), '');
});

test('튀일 선물세트: 구성, 숫자만 쓰면 "세트"를 붙인 수량, 맛별 개수', () => {
  const msg = O.buildOrderMessage({
    type: 'tuile', pack: '5개입 (10,400원)', packSize: 5, quantity: '10',
    flavors: [{ name: '아몬드', count: 2 }, { name: '코코넛', count: 3 }],
    date: '2026-09-20', time: '14:00', note: '답례품이라 리본 포장 부탁드려요',
  });
  assert.equal(msg, [
    HEAD, '',
    '■ 문의 종류: 튀일 선물세트',
    '■ 구성: 5개입 (10,400원)',
    '■ 수량: 10세트',
    '■ 맛 구성 (세트당 5개): 아몬드 2개, 코코넛 3개',
    '■ 받는 날짜: 9월 20일(일) 오후 2시',
    '■ 요청사항: 답례품이라 리본 포장 부탁드려요',
    '', '감사합니다!',
  ].join('\n'));
});

test('맛을 덜 고르면 나머지는 DM으로 상의, 0개인 맛은 빼기', () => {
  const msg = O.buildOrderMessage({
    type: 'tuile', pack: '10개입 (19,900원)', packSize: 10,
    flavors: [{ name: '아몬드', count: 4 }, { name: '땅콩', count: 0 }, { name: '흑임자', count: 3 }],
  });
  assert.match(msg, /■ 맛 구성 \(세트당 10개\): 아몬드 4개, 흑임자 3개 · 나머지 3개는 DM으로 상의할게요\n/);
});

test('맛을 하나도 안 고르면 맛 줄 생략', () => {
  const msg = O.buildOrderMessage({ type: 'tuile', pack: '5개입 (10,400원)', packSize: 5, flavors: [{ name: '아몬드', count: 0 }] });
  assert.doesNotMatch(msg, /맛 구성/);
});

test('롤케이크 선물세트: 2개입, 맛 2개', () => {
  const msg = O.buildOrderMessage({
    type: 'roll', pack: '2개입 (12,300원)', packSize: 2, quantity: '2',
    flavors: [{ name: '오레오', count: 1 }, { name: '모카', count: 1 }, { name: '말차', count: 0 }],
  });
  assert.match(msg, /■ 문의 종류: 롤케이크 선물세트\n/);
  assert.match(msg, /■ 구성: 2개입 \(12,300원\)\n/);
  assert.match(msg, /■ 수량: 2세트\n/);
  assert.match(msg, /■ 맛 구성 \(세트당 2개\): 오레오 1개, 모카 1개\n/);
});

test('휘낭시에 선물세트: 5개 고정', () => {
  const msg = O.buildOrderMessage({
    type: 'financier', pack: '5개입 (10,400원부터)', packSize: 5, quantity: '1',
    flavors: [{ name: '무화과', count: 2 }, { name: '솔티드초코', count: 2 }, { name: '플레인', count: 1 }],
  });
  assert.match(msg, /■ 문의 종류: 휘낭시에 선물세트\n/);
  assert.match(msg, /■ 맛 구성 \(세트당 5개\): 무화과 2개, 솔티드초코 2개, 플레인 1개\n/);
  assert.doesNotMatch(msg, /나머지/);
});

test('빵 단체주문: 수량은 적은 그대로, 구성·맛 줄은 없음', () => {
  const msg = O.buildOrderMessage({
    type: 'bread', pack: '5개입 (10,400원)', packSize: 5, quantity: '빵 30개, 5만 원어치',
    flavors: [{ name: '아몬드', count: 2 }], date: '', time: '', note: '',
  });
  assert.equal(msg, [HEAD, '', '■ 문의 종류: 빵 단체주문', '■ 수량: 빵 30개, 5만 원어치', '', '감사합니다!'].join('\n'));
});

test('기타 문의: 수량·맛은 넣지 않고 빈 칸은 생략', () => {
  const msg = O.buildOrderMessage({
    type: 'etc', quantity: '3', flavors: [{ name: '코코넛', count: 1 }], date: '', time: '', note: '  케이크 주문도 되나요?  ',
  });
  assert.equal(msg, [HEAD, '', '■ 문의 종류: 기타 문의', '■ 요청사항: 케이크 주문도 되나요?', '', '감사합니다!'].join('\n'));
});

test('튀일인데 수량에 글자가 섞이면 그대로', () => {
  const msg = O.buildOrderMessage({ type: 'tuile', quantity: '10세트 정도', flavors: [], date: '', time: '', note: '' });
  assert.match(msg, /■ 수량: 10세트 정도\n/);
  assert.doesNotMatch(msg, /맛 구성/);
  assert.doesNotMatch(msg, /구성/); // 구성을 안 고르면 줄 생략
});

test('알 수 없는 종류는 기타 문의로', () => {
  assert.match(O.buildOrderMessage({ type: 'x' }), /■ 문의 종류: 기타 문의/);
});
