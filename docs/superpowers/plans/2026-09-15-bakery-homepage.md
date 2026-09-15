# 빵실빵실 베이커리 홈페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포스터 톤의 정적 원페이지 홈페이지(메뉴·빵 시간·할인·오시는 길)를 만들고 GitHub Pages에 배포한다.

**Architecture:** 모든 텍스트 콘텐츠는 `index.html` 하나에 둔다. 시간 계산은 DOM을 모르는 순수 함수 파일(`js/schedule.js`)로 분리해 Node 내장 테스트 러너로 검증하고, `js/main.js`가 HTML의 `data-*` 속성을 읽어 배지를 붙인다. 빌드 도구·패키지 없음.

**Tech Stack:** HTML5, CSS (custom properties, grid), 바닐라 JS (ES5 호환 IIFE, `file://`에서도 동작), Node 24 `node --test`, Python Pillow(이미지 가공), Google Fonts(Jua, Gaegu), gh CLI(배포).

**Spec:** `docs/superpowers/specs/2026-09-15-bakery-homepage-design.md`

## Global Constraints

- 색: `--cream #F8F0DA` · `--paper #FCF7EA` · `--terracotta #C0603C` · `--crust #A54B36` · `--ink #6E3A28`
- 대비: 테라코타 글자는 24px 이상(또는 18.66px 이상 굵게)만. 크림 글자를 올리는 버튼·배지 배경은 `--crust`. 작은 본문은 `--ink`.
- 폰트: 제목 `Jua`(weight 400만 존재 — `font-weight: 400` 명시), 손글씨 `Gaegu` 400/700, 정보 글자는 시스템 고딕.
- 시간 기준은 항상 `Asia/Seoul`. 테스트용 `?now=YYYY-MM-DDTHH:MM`.
- 이름 통일: 사이트 전체에서 "프랑스시골빵" (포스터의 "무화과시골빵" 사용 금지).
- 외부 이미지 URL 핫링크 금지 — 모두 `images/`에 저장.
- JS 실패 시에도 모든 정보가 보여야 한다 (배지 요소는 `hidden`으로 시작).
- 전화 `tel:010-5528-6149` · 인스타 `https://www.instagram.com/ppangsil_bakery` · DM `https://ig.me/m/ppangsil_bakery`
- 한국어 줄바꿈: `word-break: keep-all`.
- 폭 375px에서 가로 스크롤 없음.
- 모든 커밋 메시지 마지막 줄: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` (아래 명령 예시에서는 생략)

## File Map

| 파일 | 책임 |
|---|---|
| `.gitignore` | macOS 잡파일 제외 |
| `images/character.png` | 캐릭터 (투명 여백 잘라 폭 600px) |
| `images/favicon.png` | 180×180, 크림 배경 + 캐릭터 |
| `images/menu-country-bread.jpg` · `menu-mocha-roll.jpg` · `menu-tuile.jpg` | 메뉴 사진 (긴 변 800px) |
| `js/schedule.js` | 순수 시간 계산: 영업 상태, 빵 시간 배지, 오늘의 혜택 |
| `tests/schedule.test.js` | `schedule.js` 단위 테스트 |
| `index.html` | 전체 마크업·콘텐츠·메타·JSON-LD |
| `css/style.css` | 전체 스타일 |
| `js/main.js` | DOM 연결: `?now` 파싱, 배지 표시, 1분 갱신, 주소 복사 |

---

### Task 1: 저장소 초기화와 이미지 준비

**Files:**
- Create: `.gitignore`, `images/character.png`, `images/favicon.png`, `images/menu-country-bread.jpg`, `images/menu-mocha-roll.jpg`, `images/menu-tuile.jpg`

**Interfaces:**
- Produces: 이미지 파일과 실제 픽셀 크기. `index.html`의 width/height는 Step 4 출력값을 쓴다 (예상: character 600×520, bread 600×800, mocha 800×613, tuile 600×800).

- [ ] **Step 1: git 초기화**

```bash
cd /Users/pparknon/workspace/bread-homepage
git init -b main
printf '.DS_Store\n*.swp\n' > .gitignore
```

- [ ] **Step 2: 메뉴 사진 내려받기**

```bash
mkdir -p images && cd images
curl -sL -o src-bread.jpg "https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260827_127%2F1787829651413KyXz7_JPEG%2FKakaoTalk_20260827_201457991.jpg"
curl -sL -o src-mocha.jpg "https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260910_183%2F1789034347835EGrJ6_JPEG%2F3.jpg"
curl -sL -o src-tuile.jpg "https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260903_137%2F17884310197087haQO_JPEG%2FKakaoTalk_20260903_192123982.jpg"
```

- [ ] **Step 3: 가공 스크립트 실행**

```bash
cd /Users/pparknon/workspace/bread-homepage/images
python3 - <<'PY'
from PIL import Image

# 캐릭터: 투명 여백 제거 후 폭 600
ch = Image.open('/Users/pparknon/Downloads/빵캐릭터.png').convert('RGBA')
ch = ch.crop(ch.getchannel('A').getbbox())
w = 600
ch_small = ch.resize((w, round(ch.height * w / ch.width)), Image.LANCZOS)
ch_small.save('character.png', optimize=True)

