/*
 * 온명 — 매장 상담 화면
 * ------------------------------------------------------------------
 * 손님 앞에 태블릿을 놓고 같이 보는 화면입니다. 집에서 혼자 보는 리포트와
 * 목적이 다릅니다.
 *   · 글자가 크고, 한 화면에 한 가지만 둡니다 (설명하면서 넘기기 좋게)
 *   · 스크롤 대신 넘기기 — 어디까지 왔는지 위에 점으로 보입니다
 *   · 사주 먼저 보고 반지로 넘어가는 순서 (매장 상담 흐름 그대로)
 *   · 마지막에 QR 하나로 손님 폰에 그대로 넘겨 드립니다
 *
 * 내용은 리포트와 같은 자료(ILJU · rings · reading)를 그대로 씁니다.
 * 여기서 새로 만드는 것은 "보여주는 방식"뿐입니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG;
  var doc = global.document;
  var R = ONM.rings;
  function $(id) { return doc.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* 상담은 두 갈래입니다.
   *   solo — 혼자 오신 분: 일주를 읽고 반지로 넘어갑니다
   *   pair — 둘이 오신 분: 궁합을 보고 커플링으로 넘어갑니다
   * 화면은 한 벌만 두고, 어느 갈래냐에 따라 보여 줄 화면만 골라 넘깁니다. */
  var FLOW = {
    solo: {
      screens: ['start', 'ilju', 'letters', 'traits', 'advice', 'energy', 'rings'],
      labels: ['생일', '일주', '두 글자', '성향', '강점', '기운', '반지'],
      last: '반지 보기 →'
    },
    pair: {
      screens: ['start', 'pair', 'axes', 'mix', 'play', 'crings'],
      labels: ['생일', '두 사람', '점수', '풀이', '함께', '커플링'],
      last: '커플링 보기 →'
    }
  };

  var state = { mode: 'solo', at: 0, res: null, resB: null, cp: null, name: '', name2: '', seed: 1 };

  function flow() { return FLOW[state.mode]; }
  function ready() { return state.mode === 'pair' ? !!state.cp : !!state.res; }

  /* ───────────── 화면 넘기기 ───────────── */

  function paintSteps() {
    var f = flow();
    $('s-steps').innerHTML = f.labels.map(function (label, i) {
      return '<li class="' + (i === state.at ? 'is-on' : (i < state.at ? 'is-done' : '')) + '">' +
        esc(label) + '</li>';
    }).join('');
  }

  function go(n) {
    var f = flow();
    if (n < 0 || n >= f.screens.length) return;
    if (n > 0 && !ready()) return;                // 생일을 아직 안 넣었으면 못 넘어갑니다
    state.at = n;
    var want = f.screens[n];
    var all = doc.querySelectorAll('.shop-screen');
    for (var i = 0; i < all.length; i++) {
      all[i].classList.toggle('is-on', all[i].getAttribute('data-screen') === want);
    }
    $('s-prev').disabled = n === 0;
    $('s-next').disabled = n === f.screens.length - 1;
    $('s-next').textContent = n === f.screens.length - 2 ? f.last : '다음 →';
    paintSteps();
    $('s-stage').scrollTop = 0;
  }

  /* ───────────── 혼자 / 둘이 고르기 ───────────── */

  function setMode(mode) {
    state.mode = mode;
    var pair = mode === 'pair';
    $('s-mode-solo').classList.toggle('is-on', !pair);
    $('s-mode-pair').classList.toggle('is-on', pair);
    $('s-second').classList.toggle('is-hidden', !pair);
    $('s-tag-a').classList.toggle('is-hidden', !pair);
    $('s-people').classList.toggle('is-pair', pair);     // 두 분을 나란히 놓습니다
    $('s-center').classList.toggle('is-wide', pair);
    $('s-start').textContent = pair ? '궁합 보기' : '일주 보기';
    $('s-error').classList.add('is-hidden');
    // 갈래가 바뀌면 앞서 본 상담은 지웁니다 (손님이 바뀐 것이므로)
    state.res = null; state.resB = null; state.cp = null;
    $('s-who').textContent = '';
    resetAccent();
    go(0);
  }

  /* ───────────── 상담 시작 ───────────── */

  function read(ids) {
    return ONM.getIlju({
      name: $(ids[0]).value,
      year: $(ids[1]).value, month: $(ids[2]).value, day: $(ids[3]).value,
      hour: '', minute: ''
    });
  }

  function start() {
    var err = $('s-error');
    var a, b;
    try {
      a = read(['s-name', 's-y', 's-m', 's-d']);
      if (state.mode === 'pair') b = read(['s-name2', 's-y2', 's-m2', 's-d2']);
    } catch (e) {
      err.textContent = e.message || '생년월일을 다시 확인해 주세요.';
      err.classList.remove('is-hidden');
      return;
    }
    err.classList.add('is-hidden');
    state.res = a;
    state.resB = b || null;
    state.name = givenName($('s-name').value);
    state.name2 = state.mode === 'pair' ? givenName($('s-name2').value) : '';
    state.seed = Math.floor(Math.random() * 100000) + 1;

    if (state.mode === 'pair') {
      state.cp = ONM.compat.compare(a.record, b.record, { a: state.name, b: state.name2 });
      renderCouple();
    } else {
      state.cp = null;
      render();
    }
    go(1);
  }

  function givenName(full) {
    var n = String(full || '').trim().replace(/\s+/g, '');
    if (!n) return '';
    if (/^[가-힣]{3}$/.test(n)) return n.slice(1);
    if (/^[가-힣]{4}$/.test(n)) return n.slice(2);
    return n;
  }

  /* ───────────── 손님마다 달라지는 색 ─────────────
   * 일주마다 천간 색이 정해져 있습니다 (병이면 빨강, 계면 연한 파랑).
   * 그 색은 도장 · 칩 · 패널 같은 '내용'에만 물립니다. 버튼과 진행 표시 같은
   * 화면 틀은 늘 온명의 쑥색입니다 — 손님이 바뀔 때마다 매장 화면 전체가
   * 빨갛게 변하면 곤란하니까요. */

  function paintAccent(rec) {
    var color = ONM.zodiacColor(rec);
    var app = doc.querySelector('.shop-app');
    app.style.setProperty('--accent', color.solid);
    app.style.setProperty('--accent-ink', color.ink);
    app.style.setProperty('--accent-tint', color.tint);
  }

  function resetAccent() {
    var app = doc.querySelector('.shop-app');
    ['--accent', '--accent-ink', '--accent-tint'].forEach(function (k) {
      app.style.removeProperty(k);          // 처음 화면은 온명의 쑥색으로 돌아갑니다
    });
  }

  /* ───────────── 내용 채우기 ───────────── */

  function render() {
    var rec = state.res.record;
    var who = state.name ? state.name + ' 님' : state.res.id + ' 일주';
    $('s-who').textContent = who;

    paintAccent(rec);

    // 1. 일주 — 색 동그라미 안에 십이지 아이콘
    $('s-seal').innerHTML = ONM.zodiacSvg(rec.branch, {
      label: rec.branchInfo.animal + ' — ' + state.res.id + ' 일주'
    });
    $('s-tagline').textContent = (rec.tagline || '').replace(/\s*\/\s*/g, ' · ');
    $('s-ilju').innerHTML = esc(state.res.id) + ' <small>' + esc(state.res.hanja) + '</small>';
    $('s-animal').textContent = ONM.iljuPhrase ? ONM.iljuPhrase(rec) : '';
    $('s-keywords').textContent = rec.keywords || '';

    var el = ONM.reading ? ONM.reading.solo(rec) : null;
    $('s-chips').innerHTML = [
      ['일간', rec.stem + '(' + rec.stemInfo.hanja + ') · ' + rec.stemInfo.elem + ' — ' + rec.stemInfo.title],
      ['일지', rec.branch + '(' + rec.branchInfo.hanja + ') · ' + rec.branchInfo.elem +
        ' — ' + rec.branchInfo.animal + ', ' + rec.branchInfo.title]
    ].map(function (c) {
      return '<span class="shop-chip"><b>' + esc(c[0]) + '</b>' + esc(c[1]) + '</span>';
    }).join('');

    // 2. 두 글자 — 천간과 지지를 한 장씩 풀어 읽습니다
    $('s-stem-ch').textContent = rec.stem + ' ' + rec.stemInfo.hanja;
    $('s-stem-title').textContent = rec.stemInfo.title + ' · ' + rec.stemInfo.elem;
    $('s-stem-long').textContent = rec.stemInfo.long || rec.stemInfo.desc || '';
    $('s-branch-ch').textContent = rec.branch + ' ' + rec.branchInfo.hanja;
    $('s-branch-title').textContent = rec.branchInfo.animal + ' · ' + rec.branchInfo.title +
      ' · ' + rec.branchInfo.elem;
    $('s-branch-long').textContent = rec.branchInfo.long || rec.branchInfo.desc || '';
    $('s-summary').textContent = rec.summary || '';
    $('s-flow').innerHTML = el && el.flow
      ? '<b>' + esc(el.flow.title) + '</b> ' + esc(el.flow.body) : '';

    // 2. 성향
    $('s-traithead').textContent = (state.name ? state.name + ' 님은' : '이 일주는') + ' 이런 결을 가지셨습니다';
    $('s-traits').innerHTML = (rec.traits || []).map(function (t) {
      return '<div class="shop-card"><h3>' + esc(t[0]) + '</h3><p>' + esc(t[1]) + '</p></div>';
    }).join('');

    // 3. 강점 · 조언 · 자리별 조언
    $('s-strength').textContent = rec.strength || '';
    $('s-advice').textContent = rec.advice || '';
    $('s-life').innerHTML = (el && el.life ? el.life : []).map(function (L) {
      return '<div class="shop-life-row"><b>' + esc(L.label) + '</b><span>' + esc(L.text) + '</span></div>';
    }).join('');

    // 4. 타고난 기운 — 십신 · 십이운성 · 오행 배속 · 맞는 일주
    $('s-enhead').textContent = (state.name ? state.name + ' 님이' : '이 일주가') + ' 타고난 기운';
    if (el && el.sipsin) {
      $('s-sipsin-name').textContent = el.sipsin.name + ' — ' + el.sipsin.short;
      $('s-sipsin-body').textContent = el.sipsin.body || el.sipsin.title || '';
    }
    if (el && el.stage) {
      $('s-stage-name').textContent = el.stage.name + ' — ' + (el.stage.title || '') +
        ' (12단계 중 ' + el.stage.order + '번째)';
      $('s-stage-body').textContent = (el.stage.body || '') +
        (el.stage.tip ? ' ' + el.stage.tip : '');
    }
    var E = el && el.elem ? el.elem.stem.info : null;
    $('s-elem').innerHTML = !E ? '' : [
      ['어울리는 색', E.color], ['방향', E.dir], ['숫자', E.num],
      ['계절', E.season], ['하루 중', E.hour]
    ].map(function (c) {
      return '<div class="shop-elem-cell"><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div>';
    }).join('');
    // matches 는 { best: [...], ... } 모양입니다
    var best = (el && el.matches && el.matches.best) ? el.matches.best : [];
    $('s-match').innerHTML = best.slice(0, 4).map(function (m) {
      return '<span class="shop-match-one">' + esc(m.id) +
        '<em>' + (m.score != null ? m.score : '') + '</em></span>';
    }).join('');

    renderRings();
  }

  function renderRings() {
    var rec = state.res.record;
    $('s-ringhead').textContent = (state.name ? state.name + ' 님' : '이 일주') + '께 어울리는 반지';
    $('s-ringnote').textContent = rec.ringNote || '';
    var list = R.recommend(rec, { seed: state.seed, limit: 3 });
    $('s-rings').innerHTML = list.map(function (x, i) {
      var m = x.model;
      return '<a class="shop-ring" href="' + esc(studioLink(x)) + '">' +
        '<span class="shop-ring-art">' + R.ringSvg(x.spec, { size: 190 }) + '</span>' +
        '<span class="shop-ring-fit">' + (x.fit != null ? x.fit + '%' : '') + '</span>' +
        '<b>' + esc(m.name) + '</b>' +
        '<em>' + esc(R.FAMILIES[m.family].label) + '</em>' +
        '<span class="shop-ring-why">' + esc(x.reason || '') + '</span>' +
        '<span class="shop-ring-go">3D로 보기 →</span>' +
      '</a>';
    }).join('');
  }

  /* ───────────── 궁합 (둘이 보기) ─────────────
   * 자료는 온라인 궁합 리포트와 같은 compat.compare() 를 그대로 씁니다.
   * 여기서 다른 것은 한 화면에 한 가지만 두고 넘긴다는 점뿐입니다. */

  function renderCouple() {
    var A = state.res, B = state.resB, cp = state.cp;
    var ra = A.record, rb = B.record;
    var who = (state.name || A.id) + ' × ' + (state.name2 || B.id);
    $('s-who').textContent = who;

    // 화면 색은 첫 번째 분의 천간 색을 씁니다
    paintAccent(ra);

    // C1. 두 사람과 점수
    /* 도장은 각자의 천간 색을 씁니다 — 두 분이 한눈에 구분되도록 */
    sealFor('c-seal-a', ra, A.id);
    sealFor('c-seal-b', rb, B.id);
    $('c-name-a').textContent = state.name ? state.name + ' 님' : A.id + ' 일주';
    $('c-name-b').textContent = state.name2 ? state.name2 + ' 님' : B.id + ' 일주';
    $('c-ilju-a').textContent = A.id + ' (' + A.hanja + ')';
    $('c-ilju-b').textContent = B.id + ' (' + B.hanja + ')';
    $('c-phrase-a').textContent = ONM.iljuPhrase ? ONM.iljuPhrase(ra) : '';
    $('c-phrase-b').textContent = ONM.iljuPhrase ? ONM.iljuPhrase(rb) : '';
    $('c-dial').style.setProperty('--v', cp.score);
    $('c-score').textContent = cp.score;
    $('c-grade').textContent = cp.grade;
    $('c-headline').textContent = cp.headline;
    $('c-nick').innerHTML = '<b>' + esc(cp.nickname) + '</b>' + esc(cp.elementLine || '');

    // 한눈에 보는 세 축 (자세한 건 다음 화면에서)
    $('c-axes-mini').innerHTML = (cp.axes || []).map(function (ax) {
      return '<span class="shop-chip"><b>' + esc(ax.name.split(' · ')[0]) + '</b>' + ax.score + '점</span>';
    }).join('');

    // C2. 세 갈래 점수
    $('c-axes').innerHTML = (cp.axes || []).map(function (ax) {
      return '<div class="shop-axis">' +
        '<div class="shop-axis-top"><b>' + esc(ax.name) + '</b><span>' + ax.score + '</span></div>' +
        '<div class="shop-axis-bar"><i style="width:' + Math.max(4, Math.min(100, ax.score)) + '%"></i></div>' +
        '<p>' + esc(ax.note) + '</p>' +
      '</div>';
    }).join('');
    $('c-yy-label').textContent = cp.yinYang ? '음양 — ' + cp.yinYang.label : '';
    $('c-yy-text').textContent = cp.yinYang ? cp.yinYang.text : '';

    // C3. 글자 풀이와 서로를 보는 자리(십신)
    $('c-lines').innerHTML = [
      ['윗글자', cp.stemLine], ['아랫글자', cp.branchLine], ['오행', cp.elementLine]
    ].filter(function (L) { return L[1]; }).map(function (L) {
      return '<div class="shop-life-row"><b>' + esc(L[0]) + '</b><span>' + esc(L[1]) + '</span></div>';
    }).join('');
    $('c-sipsin').innerHTML = [
      [$('c-name-a').textContent + '이 보는 상대', cp.sipsinA],
      [$('c-name-b').textContent + '이 보는 상대', cp.sipsinB]
    ].filter(function (x) { return x[1]; }).map(function (x) {
      return '<div class="shop-panel shop-panel-soft">' +
        '<h2>' + esc(x[0]) + ' — ' + esc(x[1].name) + '</h2>' +
        '<p><b>' + esc(x[1].title || '') + '</b> ' + esc(x[1].text || '') + '</p>' +
      '</div>';
    }).join('');

    // C4. 함께 지낼 때
    function list(items) {
      return (items || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') ||
        '<li>특별히 짚을 것이 없는, 무난한 자리입니다.</li>';
    }
    $('c-good').innerHTML = list(cp.good);
    $('c-care').innerHTML = list(cp.care);
    $('c-chem').innerHTML = (cp.chemistry || []).map(function (c) {
      return '<div class="shop-card"><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p></div>';
    }).join('');

    renderCoupleRings();
  }

  function sealFor(id, rec, iljuId) {
    var el = $(id);
    el.innerHTML = ONM.zodiacSvg(rec.branch, { label: rec.branchInfo.animal + ' — ' + iljuId + ' 일주' });
    var c = ONM.zodiacColor(rec);
    var one = el.parentNode;            // .shop-pair-one — 이름과 일주 글자도 같은 색으로
    one.style.setProperty('--accent', c.solid);
    one.style.setProperty('--accent-ink', c.ink);
    one.style.setProperty('--accent-tint', c.tint);
  }

  function renderCoupleRings() {
    var cp = state.cp, ra = state.res.record, rb = state.resB.record;
    $('c-ringhead').textContent = (state.name && state.name2)
      ? state.name + ' 님과 ' + state.name2 + ' 님의 커플링'
      : '두 분께 어울리는 커플링';
    $('c-ringnote').textContent = cp.bridge
      ? '두 분을 잇는 기운은 ' + cp.bridge + '입니다. 그 결에 맞는 디자인을 먼저 올렸습니다. ' +
        '같은 디자인이라도 폭과 두께는 두 분을 갈라 잡아 드립니다.'
      : '두 분 각자의 추천을 합쳐 높은 순으로 골랐습니다.';

    var list = ONM.compat.coupleRings(ra, rb, { limit: 3, seed: state.seed, bridge: cp.bridge });
    $('c-rings').innerHTML = list.map(function (x) {
      return '<a class="shop-ring" href="' + esc(coupleStudioLink(x)) + '">' +
        '<span class="shop-ring-pair">' +
          '<span class="shop-ring-art">' + R.ringSvg(x.specA, { size: 150 }) + '</span>' +
          '<span class="shop-ring-art">' + R.ringSvg(x.specB, { size: 150 }) + '</span>' +
        '</span>' +
        '<span class="shop-ring-fit">' + (x.fit != null ? x.fit + '%' : '') + '</span>' +
        '<b>' + esc(x.model.name) + '</b>' +
        '<em>' + esc(x.family.label) + '</em>' +
        '<span class="shop-ring-why">' + esc(x.reason || '') + '</span>' +
        '<span class="shop-ring-note">' +
          esc(($('c-name-a').textContent) + ' ' + x.noteA + ' · ' + ($('c-name-b').textContent) + ' ' + x.noteB) +
        '</span>' +
        '<span class="shop-ring-go">두 반지 맞춰 보기 →</span>' +
      '</a>';
    }).join('');
  }

  /* 커플링은 스튜디오의 "한 사람씩" 흐름으로 넘깁니다.
   * 첫 번째 분 반지를 맞추면 두 번째 분 차례가 이어집니다. */
  function coupleStudioLink(x) {
    return 'studio.html?shop=1&couple=1&step=a' +
      '&iljuB=' + encodeURIComponent(state.resB.id) +
      '&ilju=' + encodeURIComponent(state.res.id) +
      (state.name ? '&n=' + encodeURIComponent(state.name) : '') +
      '&' + R.specToQuery(x.specA);
  }

  function studioLink(x) {
    /* shop=1 — 넘어간 화면에서도 온라인 메뉴 없이 상담 화면으로 바로 돌아옵니다 */
    return 'studio.html?shop=1&' + R.specToQuery(x.spec) +
      '&ilju=' + encodeURIComponent(state.res.id) +
      (state.name ? '&n=' + encodeURIComponent(state.name) : '');
  }

  /* ───────────── 손님 폰으로 보내기 ───────────── */

  function reportUrl() {
    var base = location.origin + location.pathname.replace(/[^/]*$/, 'index.html');
    if (!state.res) return base;
    if (state.mode === 'pair' && state.resB) {
      // 궁합은 두 일주를 그대로 싣습니다 (손님 폰에서 바로 같은 리포트가 열립니다)
      return base + '?mode=couple&a=' + encodeURIComponent(state.res.id) +
        '&b=' + encodeURIComponent(state.resB.id) +
        (state.name ? '&n=' + encodeURIComponent(state.name) : '') +
        (state.name2 ? '&n2=' + encodeURIComponent(state.name2) : '');
    }
    var d = state.res.solar;
    return base + '?y=' + d.year + '&m=' + d.month + '&d=' + d.day +
      (state.name ? '&n=' + encodeURIComponent(state.name) : '');
  }

  function openSheet() {
    var url = reportUrl();
    $('s-url').value = url;
    var code = ONM.qr ? ONM.qr.svg(url, 260) : null;
    $('s-qr').innerHTML = code ||
      '<p class="small">주소가 길어 QR을 만들지 못했습니다. 아래 링크를 복사해 보내 주세요.</p>';
    $('s-sheet').classList.remove('is-hidden');
  }

  /* ───────────── 붙이기 ───────────── */

  $('s-start').addEventListener('click', start);
  ['s-name', 's-y', 's-m', 's-d', 's-name2', 's-y2', 's-m2', 's-d2'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') start(); });
  });
  $('s-mode-solo').addEventListener('click', function () { setMode('solo'); });
  $('s-mode-pair').addEventListener('click', function () { setMode('pair'); });
  $('c-reshuffle').addEventListener('click', function () {
    state.seed = Math.floor(Math.random() * 100000) + 1;
    renderCoupleRings();
  });
  $('s-prev').addEventListener('click', function () { go(state.at - 1); });
  $('s-next').addEventListener('click', function () { go(state.at + 1); });
  $('s-reshuffle').addEventListener('click', function () {
    state.seed = Math.floor(Math.random() * 100000) + 1;
    renderRings();
  });
  $('s-home').addEventListener('click', function () {
    if (state.res && !global.confirm('상담을 처음부터 다시 시작할까요?')) return;
    state.res = null; state.resB = null; state.cp = null; state.name = ''; state.name2 = '';
    ['s-name', 's-y', 's-m', 's-d', 's-name2', 's-y2', 's-m2', 's-d2']
      .forEach(function (id) { $(id).value = ''; });
    $('s-who').textContent = '';
    resetAccent();           // 앞 손님 색이 남아 있지 않도록 되돌립니다
    go(0);
  });
  $('s-send').addEventListener('click', function () { if (state.res) openSheet(); });
  $('s-close').addEventListener('click', function () { $('s-sheet').classList.add('is-hidden'); });
  $('s-sheet').addEventListener('click', function (e) {
    if (e.target === $('s-sheet')) $('s-sheet').classList.add('is-hidden');
  });
  $('s-copy').addEventListener('click', function () {
    var b = $('s-copy');
    var done = function () { b.textContent = '복사했습니다'; setTimeout(function () { b.textContent = '링크 복사'; }, 1600); };
    if (global.navigator.clipboard) global.navigator.clipboard.writeText($('s-url').value).then(done, function () { $('s-url').select(); });
    else { $('s-url').select(); doc.execCommand('copy'); done(); }
  });
  doc.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') go(state.at + 1);
    if (e.key === 'ArrowLeft') go(state.at - 1);
    if (e.key === 'Escape') $('s-sheet').classList.add('is-hidden');
  });

  go(0);
})(window);
