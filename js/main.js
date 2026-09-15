/* 빵실빵실 베이커리 — 화면 연결 (배지 표시, 주소 복사, 나타나기) */
(function () {
  'use strict';

  var S = window.Schedule;
  if (!S) return;

  var BAKE_TEXT = { baking: '지금 나오는 중', just: '방금 나왔어요', next: '다음 빵' };
  var ROW_CLASS = { baking: 'is-now', just: 'is-now', next: 'is-next', first: 'is-next' };

  // 테스트용: ?now=2026-09-01T11:30 (한국 시간)
  function currentDate() {
    var fixed = S.parseSeoulTime(new URLSearchParams(window.location.search).get('now'));
    return fixed || new Date();
  }

  // 570 -> "9시 30분", 480 -> "8시"
  function hourLabel(minutes) {
    var m = minutes % 60;
    return Math.floor(minutes / 60) + '시' + (m ? ' ' + m + '분' : '');
  }

  function renderStoreStatus(minutes) {
    var el = document.querySelector('[data-store-status]');
    if (!el) return;
    var status = S.storeStatus(minutes);
    var text = {
      'open': '지금 영업 중 · ' + hourLabel(S.CLOSE) + '까지',
      'before-open': '오늘 아침 ' + hourLabel(S.OPEN) + '에 문 열어요',
      'closed': '오늘 영업 끝 · 내일 아침 ' + hourLabel(S.OPEN) + '에 만나요'
    };
    el.textContent = text[status];
    el.classList.toggle('is-open', status === 'open');
    el.hidden = false;
  }

  function renderBakeBadges(minutes) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.timeline__row[data-start]'));
    var batches = rows.map(function (row) {
      var start = S.toMinutes(row.getAttribute('data-start'));
      var end = row.hasAttribute('data-end') ? S.toMinutes(row.getAttribute('data-end')) : start;
      return { start: start, end: end };
    });
    var result = S.bakeHighlights(minutes, batches);

    rows.forEach(function (row, i) {
      var label = result.labels[i];
      var badge = row.querySelector('[data-bake-badge]');
      row.classList.remove('is-now', 'is-next');
      if (label) row.classList.add(ROW_CLASS[label]);
      if (!badge) return;
      badge.textContent = !label ? '' : label === 'first' ? '첫 빵 ' + hourLabel(batches[i].start) : BAKE_TEXT[label];
      badge.hidden = !label;
    });

    var done = document.querySelector('[data-bake-done]');
    if (done) done.hidden = !result.allDone;
  }

  function renderBenefitBadges(day, minutes) {
    var today = S.todayBenefits(day, minutes);
    ['coupon', 'lunch'].forEach(function (key) {
      var el = document.querySelector('[data-benefit-badge="' + key + '"]');
      if (el) el.hidden = !today[key];
    });
  }

  function render() {
    var clock = S.seoulClock(currentDate());
    renderStoreStatus(clock.minutes);
    renderBakeBadges(clock.minutes);
    renderBenefitBadges(clock.day, clock.minutes);
  }

  function setupCopyAddress() {
    var button = document.querySelector('[data-copy-address]');
    var address = document.querySelector('[data-address]');
    var toast = document.querySelector('[data-copy-toast]');
    if (!button || !address) return;
    var timer;

    function show(message, ms) {
      if (!toast) return;
      toast.textContent = message;
      clearTimeout(timer);
      timer = setTimeout(function () { toast.textContent = ''; }, ms);
    }

    function selectAddress() {
      var range = document.createRange();
      range.selectNodeContents(address);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      show('주소를 선택했어요. 복사해서 쓰세요', 4000);
    }

    button.addEventListener('click', function () {
      var text = address.textContent.trim();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { show('복사됐어요', 2000); }, selectAddress);
      } else {
        selectAddress();
      }
    });
  }

  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var targets = document.querySelectorAll(
      '.section-head, .menu-card, .timetable, .benefit, .order-banner, .location__info, .location__map'
    );
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(targets, function (el) {
      el.setAttribute('data-reveal', '');
      observer.observe(el);
    });
    document.documentElement.classList.add('has-reveal');
  }

  render();
  setInterval(render, 60 * 1000);
  setupCopyAddress();
  setupReveal();
})();