# 파비콘: 180x180 크림 배경 가운데 캐릭터
fav = Image.new('RGBA', (180, 180), (0xF8, 0xF0, 0xDA, 255))
icon = ch.copy(); icon.thumbnail((144, 144), Image.LANCZOS)
fav.alpha_composite(icon, ((180 - icon.width) // 2, (180 - icon.height) // 2))
fav.save('favicon.png', optimize=True)

# 메뉴 사진: 긴 변 800, JPEG 품질 80
for src, dst in [('src-bread.jpg', 'menu-country-bread.jpg'),
                 ('src-mocha.jpg', 'menu-mocha-roll.jpg'),
                 ('src-tuile.jpg', 'menu-tuile.jpg')]:
    im = Image.open(src).convert('RGB')
    im.thumbnail((800, 800), Image.LANCZOS)
    im.save(dst, quality=80, optimize=True, progressive=True)
PY
rm src-bread.jpg src-mocha.jpg src-tuile.jpg
```

- [ ] **Step 4: 결과 확인**

Run: `cd /Users/pparknon/workspace/bread-homepage/images && python3 -c "from PIL import Image;import os;[print(f, Image.open(f).size, os.path.getsize(f)//1024,'KB') for f in sorted(os.listdir('.'))]"`
Expected: 파일 5개, 각 250KB 이하. 크기가 Interfaces의 예상값과 다르면 Task 3의 width/height를 출력값으로 바꾼다. Read 도구로 `character.png`, `menu-country-bread.jpg`를 열어 잘림·깨짐이 없는지 눈으로 확인.

- [ ] **Step 5: Commit**

```bash
cd /Users/pparknon/workspace/bread-homepage
git add .gitignore images docs
git commit -m "chore: 저장소 초기화, 이미지와 설계 문서 추가"
```

---

### Task 2: 시간 계산 로직 (`js/schedule.js`)

**Files:**
- Create: `js/schedule.js`
- Test: `tests/schedule.test.js`

**Interfaces:**
- Produces (브라우저에서는 `window.Schedule`, Node에서는 `require('../js/schedule.js')`):
  - `OPEN: number` (480), `CLOSE: number` (1260) — 영업 시작·종료 분
  - `toMinutes(hhmm: string) -> number` — `"09:30"` → `570`
  - `parseSeoulTime(value: string) -> Date | null` — `"2026-09-01T11:30"`을 한국 시간으로 해석, 형식 오류면 `null`
  - `seoulClock(date: Date) -> { day: number, minutes: number }` — 한국 시간의 일(1~31)과 자정 이후 분
  - `storeStatus(minutes: number) -> 'before-open' | 'open' | 'closed'`
  - `bakeHighlights(minutes: number, batches: Array<{start: number, end: number}>) -> { labels: Array<'first'|'baking'|'just'|'next'|null>, allDone: boolean }` — `labels[i]`는 `batches[i]`의 배지
  - `todayBenefits(day: number, minutes: number) -> { coupon: boolean, lunch: boolean }`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/schedule.test.js`

```js
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
  assert.deepEqual(S.seoulClock(d), { day: 1, minutes: 690 });
  assert.equal(S.parseSeoulTime('2026-09-01 11:30'), null);
  assert.equal(S.parseSeoulTime(''), null);
  assert.equal(S.parseSeoulTime(null), null);
});

test('seoulClock은 UTC 날짜를 한국 시간으로 바꾼다', () => {
  assert.deepEqual(S.seoulClock(new Date('2026-09-01T15:30:00Z')), { day: 2, minutes: 30 });
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
```

- [ ] **Step 2: 실패 확인**

Run: `cd /Users/pparknon/workspace/bread-homepage && node --test tests/schedule.test.js`
Expected: FAIL — `Cannot find module '../js/schedule.js'`

- [ ] **Step 3: 구현** — `js/schedule.js`

```js
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
```

- [ ] **Step 4: 통과 확인**

Run: `cd /Users/pparknon/workspace/bread-homepage && node --test tests/schedule.test.js`
Expected: `# pass 8`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/schedule.js tests/schedule.test.js
git commit -m "feat: 영업 상태·빵 시간·오늘의 혜택 계산 로직"
```

---

### Task 3: 마크업과 콘텐츠 (`index.html`)

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: Task 1 이미지 경로·크기, Task 2 `js/schedule.js`
- Produces (Task 4 CSS, Task 5 JS가 의존하는 훅):
  - `[data-store-status]` — 영업 상태 배지 `<p>`, `hidden`으로 시작
  - `.timeline__row[data-start][data-end?]` — 빵 시간 행. 안에 `[data-bake-badge]` `<span hidden>`
  - `[data-bake-done]` — "오늘 빵이 모두 나왔어요" `<p hidden>`
  - `[data-benefit-badge="coupon"]`, `[data-benefit-badge="lunch"]` — `<p hidden>`
  - `[data-copy-address]` 버튼, `[data-address]` 주소 텍스트, `[data-copy-toast]` 안내
  - 섹션 id: `top`, `menu`, `timetable`, `benefits`, `order`, `location`

- [ ] **Step 1: 파일 작성** — `index.html`

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>빵실빵실 베이커리 | 경기 광주 태전동 빵집</title>
  <meta name="description" content="당일생산, 당일판매. 경기 광주 태전동 빵실빵실 베이커리의 빵 나오는 시간, 매월 1·2·3일 할인쿠폰, 매일 점심할인 10% 소식을 확인하세요.">
  <meta name="theme-color" content="#F8F0DA">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:title" content="빵실빵실 베이커리">
  <meta property="og:description" content="당일생산, 당일판매 · 매일 08:00~21:00 · 경기 광주 태봉로 145-3">
  <meta property="og:image" content="images/menu-country-bread.jpg">
  <link rel="icon" type="image/png" href="images/favicon.png">
  <link rel="apple-touch-icon" href="images/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Jua&display=swap">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "name": "빵실빵실 베이커리",
    "image": "images/menu-country-bread.jpg",
    "telephone": "+82-10-5528-6149",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "태봉로 145-3 우방상가 101호",
      "addressLocality": "광주시",
      "addressRegion": "경기도",
      "addressCountry": "KR"
    },
    "openingHoursSpecification": [{
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "08:00",
      "closes": "21:00"
    }],
    "sameAs": ["https://www.instagram.com/ppangsil_bakery"]
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main">본문 바로가기</a>

  <svg class="sprite" aria-hidden="true" focusable="false">
    <symbol id="flower" viewBox="0 0 40 40">
      <mask id="flower-hole">
        <rect width="40" height="40" fill="#fff"/>
        <circle cx="20" cy="20" r="4.5" fill="#000"/>
      </mask>
      <g mask="url(#flower-hole)" fill="currentColor">
        <circle cx="20" cy="11" r="9"/>
        <circle cx="29" cy="20" r="9"/>
        <circle cx="20" cy="29" r="9"/>
        <circle cx="11" cy="20" r="9"/>
      </g>
    </symbol>
  </svg>

  <header class="site-header">
    <div class="container site-header__inner">
      <a class="brand" href="#top">
        <img class="brand__icon" src="images/character.png" alt="" width="600" height="520">
        <span class="brand__name">빵실빵실 베이커리</span>
      </a>
      <nav class="site-nav" aria-label="바로가기">
        <a href="#menu">메뉴</a>
        <a href="#timetable">빵 시간</a>
        <a href="#benefits">할인</a>
        <a href="#location">오시는 길</a>
      </nav>
    </div>
  </header>

  <main id="main">
    <!-- ② 첫 화면 -->
    <section class="hero" id="top">
      <div class="container hero__inner">
        <div class="hero__art">
          <img src="images/character.png" alt="종이봉투에 담긴 웃는 식빵 캐릭터" width="600" height="520">
        </div>
        <div class="hero__text">
          <p class="eyebrow">FRESH BAKED EVERY DAY</p>
          <h1 class="hero__title">빵실빵실<br>베이커리</h1>
          <p class="hero__lead">매일매일 갓 구운 빵을 정성껏 준비해요!</p>
          <p class="hero__tag">당일생산, 당일판매</p>
          <p class="status-badge" data-store-status hidden></p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="tel:010-5528-6149"><span aria-hidden="true">📞</span> 전화하기</a>
            <a class="btn btn--ghost" href="#location"><span aria-hidden="true">📍</span> 길찾기</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ③ 대표 메뉴 -->
    <section class="section" id="menu" aria-labelledby="menu-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">OUR BEST</p>
          <h2 class="section-title" id="menu-title">대표 메뉴</h2>
        </div>
        <ul class="menu-grid">
          <li class="menu-card">
            <div class="menu-card__photo">
              <img src="images/menu-country-bread.jpg" alt="밀가루를 뿌려 구운 둥근 프랑스시골빵" width="600" height="800" loading="lazy">
              <span class="menu-card__tag">시그니처</span>
            </div>
            <div class="menu-card__body">
              <div class="menu-card__head">
                <h3 class="menu-card__name">프랑스시골빵</h3>
                <p class="menu-card__price">3,800원</p>
              </div>
              <p class="menu-card__desc">무화과, 건포도, 크랜베리 듬뿍 들어간 소프트 깜빠뉴!</p>
              <p class="menu-card__note">11시에 나와요</p>
            </div>
          </li>
          <li class="menu-card">
            <div class="menu-card__photo">
              <img src="images/menu-mocha-roll.jpg" alt="모카 크림이 말려 들어간 롤케이크 단면" width="800" height="613" loading="lazy">
            </div>
            <div class="menu-card__body">
              <div class="menu-card__head">
                <h3 class="menu-card__name">모카롤케이크</h3>
                <p class="menu-card__price">5,700원</p>
              </div>
              <p class="menu-card__desc">모카향을 가득 머금은 버터크림과 퐁신한 케이크가 입에서 사르르르 ( ͜♡･ω･) ͜♡</p>
            </div>
          </li>
          <li class="menu-card">
            <div class="menu-card__photo">
              <img src="images/menu-tuile.jpg" alt="리본으로 포장한 튀일 선물 상자" width="600" height="800" loading="lazy">
              <span class="menu-card__tag">선물 추천</span>
            </div>
            <div class="menu-card__body">
              <div class="menu-card__head">
                <h3 class="menu-card__name">튀일 세트 <small>(5개입)</small></h3>
                <p class="menu-card__price">10,400원</p>
              </div>
              <p class="menu-card__desc">총 5가지 맛을 내 마음대로 골라 담아 마음을 전해보세요 ( ᴗ ̫ ᴗ ) ♡</p>
            </div>
          </li>
        </ul>
        <p class="menu-more">그 밖의 빵 30종은 <a href="#timetable">빵 나오는 시간</a>에서 확인하세요 →</p>
      </div>
    </section>

    <!-- ④ 빵 나오는 시간 -->
    <section class="section section--terracotta" id="timetable" aria-labelledby="timetable-title">
      <div class="container">
        <div class="section-head section-head--on-dark">
          <p class="eyebrow">BAKING TIMETABLE</p>
          <h2 class="section-title" id="timetable-title">빵 나오는 시간</h2>
        </div>
        <div class="timetable">
          <p class="timetable__done" data-bake-done hidden>오늘 빵이 모두 나왔어요 ♥</p>
          <ol class="timeline">
            <li class="timeline__row" data-start="08:00" data-end="09:00">
              <div class="timeline__time">
                <span class="timeline__clock">8:00</span>
                <span class="timeline__until">~ 9:00</span>
                <span class="timeline__badge" data-bake-badge hidden></span>
              </div>
              <ul class="bread-list">
                <li>크림치즈모찌</li><li>로띠번</li><li>갈릭치즈토스트</li><li>에그타르트</li>
                <li>애플파이</li><li>까눌레</li><li>프레첼</li><li>라우겐소보로</li>
                <li>크로크무슈</li><li>소세지피자빵</li><li>밤식빵</li><li>모닝빵</li>
                <li>감자모닝빵</li><li>초코모닝빵</li><li>초코식빵</li><li>팥빵</li>
              </ul>
            </li>
            <li class="timeline__row" data-start="09:30">
              <div class="timeline__time">
                <span class="timeline__clock">9:30 ~</span>
                <span class="timeline__badge" data-bake-badge hidden></span>
              </div>
              <ul class="bread-list">
                <li>우유식빵</li><li>감자식빵</li><li>치아바타</li>
              </ul>
            </li>
            <li class="timeline__row" data-start="09:40">
              <div class="timeline__time">
                <span class="timeline__clock">9:40 ~</span>
                <span class="timeline__badge" data-bake-badge hidden></span>
              </div>
              <ul class="bread-list">
                <li>모찌식빵</li><li>잡곡식빵</li><li>초코빵오</li><li>크루와상</li><li>소세지파이</li>
              </ul>
            </li>
            <li class="timeline__row" data-start="10:30">
              <div class="timeline__time">
                <span class="timeline__clock">10:30 ~</span>
                <span class="timeline__badge" data-bake-badge hidden></span>
              </div>
              <ul class="bread-list">
                <li>바게트</li><li>명란바게트</li><li>우유크림소금빵</li><li>초코소라빵</li>
              </ul>
            </li>
            <li class="timeline__row" data-start="11:00">
              <div class="timeline__time">
                <span class="timeline__clock">11:00 ~</span>
                <span class="timeline__badge" data-bake-badge hidden></span>
              </div>
              <ul class="bread-list">
                <li class="is-signature">프랑스시골빵 <small>시그니처</small></li><li>바질토마토시골빵</li>
              </ul>
            </li>
          </ol>
        </div>
        <p class="timetable__footer">매일 새벽 정성껏 구운 빵으로 행복을 전합니다 ♥</p>
      </div>
    </section>

    <!-- ⑤ 할인 혜택 -->
    <section class="section" id="benefits" aria-labelledby="benefits-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">SPECIAL BENEFITS</p>
          <h2 class="section-title" id="benefits-title">할인 혜택</h2>
        </div>
        <div class="benefit-grid">
          <article class="benefit coupon" aria-labelledby="coupon-title">
            <p class="benefit-badge" data-benefit-badge="coupon" hidden>오늘은 쿠폰 받는 날!</p>
            <p class="coupon__when">
              <span>매월</span>
              <span class="cal">1일</span>
              <span class="cal">2일</span>
              <span class="cal">3일</span>
              <span>에는!</span>
            </p>
            <div class="coupon__ticket">
              <p class="coupon__label">DISCOUNT COUPON</p>
              <h3 class="coupon__title" id="coupon-title">
                <span class="coupon__amount">3,000원</span>
                <span class="coupon__sub">할인쿠폰 지급!!</span>
              </h3>
              <ul class="checklist checklist--on-dark">
                <li>10,000원 결제 당 지급</li>
                <li>쿠폰과 포인트 적립 중복 불가</li>
                <li>유효기간은 발급일로부터 30일</li>
                <li>쿠폰 여러 장 사용 가능</li>
              </ul>
            </div>
          </article>

          <article class="benefit lunch" aria-labelledby="lunch-title">
            <p class="benefit-badge" data-benefit-badge="lunch" hidden>지금 할인 중!</p>
            <svg class="flower flower--tl" aria-hidden="true" focusable="false"><use href="#flower"/></svg>
            <svg class="flower flower--tr" aria-hidden="true" focusable="false"><use href="#flower"/></svg>
            <svg class="flower flower--bl" aria-hidden="true" focusable="false"><use href="#flower"/></svg>
            <svg class="flower flower--br" aria-hidden="true" focusable="false"><use href="#flower"/></svg>
            <p class="lunch__time">매일 11시 ~ 13시</p>
            <h3 class="lunch__title" id="lunch-title">
              <span class="lunch__name">점심할인</span>
              <span class="lunch__rate">10%</span>
            </h3>
            <img class="lunch__art" src="images/character.png" alt="" width="600" height="520" loading="lazy">
            <ul class="checklist">
              <li>빵 종류에만 적용</li>
              <li>매월 1, 2, 3일은 제외</li>
              <li>쿠폰 사용과 중복 불가</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- ⑥ 선물·단체주문 -->
    <section class="section section--tight" id="order" aria-labelledby="order-title">
      <div class="container">
        <div class="order-banner">
          <img class="order-banner__photo" src="images/menu-tuile.jpg" alt="" width="600" height="800" loading="lazy">
          <div class="order-banner__body">
            <p class="eyebrow">GIFT &amp; GROUP ORDER</p>
            <h2 class="order-banner__title" id="order-title">선물·단체주문</h2>
            <p class="order-banner__text">선물·단체주문은 인스타그램 DM으로 편하게 물어봐 주세요</p>
            <a class="btn btn--primary" href="https://ig.me/m/ppangsil_bakery" target="_blank" rel="noopener"><span aria-hidden="true">💌</span> DM 보내기</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑦ 오시는 길 -->
    <section class="section" id="location" aria-labelledby="location-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">VISIT US</p>
          <h2 class="section-title" id="location-title">오시는 길</h2>
        </div>
        <div class="location">
          <div class="location__info">
            <dl class="info-list">
              <div class="info-list__row">
                <dt>주소</dt>
                <dd>
                  <span class="address" data-address>경기도 광주시 태봉로 145-3 우방상가 101호</span>
                  <button type="button" class="btn-copy" data-copy-address>주소 복사</button>
                  <span class="copy-toast" data-copy-toast role="status" aria-live="polite"></span>
                </dd>
              </div>
              <div class="info-list__row"><dt>찾아오기</dt><dd>태전동 KFC 옆 건물</dd></div>
              <div class="info-list__row"><dt>주차</dt><dd>건물 뒤 주차장</dd></div>
              <div class="info-list__row"><dt>영업시간</dt><dd>매일 08:00~21:00</dd></div>
              <div class="info-list__row"><dt>전화</dt><dd><a href="tel:010-5528-6149">010-5528-6149</a></dd></div>
            </dl>
            <p class="location__notice">임시휴무·품절 소식은 <a href="https://www.instagram.com/ppangsil_bakery" target="_blank" rel="noopener">인스타그램</a>에서 알려드려요</p>
            <div class="location__maps">
              <a class="btn btn--ghost" href="https://map.naver.com/p/search/%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EA%B4%91%EC%A3%BC%EC%8B%9C%20%ED%83%9C%EB%B4%89%EB%A1%9C%20145-3" target="_blank" rel="noopener">네이버 지도</a>
              <a class="btn btn--ghost" href="https://map.kakao.com/link/search/%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EA%B4%91%EC%A3%BC%EC%8B%9C%20%ED%83%9C%EB%B4%89%EB%A1%9C%20145-3" target="_blank" rel="noopener">카카오맵</a>
            </div>
          </div>
          <div class="location__map">
            <iframe title="빵실빵실 베이커리 위치 지도" src="https://maps.google.com/maps?q=%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EA%B4%91%EC%A3%BC%EC%8B%9C%20%ED%83%9C%EB%B4%89%EB%A1%9C%20145-3&amp;z=17&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- ⑧ 푸터 -->
  <footer class="site-footer">
    <div class="container site-footer__inner">
      <img class="site-footer__icon" src="images/character.png" alt="" width="600" height="520" loading="lazy">
      <p class="site-footer__name">♥ 빵실빵실 베이커리 Bakery ♥</p>
      <address class="site-footer__info">
        경기도 광주시 태봉로 145-3 우방상가 101호<br>
        <a href="tel:010-5528-6149">010-5528-6149</a> · <a href="https://www.instagram.com/ppangsil_bakery" target="_blank" rel="noopener">@ppangsil_bakery</a>
      </address>
      <p class="site-footer__copy">© 2026 빵실빵실 베이커리</p>
    </div>
  </footer>

  <!-- 휴대폰 하단 고정 바 -->
  <nav class="quick-bar" aria-label="빠른 연락">
    <a href="tel:010-5528-6149"><span aria-hidden="true">📞</span>전화</a>
    <a href="#location"><span aria-hidden="true">📍</span>길찾기</a>
    <a href="https://www.instagram.com/ppangsil_bakery" target="_blank" rel="noopener"><span aria-hidden="true">📷</span>인스타</a>
  </nav>

  <script src="js/schedule.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: 콘텐츠 검증**

Run:
```bash
cd /Users/pparknon/workspace/bread-homepage
grep -o '<li>[^<]*</li>' index.html | wc -l          # 체크리스트 7 + 빵 29 = 36
grep -c 'class="is-signature"' index.html             # 1
grep -c '무화과시골빵' index.html                      # 0
grep -c 'data-bake-badge' index.html                  # 5
python3 -c "import html.parser,sys;p=html.parser.HTMLParser();p.feed(open('index.html').read());print('parsed ok')"
```
Expected: `36`, `1`, `0`, `5`, `parsed ok`. (빵 30종 = 일반 `<li>` 29개 + `is-signature` 1개)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: 홈페이지 마크업과 콘텐츠"
```

---

### Task 4: 스타일 1부 — 기본·헤더·첫 화면·대표 메뉴 (`css/style.css`)

**Files:**
- Create: `css/style.css`

**Interfaces:**
- Consumes: Task 3 클래스명
- Produces: CSS 변수(`--cream --paper --terracotta --crust --ink --line --font-title --font-hand --font-body --radius-lg --radius-md --header-h --quickbar-h`), 공용 클래스 `.container .section .section-head .section-title .eyebrow .btn .btn--primary .btn--ghost`. Task 5가 이 파일 뒤에 이어 붙인다.

- [ ] **Step 1: 로컬 서버 띄우기** (Task 7까지 계속 사용)

Run (background): `cd /Users/pparknon/workspace/bread-homepage && python3 -m http.server 8765`
Expected: `Serving HTTP on :: port 8765`

- [ ] **Step 2: 파일 작성** — `css/style.css`

```css
/* 빵실빵실 베이커리 */

:root {
  --cream: #F8F0DA;
  --paper: #FCF7EA;
  --terracotta: #C0603C;
  --crust: #A54B36;
  --ink: #6E3A28;
  --line: rgba(192, 96, 60, 0.28);
  --font-title: "Jua", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --font-hand: "Gaegu", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;
  --radius-lg: 28px;
  --radius-md: 18px;
  --header-h: 64px;
  --quickbar-h: 64px;
  color-scheme: light;
}

/* ---------- 기본 ---------- */
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }

html {
  scroll-behavior: smooth;
  scroll-padding-top: calc(var(--header-h) + 16px);
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--cream);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.6;
  word-break: keep-all;
  overflow-wrap: break-word;
  padding-bottom: calc(var(--quickbar-h) + env(safe-area-inset-bottom, 0px));
}

h1, h2, h3, p, ul, ol, dl, dd { margin: 0; }
ul, ol { padding: 0; list-style: none; }
img { display: block; max-width: 100%; height: auto; }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--crust); outline-offset: 3px; border-radius: 6px; }

.sprite { position: absolute; width: 0; height: 0; overflow: hidden; }

.container {
  width: 100%;
  max-width: 1080px;
  margin-inline: auto;
  padding-inline: 20px;
}

.skip-link {
  position: absolute;
  top: -60px;
  left: 12px;
  z-index: 100;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--crust);
  color: var(--cream);
  text-decoration: none;
}
.skip-link:focus { top: 12px; }

/* ---------- 공용 ---------- */
.section { padding-block: 72px; }
.section--tight { padding-block: 8px 72px; }

.section-head { text-align: center; margin-bottom: 36px; }

.eyebrow {
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: 0.25em;
  color: var(--crust);
}

.section-title {
  margin-top: 2px;
  font-family: var(--font-title);
  font-weight: 400;
  font-size: clamp(2.25rem, 7vw, 2.9rem);
  line-height: 1.2;
  color: var(--terracotta);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 10px 22px;
  border: 2px solid var(--crust);
  border-radius: 999px;
  font-family: var(--font-title);
  font-size: 1.15rem;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease;
}
.btn:hover { transform: translateY(-2px); }
.btn--primary { background: var(--crust); color: var(--cream); }
.btn--primary:hover { background: var(--ink); border-color: var(--ink); }
.btn--ghost { background: var(--paper); color: var(--crust); }
.btn--ghost:hover { background: #fff; }

/* ---------- ① 헤더 ---------- */
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(248, 240, 218, 0.94);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-bottom: 2px solid var(--line);
}
.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: var(--header-h);
}
.brand { display: flex; align-items: center; gap: 8px; flex-shrink: 0; text-decoration: none; }
.brand__icon { width: 42px; }
.brand__name { display: none; font-family: var(--font-title); font-size: 1.3rem; color: var(--terracotta); }

.site-nav { display: flex; }
.site-nav a {
  padding: 8px 7px;
  border-radius: 999px;
  font-family: var(--font-title);
  font-size: 0.98rem;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
.site-nav a:hover { background: var(--paper); color: var(--crust); }

@media (max-width: 359px) {
  .site-nav a { padding-inline: 4px; font-size: 0.9rem; }
}
@media (min-width: 720px) {
  .brand__name { display: inline; }
  .site-nav { gap: 4px; }
  .site-nav a { padding: 8px 14px; font-size: 1.08rem; }
}

/* ---------- ② 첫 화면 ---------- */
.hero { padding-block: 32px 56px; overflow: hidden; }
.hero__inner { display: grid; gap: 20px; align-items: center; }

.hero__art {
  position: relative;
  isolation: isolate;
  justify-self: center;
  width: min(70vw, 300px);
}
.hero__art::before {
  content: "";
  position: absolute;
  inset: 6% 2% -2%;
  z-index: -1;
  border-radius: 50%;
  background: var(--paper);
  box-shadow: 0 0 0 10px rgba(252, 247, 234, 0.5);
}
.hero__art img { animation: bob 4s ease-in-out infinite; }
@keyframes bob {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}

.hero__text { text-align: center; }
.hero__title {
  margin-top: 4px;
  font-family: var(--font-title);
  font-weight: 400;
  font-size: clamp(3.2rem, 14vw, 5.6rem);
  line-height: 1.05;
  color: var(--terracotta);
}
.hero__lead {
  margin-top: 14px;
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.55rem;
  line-height: 1.35;
  color: var(--ink);
}
.hero__tag {
  display: inline-block;
  margin-top: 14px;
  padding: 4px 20px;
  border-radius: 999px;
  background: var(--crust);
  color: var(--cream);
  font-family: var(--font-title);
  font-size: 1.3rem;
}
.status-badge {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  margin: 16px auto 0;
  padding: 8px 16px;
  border: 2px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
}
.status-badge::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9C8F80;
}
.status-badge.is-open::before {
  background: #3E9B4F;
  box-shadow: 0 0 0 4px rgba(62, 155, 79, 0.2);
}
.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
}

@media (min-width: 720px) {
  .hero { padding-block: 64px 96px; }
  .hero__inner { grid-template-columns: 1.1fr 0.9fr; gap: 48px; }
  .hero__art { order: 1; width: min(100%, 420px); }
  .hero__text { text-align: left; }
  .status-badge { margin-left: 0; }
  .hero__actions { justify-content: flex-start; }
}

/* ---------- ③ 대표 메뉴 ---------- */
.menu-grid { display: grid; gap: 22px; }
@media (min-width: 720px) {
  .menu-grid { grid-template-columns: repeat(3, 1fr); }
}

.menu-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 2px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--paper);
  box-shadow: 0 6px 0 rgba(165, 75, 54, 0.12);
}
.menu-card__photo { position: relative; aspect-ratio: 4 / 3; background: var(--cream); }
.menu-card__photo img { width: 100%; height: 100%; object-fit: cover; }
.menu-card__tag {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--crust);
  color: var(--cream);
  font-family: var(--font-title);
  font-size: 1rem;
}
.menu-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  padding: 18px 20px 22px;
}
.menu-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}
.menu-card__name {
  font-family: var(--font-title);
  font-weight: 400;
  font-size: 1.5rem;
  line-height: 1.3;
  color: var(--ink);
}
.menu-card__name small { font-size: 0.95rem; color: var(--crust); }
.menu-card__price {
  font-family: var(--font-title);
  font-size: 1.5rem;
  color: var(--terracotta);
  white-space: nowrap;
}
.menu-card__desc {
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.28rem;
  line-height: 1.45;
  color: var(--ink);
}
.menu-card__note {
  align-self: flex-start;
  margin-top: auto;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--cream);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--crust);
}
.menu-card__note::before { content: "⏰ "; content: "⏰ " / ""; }

.menu-more {
  margin-top: 28px;
  text-align: center;
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.35rem;
}
.menu-more a { color: var(--crust); text-decoration-thickness: 2px; text-underline-offset: 4px; }
```

- [ ] **Step 3: 화면 확인**

Chrome DevTools MCP로 `http://localhost:8765/` 을 열고 폭 375px, 1280px에서 첫 화면·대표 메뉴를 스크린샷.
Expected:
- 375px: 헤더 한 줄(캐릭터 + 링크 4개)에 넘침 없음, 캐릭터 → 가게 이름 → 부제 → 태그 → 버튼 순으로 가운데 정렬, 메뉴 카드 1열
- 1280px: 헤더에 가게 이름 보임, 첫 화면 좌(글)·우(캐릭터), 메뉴 카드 3열, 사진 비율 4:3로 통일
- Jua·Gaegu 폰트 적용 (DevTools `evaluate_script`: `document.fonts.check('1rem Jua') && document.fonts.check('700 1rem Gaegu')` → `true`)
- `document.documentElement.scrollWidth <= innerWidth` → `true`

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "style: 기본·헤더·첫 화면·대표 메뉴 스타일"
```

---

### Task 5: 스타일 2부 — 빵 시간·할인·단체주문·오시는 길·푸터·하단 바

**Files:**
- Modify: `css/style.css` (파일 끝에 이어 붙이기)

**Interfaces:**
- Consumes: Task 4 CSS 변수·공용 클래스
- Produces: 상태 클래스 (Task 6이 붙임)
  - `.timeline__row.is-now` — 지금 나오는 중 / 방금 나왔어요 (점 깜빡임)
  - `.timeline__row.is-next` — 다음 빵 / 첫 빵 (속 빈 점)
  - `html.has-reveal [data-reveal]` / `[data-reveal].is-visible` — 나타나기 애니메이션

- [ ] **Step 1: 이어 붙이기** — `css/style.css` 끝에 추가

```css
/* ---------- ④ 빵 나오는 시간 ---------- */
.section--terracotta { background: var(--terracotta); color: var(--cream); }
.section-head--on-dark .eyebrow,
.section-head--on-dark .section-title { color: var(--cream); }

.timetable {
  max-width: 880px;
  margin-inline: auto;
  padding: 28px 20px;
  border-radius: var(--radius-lg);
  background: var(--cream);
  color: var(--ink);
}
.timetable__done {
  margin-bottom: 22px;
  padding: 8px 16px;
  border: 2px dashed var(--line);
  border-radius: 999px;
  background: var(--paper);
  text-align: center;
  font-family: var(--font-title);
  font-size: 1.25rem;
  color: var(--crust);
}

.timeline__row { position: relative; padding: 0 0 30px 38px; }
.timeline__row:last-child { padding-bottom: 0; }
.timeline__row::before {
  content: "";
  position: absolute;
  top: 7px;
  left: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--terracotta);
}
.timeline__row::after {
  content: "";
  position: absolute;
  top: 38px;
  bottom: 8px;
  left: 9.5px;
  border-left: 3px dotted var(--terracotta);
}
.timeline__row:last-child::after { display: none; }

.timeline__time {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 10px;
}
.timeline__clock {
  font-family: var(--font-title);
  font-size: 1.8rem;
  line-height: 1.2;
  color: var(--terracotta);
}
.timeline__until { font-family: var(--font-title); font-size: 1.3rem; color: var(--crust); }
.timeline__badge {
  align-self: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--crust);
  color: var(--cream);
  font-family: var(--font-title);
  font-size: 0.95rem;
  white-space: nowrap;
}

