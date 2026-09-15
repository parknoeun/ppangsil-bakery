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

  // <span data-closed-date="2026-09-25"> 들에 적힌 휴무일 목록
  function isClosedDate(date) {
    return Array.prototype.some.call(document.querySelectorAll('[data-closed-date]'), function (el) {
      return el.getAttribute('data-closed-date') === date;
    });
  }

  // data-show-until="2026-09-25" 인 공지는 그 날짜가 지나면 숨김
  function renderTimedNotices(date) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-show-until]'), function (el) {
      el.hidden = !S.isShownUntil(date, el.getAttribute('data-show-until'));
    });
  }

  function renderStoreStatus(minutes, closedToday) {
    var el = document.querySelector('[data-store-status]');
    if (!el) return;
    var status = S.storeStatus(minutes, closedToday);
    var text = {
      'open': '지금 영업 중 · ' + hourLabel(S.CLOSE) + '까지',
      'before-open': '오늘 아침 ' + hourLabel(S.OPEN) + '에 문 열어요',
      'closed': '오늘 영업 끝 · 내일 아침 ' + hourLabel(S.OPEN) + '에 만나요',
      'holiday': '오늘은 쉬어가요 · 내일 아침 ' + hourLabel(S.OPEN) + '에 만나요'
    };
    el.textContent = text[status];
    el.classList.toggle('is-open', status === 'open');
    el.hidden = false;
  }

  function renderBakeBadges(minutes, closedToday) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.timeline__row[data-start]'));
    var batches = rows.map(function (row) {
      var start = S.toMinutes(row.getAttribute('data-start'));
      var end = row.hasAttribute('data-end') ? S.toMinutes(row.getAttribute('data-end')) : start;
      return { start: start, end: end };
    });
    var result = S.bakeHighlights(minutes, batches, closedToday);

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

  function renderBenefitBadges(day, minutes, closedToday) {
    var today = S.todayBenefits(day, minutes, closedToday);
    ['coupon', 'lunch'].forEach(function (key) {
      var el = document.querySelector('[data-benefit-badge="' + key + '"]');
      if (el) el.hidden = !today[key];
    });
  }

  function render() {
    var clock = S.seoulClock(currentDate());
    var closedToday = isClosedDate(clock.date);
    renderTimedNotices(clock.date);
    renderStoreStatus(clock.minutes, closedToday);
    renderBakeBadges(clock.minutes, closedToday);
    renderBenefitBadges(clock.day, clock.minutes, closedToday);
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

  // 첫 화면 캐릭터: 누르면 폴짝 뛰고 하트·빵이 퐁퐁
  function setupBuddy() {
    var buddy = document.querySelector('[data-buddy]');
    if (!buddy) return;
    var hint = document.querySelector('[data-buddy-hint]');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var POPS = ['♥', '🍞', '♥', '♥', '🥐', '♥'];

    if (hint && !reduceMotion.matches) hint.hidden = false;

    buddy.addEventListener('click', function () {
      if (hint) hint.hidden = true;
      if (reduceMotion.matches) return;

      buddy.classList.remove('is-hopping');
      void buddy.offsetWidth; // 연달아 눌러도 처음부터 다시 뛰게
      buddy.classList.add('is-hopping');

      POPS.forEach(function (char, i) {
        var pop = document.createElement('span');
        var angle = (-150 + i * 24 + Math.random() * 12) * Math.PI / 180; // 위쪽 부채꼴
        var dist = 70 + Math.random() * 40;
        pop.className = 'buddy-pop' + (i % 2 ? ' buddy-pop--alt' : '');
        pop.setAttribute('aria-hidden', 'true');
        pop.textContent = char;
        pop.style.setProperty('--dx', Math.round(Math.cos(angle) * dist) + 'px');
        pop.style.setProperty('--dy', Math.round(Math.sin(angle) * dist) + 'px');
        pop.style.setProperty('--rot', Math.round(Math.random() * 60 - 30) + 'deg');
        buddy.parentNode.appendChild(pop);
        setTimeout(function () { pop.remove(); }, 1050);
      });
    });

    buddy.addEventListener('animationend', function () { buddy.classList.remove('is-hopping'); });
  }

  // 빵 나오는 시간 각 행에 김 모양 넣기 (보이는 건 .is-now 행만, CSS)
  function setupSteam() {
    Array.prototype.forEach.call(document.querySelectorAll('.timeline__row'), function (row) {
      var steam = document.createElement('span');
      steam.className = 'steam';
      steam.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 3; i++) steam.appendChild(document.createElement('i'));
      row.appendChild(steam);
    });
  }

  // 메뉴 사진이 옆으로 천천히 흐름. 손으로 밀면 멈췄다가 3초 뒤 다시 흐르고, 마우스를 올리면 멈춤
  function setupCarousel() {
    var viewport = document.querySelector('[data-carousel]');
    if (!viewport) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var track = viewport.querySelector('.menu-carousel__track');
    var originals = Array.prototype.slice.call(track.children);
    if (originals.length === 0) return;

    // 끝없이 이어지도록 한 벌 복제 (스크린리더·탭 이동에서는 제외)
    originals.forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(clone.querySelectorAll('a'), function (a) { a.tabIndex = -1; });
      track.appendChild(clone);
    });

    var SPEED = 28;          // 초당 px
    var RESUME_DELAY = 3000; // 손을 뗀 뒤 다시 흐르기까지
    var loopWidth = 0;       // 원본 한 벌의 폭 (복제본 첫 칸까지의 거리)
    var pos = 1;
    var last = 0;
    var hovering = false;
    var focused = false;
    var onScreen = true;
    var resumeAt = 0;

    function measure() {
      loopWidth = track.children[originals.length].offsetLeft - originals[0].offsetLeft;
    }

    // 스크롤 위치를 [1, loopWidth + 1) 안으로 되돌림. 원본과 복제본이 같아 보여서 이음매가 안 보임
    function wrap(x) {
      if (x < 1) return x + loopWidth;
      if (x >= loopWidth + 1) return x - loopWidth;
      return x;
    }

    function holdFor(ms) { resumeAt = performance.now() + ms; }

    function tick(now) {
      var dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      if (loopWidth > 0 && !hovering && !focused && onScreen && now >= resumeAt) {
        pos = wrap(pos + SPEED * dt / 1000);
        viewport.scrollLeft = pos;
      } else {
        pos = viewport.scrollLeft;
      }
      window.requestAnimationFrame(tick);
    }

    viewport.addEventListener('scroll', function () {
      if (loopWidth <= 0) return;
      var x = viewport.scrollLeft;
      var wrapped = wrap(x);
      if (wrapped !== x) viewport.scrollLeft = wrapped;
    }, { passive: true });

    viewport.addEventListener('touchstart', function () { holdFor(Infinity); }, { passive: true });
    viewport.addEventListener('touchend', function () { holdFor(RESUME_DELAY); }, { passive: true });
    viewport.addEventListener('touchcancel', function () { holdFor(RESUME_DELAY); }, { passive: true });
    viewport.addEventListener('wheel', function () { holdFor(RESUME_DELAY); }, { passive: true });
    viewport.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
    viewport.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hovering = false; });
    viewport.addEventListener('focusin', function () { focused = true; });
    viewport.addEventListener('focusout', function () { focused = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; }).observe(viewport);
    }
    window.addEventListener('resize', measure);

    measure();
    viewport.scrollLeft = pos;
    window.requestAnimationFrame(tick);
  }

  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var targets = document.querySelectorAll(
      '.section-head, .story-card, .menu-card, .timetable, .benefit, .order-banner, .location__info, .location__map'
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
  setupBuddy();
  setupSteam();
  setupCarousel();
  // iOS Safari에서 버튼 :active(말랑 눌림)가 동작하게
  document.addEventListener('touchstart', function () {}, { passive: true });
  setupReveal();
})();
