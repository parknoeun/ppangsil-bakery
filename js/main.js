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

    // 영업 중이 아니면 첫 화면을 밤 분위기로 (달·별·zzZ)
    var night = status !== 'open';
    document.documentElement.classList.toggle('is-night', night);
    Array.prototype.forEach.call(document.querySelectorAll('[data-night]'), function (deco) {
      deco.hidden = !night;
    });
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

  // 안내 문구를 잠깐 보여줬다가 지움
  function flash(el, message, ms) {
    if (!el) return;
    el.textContent = message;
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(function () { el.textContent = ''; }, ms);
  }

  // 옛 방식 복사: el 내용을 선택하고 execCommand. 성공하면 true
  function copyBySelection(el) {
    if (!el) return false;
    if (el.select) {
      el.focus();
      el.select();
    } else {
      var range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
    try { return document.execCommand('copy'); } catch (e) { return false; }
  }

  // 클립보드에 복사. 결과(true/false)를 Promise로. 막히면 selectEl을 선택해 둠
  function copyText(text, selectEl) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return copyBySelection(selectEl); }
      );
    }
    return Promise.resolve(copyBySelection(selectEl));
  }

  function setupCopyAddress() {
    var button = document.querySelector('[data-copy-address]');
    var address = document.querySelector('[data-address]');
    var toast = document.querySelector('[data-copy-toast]');
    if (!button || !address) return;

    button.addEventListener('click', function () {
      copyText(address.textContent.trim(), address).then(function (ok) {
        flash(toast, ok ? '복사됐어요' : '주소를 선택했어요. 복사해서 쓰세요', ok ? 2000 : 4000);
      });
    });
  }

  // 휴대폰에서 인스타그램 링크를 앱으로 열기
  // - iOS: 새 탭(target=_blank)이면 유니버설 링크가 무시될 수 있어 같은 탭으로 엶
  // - Android: intent:// 로 인스타 앱을 직접 지정, 앱이 없으면 원래 주소(browser_fallback_url)로
  function setupInstagramAppLinks() {
    var ua = navigator.userAgent;
    var isAndroid = /Android/i.test(ua);
    var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isAndroid && !isIOS) return;

    var links = document.querySelectorAll('a[href^="https://ig.me/"], a[href^="https://www.instagram.com/"]');
    Array.prototype.forEach.call(links, function (a) {
      a.removeAttribute('target');
      if (isAndroid) {
        var url = a.getAttribute('href');
        a.setAttribute('href', 'intent://' + url.replace(/^https:\/\//, '') +
          '#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=' + encodeURIComponent(url) + ';end');
      }
    });
  }

  // 선물세트 사진 크게 보기: 누르면 화면 가운데에 큰 사진 (큰 파일은 누를 때만 받음)
  function setupLightbox() {
    var dialog = document.querySelector('[data-lightbox]');
    var buttons = document.querySelectorAll('[data-zoom]');
    if (!dialog || !buttons.length) return;
    var img = dialog.querySelector('[data-lightbox-img]');

    function close() {
      if (dialog.open) dialog.close();
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var src = button.getAttribute('data-zoom');
        // <dialog>를 못 쓰는 브라우저면 사진을 새 탭으로
        if (!dialog.showModal) {
          window.open(src, '_blank', 'noopener');
          return;
        }
        img.src = src;
        img.alt = button.getAttribute('aria-label').replace(' 크게 보기', '');
        dialog.showModal();
        document.documentElement.classList.add('is-lightbox-open');
      });
    });

    dialog.querySelector('[data-lightbox-close]').addEventListener('click', close);
    // 사진 바깥(어두운 배경)을 누르면 닫기
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) close();
    });
    // 닫힌 뒤에는 사진을 비워 메모리를 돌려줌 (Esc로 닫을 때도 동작)
    dialog.addEventListener('close', function () {
      img.removeAttribute('src');
      document.documentElement.classList.remove('is-lightbox-open');
    });
  }

  // 카카오맵: 지도 칸이 화면에 들어올 때만 SDK를 불러온다 (사용량 아끼기)
  // 실패하면(서비스 꺼짐·도메인 미등록·네트워크) 안내 문구를 그대로 두고 카카오맵 버튼으로 보냄
  function setupKakaoMap() {
    var canvas = document.querySelector('[data-kakao-map]');
    if (!canvas) return;
    var fallback = document.querySelector('[data-map-fallback]');
    var key = canvas.getAttribute('data-key');
    var lat = Number(canvas.getAttribute('data-lat'));
    var lng = Number(canvas.getAttribute('data-lng'));
    var started = false;

    function failed() {
      if (fallback) fallback.textContent = '지도를 불러오지 못했어요. 아래 카카오맵 버튼으로 열어주세요';
    }

    function draw() {
      var kakao = window.kakao;
      var center = new kakao.maps.LatLng(lat, lng);
      var map = new kakao.maps.Map(canvas, { center: center, level: 3 });
      map.setDraggable(false);  // 손가락으로 지도를 끌다가 페이지 스크롤이 막히지 않게
      map.setZoomable(false);
      new kakao.maps.Marker({ map: map, position: center });
      new kakao.maps.CustomOverlay({
        map: map,
        position: center,
        yAnchor: 2.3,
        content: '<div class="map-label">빵실빵실 베이커리</div>'
      });
      if (fallback) fallback.hidden = true;
    }

    function load() {
      if (started) return;
      started = true;
      var script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + key + '&autoload=false';
      script.onload = function () {
        if (!window.kakao || !window.kakao.maps) return failed();
        window.kakao.maps.load(function () {
          try { draw(); } catch (e) { failed(); }
        });
      };
      script.onerror = failed;
      document.head.appendChild(script);
      setTimeout(function () { if (fallback && !fallback.hidden && !canvas.firstChild) failed(); }, 8000);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        load();
      }, { rootMargin: '300px' });
      io.observe(canvas);
    } else {
      load();
    }
  }

  // ① 단체주문 문의 문구 만들기
  function setupOrderHelper() {
    var helper = document.querySelector('[data-order-helper]');
    if (!helper || !window.OrderMessage) return;
    var form = helper.querySelector('[data-order-form]');
    var preview = helper.querySelector('[data-order-preview]');
    var toast = helper.querySelector('[data-order-toast]');
    var quantity = form.elements.quantity;

    // 세트 종류별 맛 묶음: 튀일(구성에 따라 5·10개), 롤케이크(2개), 휘낭시에(5개)
    var groups = Array.prototype.map.call(form.querySelectorAll('[data-flavor-group]'), function (el) {
      return {
        type: el.getAttribute('data-flavor-group'),
        size: Number(el.getAttribute('data-pack-size')) || 0, // 0이면 '구성' 라디오에서 읽음
        label: el.getAttribute('data-pack-label') || '',
        steppers: Array.prototype.slice.call(el.querySelectorAll('.stepper')),
        status: el.querySelector('[data-flavor-status]')
      };
    });

    form.elements.date.min = S.seoulClock(currentDate()).date;

    function currentType() { return form.querySelector('input[name="type"]:checked').value; }

    // 선택한 문의 종류의 맛 묶음 (튀일/롤케이크/휘낭시에). 선물세트가 아니면 null
    function activeGroup() {
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].type === currentType()) return groups[i];
      }
      return null;
    }

    // 세트 하나에 담는 개수: 튀일은 고른 구성, 나머지는 정해진 값
    function packSize(group) {
      if (!group) return 0;
      if (group.size) return group.size;
      var pack = form.querySelector('input[name="pack"]:checked');
      return pack ? Number(pack.getAttribute('data-size')) : 0;
    }

    function packLabel(group) {
      if (!group) return '';
      if (group.label) return group.label;
      var pack = form.querySelector('input[name="pack"]:checked');
      return pack ? pack.value : '';
    }

    function countOf(stepper) { return Number(stepper.querySelector('[data-count]').textContent); }
    function setCount(stepper, n) { stepper.querySelector('[data-count]').textContent = n; }
    function totalCount(group) {
      return group.steppers.reduce(function (sum, s) { return sum + countOf(s); }, 0);
    }

    // 구성이 작아져서 합계가 넘치면 뒤쪽 맛부터 줄임
    function clampToPack(group) {
      var over = totalCount(group) - packSize(group);
      for (var i = group.steppers.length - 1; i >= 0 && over > 0; i--) {
        var take = Math.min(countOf(group.steppers[i]), over);
        setCount(group.steppers[i], countOf(group.steppers[i]) - take);
        over -= take;
      }
    }

    // +/- 버튼 막기와 "5개 중 3개 골랐어요" 안내
    function renderSteppers(group) {
      var size = packSize(group);
      var total = totalCount(group);
      group.steppers.forEach(function (s) {
        s.querySelector('[data-step="-1"]').disabled = countOf(s) === 0;
        s.querySelector('[data-step="1"]').disabled = total >= size;
      });
      group.status.textContent = total === size
        ? size + '개 다 골랐어요 ✓'
        : size + '개 중 ' + total + '개 골랐어요 · ' + (size - total) + '개 더 골라주세요';
      group.status.classList.toggle('is-done', total === size);
    }

    groups.forEach(function (group) {
      group.steppers.forEach(function (s) {
        Array.prototype.forEach.call(s.querySelectorAll('[data-step]'), function (btn) {
          btn.addEventListener('click', function () {
            var next = countOf(s) + Number(btn.getAttribute('data-step'));
            if (next < 0 || totalCount(group) - countOf(s) + next > packSize(group)) return;
            setCount(s, next);
            update();
          });
        });
      });
    });

    function readFields() {
      var group = activeGroup();
      return {
        type: currentType(),
        pack: packLabel(group),
        packSize: packSize(group),
        quantity: quantity.value,
        flavors: group ? group.steppers.map(function (s) {
          return { name: s.getAttribute('data-flavor'), count: countOf(s) };
        }) : [],
        date: form.elements.date.value,
        time: form.elements.time.value,
        note: form.elements.note.value
      };
    }

    function update() {
      var group = activeGroup();
      if (group) {
        clampToPack(group);
        renderSteppers(group);
      }
      var fields = readFields();
      Array.prototype.forEach.call(form.querySelectorAll('[data-show-for]'), function (el) {
        el.hidden = el.getAttribute('data-show-for').split(' ').indexOf(fields.type) === -1;
      });
      var placeholder = quantity.getAttribute('data-placeholder-' + fields.type);
      if (placeholder) quantity.placeholder = placeholder;
      preview.value = window.OrderMessage.buildOrderMessage(fields);
    }

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    // 복사한 뒤 링크 기본 동작으로 DM을 엶 (같은 탭 동작 안에서 복사해야 브라우저가 허용)
    helper.querySelector('[data-order-send]').addEventListener('click', function () {
      copyText(preview.value, preview).then(function (ok) {
        flash(toast, ok ? '복사됐어요! DM 창에 붙여넣기 해서 보내주세요' : '복사가 막혔어요. 미리보기 문구를 길게 눌러 복사해 주세요', 6000);
      });
    });
    helper.querySelector('[data-order-copy]').addEventListener('click', function () {
      copyText(preview.value, preview).then(function (ok) {
        flash(toast, ok ? '복사됐어요!' : '복사가 막혔어요. 미리보기 문구를 길게 눌러 복사해 주세요', 4000);
      });
    });

    helper.hidden = false;
    update();
  }

  // ④ 친구에게 알려주기: 휴대폰 공유 창, 없으면 링크 복사
  function setupShare() {
    var buttons = document.querySelectorAll('[data-share]');
    if (!buttons.length) return;
    var canonical = document.querySelector('link[rel="canonical"]');
    var shareData = {
      title: '빵실빵실 베이커리',
      text: '태전동 당일생산 빵집 🍞 빵 나오는 시간이랑 할인 정보 여기서 봐!',
      url: canonical ? canonical.href : window.location.origin + window.location.pathname
    };

    Array.prototype.forEach.call(buttons, function (button) {
      var toast = button.parentNode.querySelector('[data-share-toast]');
      button.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share(shareData).catch(function () {}); // 공유 창을 그냥 닫은 경우는 무시
          return;
        }
        copyText(shareData.url, null).then(function (ok) {
          flash(toast, ok ? '링크가 복사됐어요' : shareData.url, ok ? 2500 : 8000);
        });
      });
      button.hidden = false;
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

  // 헤더 아래선: 스크롤한 만큼 막대가 차오르고 그 위를 식빵이 뒤뚱뒤뚱 걸어감 (위로 올리면 뒤돌아 걸음)
  function setupScrollWalk() {
    var walk = document.querySelector('[data-scroll-walk]');
    if (!walk) return;
    var bar = walk.querySelector('.scroll-walk__bar');
    var buddy = walk.querySelector('.scroll-walk__buddy');
    var lastY = window.scrollY;
    var facingBack = false;
    var ticking = false;
    var stopTimer;

    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
      if (y !== lastY) facingBack = y < lastY;
      lastY = y;

      bar.style.transform = 'scaleX(' + progress + ')';
      buddy.style.transform = 'translateX(' + Math.round(progress * (walk.clientWidth - buddy.offsetWidth)) + 'px)' +
        (facingBack ? ' scaleX(-1)' : '');
    }

    window.addEventListener('scroll', function () {
      walk.classList.add('is-walking');
      clearTimeout(stopTimer);
      stopTimer = setTimeout(function () { walk.classList.remove('is-walking'); }, 180);
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);

    walk.hidden = false;
    update();
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
  setupInstagramAppLinks();
  setupKakaoMap();
  setupLightbox();
  setupOrderHelper();
  setupShare();
  setupBuddy();
  setupScrollWalk();
  setupSteam();
  setupCarousel();
  // iOS Safari에서 버튼 :active(말랑 눌림)가 동작하게
  document.addEventListener('touchstart', function () {}, { passive: true });
  setupReveal();
})();