.bread-list { display: flex; flex-wrap: wrap; gap: 8px; }
.bread-list li {
  padding: 3px 12px;
  border: 2px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.2rem;
  line-height: 1.35;
  color: var(--ink);
}
.bread-list li.is-signature { border-color: var(--crust); background: var(--crust); color: var(--cream); }
.bread-list li.is-signature small { margin-left: 2px; font-size: 0.85rem; }

.timeline__row.is-now::before { animation: pulse 1.8s ease-in-out infinite; }
.timeline__row.is-now .bread-list li:not(.is-signature) { border-color: var(--terracotta); background: #fff; }
.timeline__row.is-next::before { border: 5px solid var(--terracotta); background: var(--cream); }
.timeline__row.is-next .timeline__badge { background: var(--ink); }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(192, 96, 60, 0.3); }
  50% { box-shadow: 0 0 0 11px rgba(192, 96, 60, 0.06); }
}

.timetable__footer {
  margin-top: 30px;
  text-align: center;
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.55rem;
  line-height: 1.35;
}

@media (min-width: 720px) {
  .timetable { padding: 44px 48px; }
  .timeline__row {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 24px;
    padding-left: 46px;
  }
  .timeline__time { flex-direction: column; align-items: flex-start; gap: 2px; margin-bottom: 0; }
  .timeline__badge { align-self: flex-start; margin-top: 6px; }
  .timeline__clock { font-size: 2.1rem; }
}

