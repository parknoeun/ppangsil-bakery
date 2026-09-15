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

test('튀일 선물세트: 숫자만 쓰면 "세트"를 붙이고 맛을 나열', () => {
  const msg = O.buildOrderMessage({
    type: 'tuile', quantity: '10', flavors: ['아몬드', '흑임자'],
    date: '2026-09-20', time: '14:00', note: '답례품이라 리본 포장 부탁드려요',
  });
  assert.equal(msg, [
    HEAD, '',
    '■ 문의 종류: 튀일 선물세트',
    '■ 수량: 10세트',
    '■ 원하는 맛: 아몬드, 흑임자',
    '■ 받는 날짜: 9월 20일(일) 오후 2시',
    '■ 요청사항: 답례품이라 리본 포장 부탁드려요',
    '', '감사합니다!',
  ].join('\n'));
});

test('빵 단체주문: 수량은 적은 그대로, 맛 줄은 없음', () => {
  const msg = O.buildOrderMessage({
    type: 'bread', quantity: '빵 30개, 5만 원어치', flavors: ['아몬드'], date: '', time: '', note: '',
  });
  assert.equal(msg, [HEAD, '', '■ 문의 종류: 빵 단체주문', '■ 수량: 빵 30개, 5만 원어치', '', '감사합니다!'].join('\n'));
});

test('기타 문의: 수량·맛은 넣지 않고 빈 칸은 생략', () => {
  const msg = O.buildOrderMessage({
    type: 'etc', quantity: '3', flavors: ['코코넛'], date: '', time: '', note: '  케이크 주문도 되나요?  ',
  });
  assert.equal(msg, [HEAD, '', '■ 문의 종류: 기타 문의', '■ 요청사항: 케이크 주문도 되나요?', '', '감사합니다!'].join('\n'));
});

test('튀일인데 수량에 글자가 섞이면 그대로', () => {
  const msg = O.buildOrderMessage({ type: 'tuile', quantity: '10세트 정도', flavors: [], date: '', time: '', note: '' });
  assert.match(msg, /■ 수량: 10세트 정도\n/);
  assert.doesNotMatch(msg, /원하는 맛/);
});

test('알 수 없는 종류는 기타 문의로', () => {
  assert.match(O.buildOrderMessage({ type: 'x' }), /■ 문의 종류: 기타 문의/);
});