/* ---------- ⑤ 할인 혜택 ---------- */
.benefit-grid { display: grid; gap: 32px; }
@media (min-width: 880px) {
  .benefit-grid { grid-template-columns: 1fr 1fr; }
}

.benefit { position: relative; padding: 30px 20px; border-radius: var(--radius-lg); }
.benefit-badge {
  position: absolute;
  top: -16px;
  right: 18px;
  z-index: 2;
  padding: 6px 16px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--cream);
  font-family: var(--font-title);
  font-size: 1.1rem;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.12);
  transform: rotate(4deg);
  animation: wiggle 2.4s ease-in-out infinite;
}
@keyframes wiggle {
  0%, 100% { transform: rotate(4deg); }
  50% { transform: rotate(-3deg); }
}

/* 쿠폰 */
.coupon { --ticket-pad: 22px; border: 2px solid var(--line); background: var(--paper); }
.coupon__when {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 22px;
  font-family: var(--font-title);
  font-size: 1.8rem;
  color: var(--terracotta);
}
.cal {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  width: 64px;
  height: 72px;
  padding-bottom: 6px;
  overflow: hidden;
  border: 3px solid var(--terracotta);
  border-radius: 12px;
  background: var(--cream);
  font-size: 1.5rem;
  line-height: 1;
}
.cal::before {
  content: "♥";
  content: "♥" / "";
  position: absolute;
  inset: 0 0 auto;
  height: 24px;
  background: var(--terracotta);
  color: var(--cream);
  font-size: 0.85rem;
  line-height: 24px;
  text-align: center;
}

.coupon__ticket {
  padding: 26px var(--ticket-pad) 26px;
  border-radius: var(--radius-md);
  background: var(--terracotta);
  color: var(--cream);
  text-align: center;
}
.coupon__label { font-family: var(--font-hand); font-weight: 700; font-size: 1.2rem; letter-spacing: 0.3em; }
.coupon__title {
  position: relative;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 3px dashed rgba(248, 240, 218, 0.65);
  font-weight: 400;
  line-height: 1.1;
}
.coupon__title::before,
.coupon__title::after {
  content: "";
  position: absolute;
  bottom: -16px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--paper);
}
.coupon__title::before { left: calc(-1 * var(--ticket-pad) - 14px); }
.coupon__title::after { right: calc(-1 * var(--ticket-pad) - 14px); }
.coupon__amount { display: block; font-family: var(--font-title); font-size: clamp(3.4rem, 15vw, 4.6rem); }
.coupon__sub { display: block; margin-top: 4px; font-family: var(--font-title); font-size: clamp(1.8rem, 7.5vw, 2.3rem); }

/* 체크 목록 (쿠폰·점심 공용) */
.checklist {
  display: grid;
  gap: 6px;
  width: fit-content;
  margin-inline: auto;
  text-align: left;
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.32rem;
  line-height: 1.4;
  color: var(--ink);
}
.checklist li { position: relative; padding-left: 1.5em; }
.checklist li::before {
  content: "✓";
  content: "✓" / "";
  position: absolute;
  left: 0;
  color: var(--terracotta);
}
.checklist--on-dark { color: var(--cream); }
.checklist--on-dark li::before { color: var(--cream); }

/* 점심할인 */
.lunch {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 4px solid var(--terracotta);
  background: var(--cream);
  text-align: center;
}
.lunch__time {
  padding: 4px 28px;
  border-radius: 999px;
  background: var(--crust);
  color: var(--cream);
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.55rem;
}
.lunch__title { margin-top: 14px; font-weight: 400; line-height: 1; color: var(--terracotta); }
.lunch__name { display: block; font-family: var(--font-title); font-size: clamp(2.6rem, 11vw, 3.6rem); }
.lunch__rate { display: block; margin-top: 6px; font-family: var(--font-title); font-size: clamp(4.2rem, 19vw, 5.8rem); }
.lunch__art { width: 132px; margin: 10px 0 18px; }

.flower { position: absolute; width: 22px; height: 22px; color: var(--terracotta); }
.flower--tl { top: 14px; left: 14px; }
.flower--tr { top: 14px; right: 14px; }
.flower--bl { bottom: 14px; left: 14px; }
.flower--br { right: 14px; bottom: 14px; }

@media (min-width: 720px) {
  .benefit { padding: 38px 32px; }
  .coupon { --ticket-pad: 32px; }
}

/* ---------- ⑥ 선물·단체주문 ---------- */
.order-banner {
  display: grid;
  overflow: hidden;
  border: 2px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--paper);
}
.order-banner__photo { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.order-banner__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  padding: 24px 22px 28px;
}
.order-banner__title {
  font-family: var(--font-title);
  font-weight: 400;
  font-size: 2.1rem;
  line-height: 1.2;
  color: var(--terracotta);
}
.order-banner__text {
  margin-bottom: 8px;
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: 1.38rem;
  line-height: 1.4;
  color: var(--ink);
}
@media (min-width: 720px) {
  .order-banner { grid-template-columns: 320px 1fr; }
  .order-banner__photo { height: 100%; min-height: 250px; aspect-ratio: auto; }
  .order-banner__body { padding: 32px 44px; }
}

/* ---------- ⑦ 오시는 길 ---------- */
.location { display: grid; gap: 24px; }
@media (min-width: 880px) {
  .location { grid-template-columns: 1fr 1fr; }
}

.location__info {
  padding: 24px 22px;
  border: 2px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--paper);
}
.info-list { display: grid; gap: 14px; }
.info-list__row {
  display: grid;
  grid-template-columns: 5.2em 1fr;
  gap: 12px;
  align-items: baseline;
  padding-bottom: 14px;
  border-bottom: 2px dashed var(--line);
}
.info-list__row:last-child { padding-bottom: 0; border-bottom: 0; }
.info-list dt { font-family: var(--font-title); font-size: 1.08rem; color: var(--crust); }
.info-list dd { font-weight: 600; color: var(--ink); }
.info-list dd a { color: var(--ink); text-decoration-thickness: 2px; text-underline-offset: 3px; }
.address { display: block; }
.btn-copy {
  min-height: 36px;
  margin-top: 8px;
  padding: 6px 14px;
  border: 2px solid var(--line);
  border-radius: 999px;
  background: var(--cream);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--crust);
  cursor: pointer;
}
.btn-copy:hover { border-color: var(--crust); }
.copy-toast { margin-left: 8px; font-size: 0.9rem; font-weight: 700; color: #2F7A3D; }

.location__notice {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--cream);
  font-size: 0.95rem;
}
.location__notice::before { content: "📢 "; content: "📢 " / ""; }
.location__notice a { font-weight: 700; color: var(--crust); }

.location__maps { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.location__maps .btn { flex: 1 1 140px; }

.location__map {
  min-height: 320px;
  overflow: hidden;
  border: 2px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--paper);
}
.location__map iframe { display: block; width: 100%; height: 100%; min-height: 320px; border: 0; }

/* ---------- ⑧ 푸터 ---------- */
.site-footer { padding-block: 44px; background: var(--ink); color: var(--cream); text-align: center; }
.site-footer__inner { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.site-footer__icon { width: 72px; }
.site-footer__name { font-family: var(--font-hand); font-weight: 700; font-size: 1.55rem; }
.site-footer__info { font-style: normal; font-size: 0.95rem; line-height: 1.8; }
.site-footer a { color: var(--cream); }
.site-footer__copy { font-size: 0.85rem; opacity: 0.8; }

/* ---------- 휴대폰 하단 고정 바 ---------- */
.quick-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 60;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--crust);
  box-shadow: 0 -4px 16px rgba(110, 58, 40, 0.18);
}
.quick-bar a {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: var(--quickbar-h);
  color: var(--cream);
  font-family: var(--font-title);
  font-size: 1rem;
  text-decoration: none;
}
.quick-bar a + a { border-left: 1px solid rgba(248, 240, 218, 0.25); }
.quick-bar span { font-size: 1.3rem; line-height: 1; }

@media (min-width: 720px) {
  body { padding-bottom: 0; }
  .quick-bar { display: none; }
}

/* ---------- 나타나기 애니메이션 (JS가 html.has-reveal을 붙였을 때만) ---------- */
.has-reveal [data-reveal] {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.has-reveal [data-reveal].is-visible { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 2: 화면 확인**

`http://localhost:8765/` 을 폭 375px·1280px에서 전체 페이지 스크린샷.
Expected:
- 빵 시간: 테라코타 배경 위 크림 카드, 점선으로 이어진 점 5개, 375px에서는 시간 아래로 빵 태그, 1280px에서는 시간(왼쪽)·빵(오른쪽) 2열
- 쿠폰: 달력 3개 한 줄, 테라코타 티켓의 점선 양 끝에 반원 홈이 파여 보임
- 점심할인: 두꺼운 테두리, 네 모서리 꽃(가운데 구멍), 캐릭터
- 1280px에서 쿠폰·점심할인 2열, 오시는 길 정보·지도 2열
- 375px 하단 고정 바 보이고 푸터가 가려지지 않음, 1280px에서는 바 없음
- `document.documentElement.scrollWidth <= innerWidth` → `true` (두 폭 모두)

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "style: 빵 시간·할인·단체주문·오시는 길·푸터 스타일"
```

---

### Task 6: 화면 연결 (`js/main.js`)

**Files:**
- Create: `js/main.js`

**Interfaces:**
- Consumes: `window.Schedule` (Task 2 전체), Task 3 `data-*` 훅, Task 5 상태 클래스 `is-now` / `is-next` / `has-reveal` / `data-reveal` / `is-visible`, Task 4 `.status-badge.is-open`
- Produces: 없음 (최종 소비자)

- [ ] **Step 1: 파일 작성** — `js/main.js`

```js
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
```

- [ ] **Step 2: 시나리오별 확인**

Chrome DevTools MCP로 아래 URL을 차례로 열고, 각 페이지에서 `evaluate_script` 실행:

```js
() => ({
  status: document.querySelector('[data-store-status]').textContent,
  badges: [...document.querySelectorAll('[data-bake-badge]')].map(b => b.hidden ? null : b.textContent),
  done: !document.querySelector('[data-bake-done]').hidden,
  coupon: !document.querySelector('[data-benefit-badge="coupon"]').hidden,
  lunch: !document.querySelector('[data-benefit-badge="lunch"]').hidden,
})
```

| URL (`http://localhost:8765/` 뒤) | status | badges | done | coupon | lunch |
|---|---|---|---|---|---|
| `?now=2026-09-15T07:30` | 오늘 아침 8시에 문 열어요 | `["첫 빵 8시",null,null,null,null]` | false | false | false |
| `?now=2026-09-15T08:20` | 지금 영업 중 · 21시까지 | `["지금 나오는 중","다음 빵",null,null,null]` | false | false | false |
| `?now=2026-09-15T09:35` | 지금 영업 중 · 21시까지 | `[null,"방금 나왔어요","다음 빵",null,null]` | false | false | false |
| `?now=2026-09-15T12:00` | 지금 영업 중 · 21시까지 | 모두 null | true | false | true |
| `?now=2026-09-02T12:00` | 지금 영업 중 · 21시까지 | 모두 null | true | true | false |
| `?now=2026-09-15T22:00` | 오늘 영업 끝 · 내일 아침 8시에 만나요 | 모두 null | false | false | false |
| `?now=잘못된값` | 실제 현재 시각 기준 문구 (에러 없음) | – | – | – | – |

모든 페이지에서 `list_console_messages` 에러 0건.

- [ ] **Step 3: 주소 복사 확인**

`http://localhost:8765/#location` 에서 `주소 복사` 버튼 클릭 → 버튼 옆에 "복사됐어요" 표시, 2초 뒤 사라짐.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: 영업 상태·빵 시간·혜택 배지와 주소 복사 연결"
```

---

### Task 7: 전체 점검과 다듬기

**Files:**
- Modify (필요할 때만): `index.html`, `css/style.css`

**Interfaces:**
- Consumes: Task 1~6 결과물 전체
- Produces: 배포 가능한 상태 (Task 8 전제)

- [ ] **Step 1: 단위 테스트 재실행**

Run: `cd /Users/pparknon/workspace/bread-homepage && node --test tests/schedule.test.js`
Expected: `# fail 0`

- [ ] **Step 2: 폭별 전체 스크린샷**

폭 375, 768, 1280px 각각 `http://localhost:8765/?now=2026-09-02T09:35` 을 열고, 나타나기 애니메이션을 모두 켠 뒤 전체 페이지 스크린샷:

```js
() => { document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible')); return document.documentElement.scrollWidth <= innerWidth; }
```
Expected: `true`. 스크린샷에서 확인:
- 쿠폰 배지("오늘은 쿠폰 받는 날!")가 카드 모서리에 걸쳐 보이고 잘리지 않음
- 빵 시간 9:30 행 점이 깜빡임 스타일, 9:40 행은 속 빈 점
- 768px에서 레이아웃이 어색하게 좁거나 넘치지 않음
- 글자가 겹치거나 한 글자만 다음 줄로 떨어지는 곳 없음

- [ ] **Step 3: 포스터와 나란히 비교**

Read 도구로 `~/Downloads/빵 나오는 시간 v2-selection.png`, `할인쿠폰 배너-selection.png`, `점심할인 포스터-selection.png`를 열어 Step 2 스크린샷과 비교. 색·둥근 느낌·손글씨 느낌이 같은 가게로 보이는지 판단. 제목 폰트가 포스터보다 확연히 딱딱하면 `--font-title` 후보로 `"Do Hyeon"`을 Google Fonts 링크에 추가해 비교하고, 더 가까운 쪽을 남긴다.

- [ ] **Step 4: 링크 확인**

```js
() => [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')))]
```
Expected 목록에 정확히 포함: `tel:010-5528-6149`, `https://www.instagram.com/ppangsil_bakery`, `https://ig.me/m/ppangsil_bakery`, 네이버·카카오 지도 URL, `#top #menu #timetable #benefits #location #main`. 네이버 지도·카카오맵 링크를 새 탭으로 열어 태봉로 145-3 검색 결과가 나오는지 확인.

- [ ] **Step 5: 지도 위치 확인**

`#location` 지도 iframe 스크린샷. 핀이 경기 광주 태전동 태봉로 부근이 아니면: Google 지도에서 "경기도 광주시 태봉로 145-3"을 검색해 URL의 `@위도,경도`를 복사하고, iframe `src`의 `q=` 값을 `위도,경도`로 바꾼다.

- [ ] **Step 6: JS 없이도 정보가 보이는지**

Run: `cd /Users/pparknon/workspace/bread-homepage && grep -o ' hidden>' index.html | wc -l`
Expected: `9` (영업 상태 1 + 빵 배지 5 + 모두 나왔어요 1 + 혜택 배지 2). 이 외에 `hidden`으로 숨긴 콘텐츠가 없어야 한다.

- [ ] **Step 7: 접근성 점검**

Chrome DevTools MCP `lighthouse_audit` (mobile)로 `http://localhost:8765/` 점검.
Expected: Accessibility 90 이상. 대비·alt·버튼 이름 문제가 나오면 Global Constraints의 색 규칙에 맞게 고친다. 콘솔 에러 0건.

- [ ] **Step 8: Commit (수정한 경우만)**

```bash
git add index.html css/style.css
git commit -m "fix: 전체 점검에서 발견한 화면 문제 수정"
```

---

### Task 8: GitHub Pages 배포

**Files:**
- Create: `.nojekyll`
- Modify: `index.html` (`<head>`의 절대 URL)

**Interfaces:**
- Consumes: Task 7까지 커밋된 `main` 브랜치
- Produces: 공개 URL `https://parknoeun.github.io/<저장소 이름>/`

- [ ] **Step 1: 사용자 확인 (외부 공개 작업이므로 필수)**

사용자에게 확인: GitHub 계정 `parknoeun`, 저장소 이름(기본 제안 `ppangsil-bakery`), **공개(public) 저장소**(무료 GitHub Pages 조건 — 코드와 docs 폴더도 공개됨). 승인 전에는 다음 단계로 가지 않는다. 아래 명령의 `ppangsil-bakery`는 사용자가 정한 이름으로 바꾼다.

- [ ] **Step 2: 절대 URL 채우기** — `index.html` `<head>`

`<meta property="og:image" content="images/menu-country-bread.jpg">` 줄을 아래로 교체:

```html
  <meta property="og:url" content="https://parknoeun.github.io/ppangsil-bakery/">
  <meta property="og:image" content="https://parknoeun.github.io/ppangsil-bakery/images/menu-country-bread.jpg">
  <link rel="canonical" href="https://parknoeun.github.io/ppangsil-bakery/">
```

JSON-LD의 `"image": "images/menu-country-bread.jpg",` 줄을 아래로 교체:

```json
    "url": "https://parknoeun.github.io/ppangsil-bakery/",
    "image": "https://parknoeun.github.io/ppangsil-bakery/images/menu-country-bread.jpg",
```

- [ ] **Step 3: Jekyll 끄기 + Commit**

```bash
cd /Users/pparknon/workspace/bread-homepage
touch .nojekyll
git add .nojekyll index.html
git commit -m "chore: GitHub Pages 배포 설정"
```

- [ ] **Step 4: 저장소 생성·푸시**

```bash
gh repo create parknoeun/ppangsil-bakery --public --source=. --remote=origin --push \
  --description "빵실빵실 베이커리 홈페이지"
```
Expected: `✓ Created repository parknoeun/ppangsil-bakery`, `✓ Pushed commits`

- [ ] **Step 5: Pages 켜기**

```bash
gh api -X POST repos/parknoeun/ppangsil-bakery/pages -f 'source[branch]=main' -f 'source[path]=/'
```
실패하면(이미 존재 등) `-X PUT`으로 다시 실행.

- [ ] **Step 6: 빌드 완료 대기**

Run: `gh api repos/parknoeun/ppangsil-bakery/pages/builds/latest --jq .status`
Expected: `built` (몇 분 걸릴 수 있음 — Monitor로 `built`가 될 때까지 30초 간격 확인)

- [ ] **Step 7: 실제 사이트 확인**

```bash
for p in "" css/style.css js/schedule.js js/main.js images/character.png images/menu-country-bread.jpg; do
  printf '%s ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "https://parknoeun.github.io/ppangsil-bakery/$p"
done
```
Expected: 모두 `200`. Chrome으로 `https://parknoeun.github.io/ppangsil-bakery/` 를 375px·1280px로 열어 스크린샷, 콘솔 에러 0건, 영업 상태 배지가 보이는지 확인.

---

## Self-Review 결과

- **스펙 대응:** §2 가게 정보 → Task 3 / §3 ①~⑧·하단 바 → Task 3·4·5 / §4 색·대비·폰트·모티프·애니메이션 → Task 4·5·7 / §5 파일·이미지 → Task 1 (시간 로직을 `js/schedule.js`로 분리한 것은 테스트를 위한 추가 분할) / §6 시간 표시·`?now`·주소 복사 → Task 2·6 / §7 검색·공유 → Task 3·8 / §8 확인 방법 → Task 6·7 / §9 호스팅 → Task 8, 네이버 플레이스 링크 → 사용자 정보 대기(범위 밖 유지)
- **이름 일관성:** `data-store-status`, `data-bake-badge`, `data-bake-done`, `data-benefit-badge`, `data-copy-address`, `data-address`, `data-copy-toast`, `is-now`, `is-next`, `has-reveal`, `data-reveal`, `is-visible`, `Schedule.OPEN/CLOSE/toMinutes/parseSeoulTime/seoulClock/storeStatus/bakeHighlights/todayBenefits` — Task 2·3·4·5·6에서 동일하게 사용
