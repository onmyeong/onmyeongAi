/*
 * 온명 — 리포트 화면 동작
 * ------------------------------------------------------------------
 * 처음에 개인 / 궁합 중 하나를 고르고,
 *   개인  : 입력 → 일주 계산 → 리포트 → 반지 추천
 *   궁합  : 두 사람 입력 → 각자의 일주 → 두 일주의 관계 → 커플링 추천
 * 두 경우 모두 결과를 링크와 이미지 카드로 공유할 수 있습니다.
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG;
  var R = ONM.rings;
  var CONFIG = ONM.CONFIG;
  var esc = R.esc;

  var $ = function (id) { return document.getElementById(id); };
  var ELEM_CLASS = { 목: 'mok', 화: 'hwa', 토: 'to', 금: 'geum', 수: 'su' };

  var state = { mode: 'solo', result: null, resultB: null, compat: null, seed: 1 };

  /* ───────────── 시각 셀렉트 채우기 ───────────── */
  var SIJU = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
  ['h', 'h2'].forEach(function (id) {
    var sel = $(id);
    for (var i = 0; i < 24; i++) {
      var opt = document.createElement('option');
      opt.value = String(i);
      var idx = Math.floor(((i + 1) % 24) / 2);
      opt.textContent = pad(i) + ':00 ~ ' + pad(i) + ':59  (' + SIJU[idx] + ')';
      sel.appendChild(opt);
    }
  });
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ───────────── 금속 셀렉트 채우기 ───────────── */
  (function fillMetals() {
    var sel = $('f-metal');
    var keys = Object.keys(CONFIG.price.metals);
    keys.forEach(function (k) {
      var o = document.createElement('option');
      o.value = k;
      o.textContent = CONFIG.price.metals[k].label;
      sel.appendChild(o);
    });
    // 제작 소재가 하나뿐이면 고를 것이 없으므로 선택칸을 숨긴다
    if (keys.length < 2) sel.closest('.field').classList.add('is-hidden');
  })();

  /* ───────────── 개인 / 궁합 고르기 ───────────── */
  function setMode(mode, opts) {
    opts = opts || {};
    state.mode = mode === 'couple' ? 'couple' : 'solo';
    var couple = state.mode === 'couple';

    $('mode-solo').setAttribute('aria-pressed', String(!couple));
    $('mode-couple').setAttribute('aria-pressed', String(couple));
    $('person-b').classList.toggle('is-hidden', !couple);
    $('leg-a').classList.toggle('is-hidden', !couple);

    ['y2', 'm2', 'd2'].forEach(function (id) { $(id).required = couple; });

    $('submit-btn').textContent = couple ? '두 사람 궁합 보기' : '내 일주 리포트 보기';
    $('sample-btn').textContent = couple ? '예시 커플로 둘러보기' : '예시로 둘러보기';
    $('hero-title').innerHTML = couple
      ? '두 사람의 일주가 만나는 자리,<br>그리고 함께 낄 반지.'
      : '당신의 일주(日柱)를 찾고,<br>그 기운에 맞는 반지를 만나보세요.';
    $('hero-lead').innerHTML = couple
      ? '일주는 사주에서 <b>\'나 자신\'</b>을 가리킵니다. 두 사람의 일주를 마주 놓으면 ' +
        '천간의 합과 충, 지지의 육합·삼합·충까지 관계의 결이 드러납니다. ' +
        '온명은 그 결을 읽어 드리고, 두 분 모두에게 어울리는 커플링을 골라 3D로 바로 맞춰 볼 수 있게 합니다.'
      : '태어난 날의 천간과 지지, 즉 <b>일주</b>는 사주에서 \'나 자신\'을 가리킵니다. ' +
        '온명은 60갑자 일주별 리포트를 읽어주고, 그 일주의 오행과 키워드에 어울리는 ' +
        '반지 디자인을 여러 갈래로 추천합니다. 마음에 드는 디자인은 바로 3D로 돌려보며 ' +
        '두께와 높이를 직접 맞춘 뒤 커스텀 주문까지 이어집니다.';

    if (opts.clear !== false) {
      $('report').classList.add('is-hidden');
      $('couple').classList.add('is-hidden');
      $('form-error').classList.add('is-hidden');
    }
  }

  $('mode-solo').addEventListener('click', function () { setMode('solo'); });
  $('mode-couple').addEventListener('click', function () { setMode('couple'); });

  /* ───────────── 폼 ───────────── */
  $('birth-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.mode === 'couple') runCouple(readPerson(''), readPerson('2'));
    else runSolo(readPerson(''));
  });

  function readPerson(suffix) {
    return {
      year: $('y' + suffix).value,
      month: $('m' + suffix).value,
      day: $('d' + suffix).value,
      hour: $('h' + suffix).value
    };
  }

  function fillPerson(suffix, p) {
    $('y' + suffix).value = p.year;
    $('m' + suffix).value = p.month;
    $('d' + suffix).value = p.day;
    $('h' + suffix).value = p.hour === undefined || p.hour === null ? '' : p.hour;
  }

  $('sample-btn').addEventListener('click', function () {
    var a = { year: 1995, month: 7, day: 21, hour: 9 };
    fillPerson('', a);
    if (state.mode === 'couple') {
      var b = { year: 1994, month: 3, day: 9, hour: 21 };
      fillPerson('2', b);
      runCouple(a, b);
    } else {
      runSolo(a);
    }
  });

  function showError(msg) {
    var box = $('form-error');
    box.textContent = msg;
    box.classList.remove('is-hidden');
  }

  function calc(input, who) {
    try {
      return ONM.getIlju(input);
    } catch (err) {
      showError((who ? who + ' — ' : '') + err.message);
      return null;
    }
  }

  /* ───────────── 개인 리포트 실행 ───────────── */
  function runSolo(input) {
    $('form-error').classList.add('is-hidden');
    var res = calc(input);
    if (!res) return;

    state.result = res;
    state.resultB = null;
    state.compat = null;
    state.seed = Math.floor(Math.random() * 100000) + 1;

    renderReport(res);
    renderRings();
    $('couple').classList.add('is-hidden');
    $('report').classList.remove('is-hidden');
    resetCards();
    syncUrl({ mode: 'solo', a: input });
    $('ilju').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ───────────── 궁합 리포트 실행 ───────────── */
  function runCouple(inputA, inputB) {
    $('form-error').classList.add('is-hidden');
    var a = calc(inputA, '첫 번째 분');
    if (!a) return;
    var b = calc(inputB, '두 번째 분');
    if (!b) return;

    state.result = a;
    state.resultB = b;
    state.seed = Math.floor(Math.random() * 100000) + 1;
    state.compat = ONM.compat.compare(a.record, b.record);

    renderCouple(a, b, state.compat);
    $('report').classList.add('is-hidden');
    $('couple').classList.remove('is-hidden');
    resetCards();
    syncUrl({ mode: 'couple', a: inputA, b: inputB });
    $('couple-top').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function syncUrl(o) {
    var q = [];
    if (o.mode === 'couple') q.push('mode=couple');
    q.push('y=' + o.a.year, 'm=' + o.a.month, 'd=' + o.a.day);
    if (o.a.hour !== '' && o.a.hour !== null && o.a.hour !== undefined) q.push('h=' + o.a.hour);
    if (o.b) {
      q.push('y2=' + o.b.year, 'm2=' + o.b.month, 'd2=' + o.b.day);
      if (o.b.hour !== '' && o.b.hour !== null && o.b.hour !== undefined) q.push('h2=' + o.b.hour);
    }
    history.replaceState(null, '', location.pathname + '?' + q.join('&'));
  }

  /* ───────────── 개인 리포트 렌더링 ───────────── */
  function renderReport(res) {
    var rec = res.record;

    // 일주 색 지표(천간) + 십이지 아이콘 — 병자면 빨간 동그라미에 쥐
    var color = ONM.zodiacColor(rec);
    var report = $('report');
    report.style.setProperty('--accent', color.solid);
    report.style.setProperty('--accent-ink', color.ink);
    report.style.setProperty('--accent-tint', color.tint);

    $('r-seal').innerHTML = ONM.zodiacSvg(rec.branch, {
      label: rec.branchInfo.animal + ' — ' + rec.id + ' 일주'
    });
    $('r-name').textContent = rec.id + ' (' + rec.hanja + ')';
    $('r-animal').textContent = ONM.iljuPhrase(rec);
    $('r-tagline').textContent = rec.tagline;
    $('r-keywords').textContent = rec.keywords;
    $('r-summary').textContent = rec.summary;
    document.title = '온명 · ' + rec.id + '(' + rec.hanja + ') 일주 리포트';

    $('r-elements').innerHTML =
      badge(rec.stem + ' ' + rec.stemInfo.hanja, rec.stemInfo.elem, '일간') +
      badge(rec.branch + ' ' + rec.branchInfo.hanja, rec.branchInfo.elem, '일지') +
      '<span class="badge">60갑자 ' + (rec.index + 1) + '번째</span>';

    $('r-notes').innerHTML = res.notes.map(function (n) {
      return '<div class="notice">' + esc(n) + '</div>';
    }).join('');

    $('r-traits').innerHTML = rec.traits.map(function (t) {
      return '<div class="card trait"><h3>' + esc(t[0]) + '</h3><p>' + esc(t[1]) + '</p></div>';
    }).join('');

    $('r-strength').textContent = rec.strength;
    $('r-advice').textContent = rec.advice;
    var adviceCard = $('r-advice').closest('.card');
    var blueStem = rec.stem === '임' || rec.stem === '계';
    adviceCard.classList.toggle('tone-blue', !blueStem);
    adviceCard.classList.toggle('tone-warm', blueStem);

    $('r-pillars').innerHTML =
      pillarCard('일간 · 천간', rec.stem, rec.stemInfo) +
      pillarCard('일지 · 지지', rec.branch, rec.branchInfo);

    $('r-lucky').innerHTML = rec.lucky.map(function (k) {
      return '<span>' + esc(k) + '</span>';
    }).join('');

    // 천연석은 캐보션(둥글게 갈아 올린 알)으로만 만듭니다
    $('r-stones').innerHTML = rec.stones.map(function (s) {
      return '<div class="stone-row">' +
        ONM.stoneIcon(s[0], { size: 46, cut: 'cabochon', label: s[0] }) +
        '<span><b>' + esc(s[0]) + '</b><br><span class="small">' + esc(s[1]) +
        ' · 캐보션</span></span></div>';
    }).join('');

    $('r-ringnote').textContent = rec.ringNote;
    $('r-closing').textContent = rec.closing;
    $('r-source').textContent = sourceLine(rec);
  }

  function sourceLine(rec) {
    var src = rec.source === 'draft'
      ? '이 일주의 리포트 문구는 온명 톤으로 작성한 초안입니다.'
      : '리포트 문구 출처: 온명 Ai 자료 (캔바).';
    if (rec.review) src += ' ' + rec.review;
    return src;
  }

  function badge(text, elem, label) {
    return '<span class="badge ' + (ELEM_CLASS[elem] || '') + '">' +
      esc(label) + ' ' + esc(text) + ' · ' + esc(elem) + '</span>';
  }

  /** 오행별 색 — 천간 색 지표와 같은 계열로 맞춘다 */
  var ELEM_COLOR = { 목: '#548235', 화: '#e15b4c', 토: '#d9a92b', 금: '#7f8894', 수: '#2b7cc9' };

  function pillarCard(label, ko, info) {
    return '<div class="card">' +
      '<p class="eyebrow">' + esc(label) + '</p>' +
      '<h2 style="margin-bottom:4px">' + esc(info.hanja) + ' <span style="font-size:.6em;color:var(--muted)">' +
      esc(ko) + ' · ' + esc(info.elem) + '</span></h2>' +
      '<h3 style="color:' + (ELEM_COLOR[info.elem] || 'var(--accent-ink)') + '">' + esc(info.title) + '</h3>' +
      '<p style="margin:0">' + esc(info.desc) + '</p></div>';
  }

  /* ───────────── 반지 추천 카드 ───────────── */
  function renderRings() {
    if (!state.result) return;
    var rec = state.result.record;
    var opts = {
      seed: state.seed,
      mood: $('f-mood').value,
      volume: $('f-volume').value,
      metal: $('f-metal').value,
      limit: parseInt($('f-count').value, 10) || 6
    };
    var list = R.recommend(rec, opts);

    $('r-rings').innerHTML = list.map(function (item) {
      var spec = item.spec;
      var price = R.estimatePrice(spec, 1);
      var q = R.specToQuery(spec);
      return '<article class="card ring-card">' +
        '<div class="preview-box stage-bg">' + R.ringSvg(spec, { size: 200 }) + '</div>' +
        '<div>' +
          '<span class="fit">' + item.fit + '%<small> 적합도</small></span>' +
          '<h3 style="margin:4px 0 2px">' + esc(spec.modelName) + '</h3>' +
          '<div class="meta">' + esc(item.family.label) + ' · ' +
            esc(R.PROFILE_LABEL[spec.profile]) + ' · ' + esc(R.textureLabel(spec)) +
            (spec.stone ? ' · ' + esc(spec.stone) : '') + '</div>' +
        '</div>' +
        '<p class="reason">' + esc(item.reason) + '</p>' +
        '<p class="reason" style="color:var(--muted-2)">' + esc(item.model.desc) + '</p>' +
        '<div class="price">' + R.priceText(price, 'unit') +
          ' <span class="meta">· 폭 ' + spec.width + 'mm / 두께 ' + spec.thickness + 'mm</span></div>' +
        '<div class="btn-row no-print">' +
          '<a class="btn btn-sm btn-primary" href="studio.html?' + q + '">3D로 조절하기</a>' +
          '<a class="btn btn-sm" href="order.html?' + q + '">주문 상담</a>' +
        '</div>' +
      '</article>';
    }).join('');

    // 주문 페이지 바로가기에도 1순위 디자인을 실어 보낸다
    if (list[0]) $('go-order').href = 'order.html?' + R.specToQuery(list[0].spec);
  }

  ['f-mood', 'f-volume', 'f-metal', 'f-count'].forEach(function (id) {
    $(id).addEventListener('change', renderRings);
  });

  $('reshuffle').addEventListener('click', function () {
    state.seed = Math.floor(Math.random() * 100000) + 1;
    renderRings();
  });

  /* ───────────── 궁합 리포트 렌더링 ───────────── */
  function renderCouple(resA, resB, cp) {
    var a = resA.record, b = resB.record;
    var ca = ONM.zodiacColor(a), cb = ONM.zodiacColor(b);
    var box = $('couple');
    box.style.setProperty('--accent', ca.solid);
    box.style.setProperty('--accent-ink', ca.ink);
    box.style.setProperty('--accent-tint', ca.tint);
    box.style.setProperty('--accent-b', cb.solid);

    document.title = '온명 · ' + a.id + ' × ' + b.id + ' 일주 궁합';

    $('c-seal-a').innerHTML = ONM.zodiacSvg(a.branch, { label: a.id + ' 일주' });
    $('c-seal-b').innerHTML = ONM.zodiacSvg(b.branch, { label: b.id + ' 일주' });
    $('c-seal-b').style.background = cb.solid;
    $('c-name-a').textContent = a.id + ' (' + a.hanja + ')';
    $('c-name-b').textContent = b.id + ' (' + b.hanja + ')';
    $('c-phrase-a').textContent = ONM.iljuPhrase(a);
    $('c-phrase-b').textContent = ONM.iljuPhrase(b);

    $('c-score').textContent = cp.score;
    $('c-ring').style.setProperty('--v', cp.score);
    $('c-grade').textContent = cp.grade;
    $('c-headline').textContent = cp.headline;
    $('c-elementline').textContent = cp.elementLine;
    $('c-stemline').textContent = cp.stemLine;
    $('c-branchline').textContent = cp.branchLine;
    $('c-good').innerHTML = cp.good.map(li).join('');
    $('c-care').innerHTML = cp.care.map(li).join('');

    $('c-nickname').textContent = cp.nickname;

    // 세 갈래 점수 — 어디가 잘 맞고 어디가 덜한지 한눈에
    $('c-axes').innerHTML = cp.axes.map(function (ax) {
      return '<div class="axis-row">' +
        '<span class="num">' + ax.score + '</span>' +
        '<b>' + esc(ax.name) + '</b>' +
        '<span>' + esc(ax.note) + '</span>' +
        '<div class="axis-bar"><i style="width:' + ax.score + '%"></i></div>' +
      '</div>';
    }).join('');

    // 케미 포인트
    $('c-chem').innerHTML = cp.chemistry.map(function (c) {
      return '<div class="card chem-card">' +
        '<p class="eyebrow">' + esc(c.label) + '</p>' +
        '<h3>' + esc(c.title) + '</h3>' +
        '<p>' + esc(c.text) + '</p>' +
      '</div>';
    }).join('');

    // 십신 — 서로가 서로를 어떤 자리로 보는가
    var josa = ONM.compat.josa;
    $('c-sipsin').innerHTML =
      sipsinRow(a.id + '에게 ' + josa.eun(b.id), cp.sipsinA) +
      sipsinRow(b.id + '에게 ' + josa.eun(a.id), cp.sipsinB);

    $('c-yy-label').textContent = cp.yinYang.label;
    $('c-yy-text').textContent = cp.yinYang.text;

    var notes = resA.notes.map(function (n) { return '첫 번째 분 — ' + n; })
      .concat(resB.notes.map(function (n) { return '두 번째 분 — ' + n; }));
    $('c-notes').innerHTML = notes.map(function (n) {
      return '<div class="notice">' + esc(n) + '</div>';
    }).join('');

    $('c-ringnote').textContent = '두 분 각자의 추천 순위를 합치고, 짝을 맞추기 좋은 형태와 ' +
      '두 사람을 잇는 ' + cp.bridge + '의 결에 힘을 실어 골랐습니다. ' +
      '같은 디자인으로 폭과 두께만 다르게 가도 좋고, 한 쌍으로 나란히 맞춰도 좋습니다.';

    renderPairs(a, b, cp);

    $('c-each').innerHTML = [eachCard(a, ca, ''), eachCard(b, cb, '2')].join('');

    $('c-closing').textContent = '두 사람의 결을 한 쌍의 반지에 담아 드립니다.';
  }

  function li(text) { return '<li>' + esc(text) + '</li>'; }

  function sipsinRow(who, sip) {
    return '<div class="sipsin-row">' +
      '<span class="who">' + esc(who) + '</span>' +
      '<b>' + esc(sip.name) + ' — ' + esc(sip.title) + '</b>' +
      '<p>' + esc(sip.text) + '</p></div>';
  }

  function eachCard(rec, color, suffix) {
    var q = 'y=' + $('y' + suffix).value + '&m=' + $('m' + suffix).value + '&d=' + $('d' + suffix).value +
      ($('h' + suffix).value === '' ? '' : '&h=' + $('h' + suffix).value);
    return '<div class="card">' +
      '<div class="seal-line">' +
        '<span class="seal-mini" style="background:' + color.solid + '">' +
          ONM.zodiacSvg(rec.branch, { label: rec.id + ' 일주' }) + '</span>' +
        '<span><b>' + esc(rec.id + ' (' + rec.hanja + ')') + '</b><br>' +
          '<span class="small">' + esc(ONM.iljuPhrase(rec)) + '</span></span>' +
      '</div>' +
      '<p style="margin:14px 0 0">' + esc(rec.summary) + '</p>' +
      '<div class="chips" style="margin-top:12px">' +
        badge(rec.stem + ' ' + rec.stemInfo.hanja, rec.stemInfo.elem, '일간') +
        badge(rec.branch + ' ' + rec.branchInfo.hanja, rec.branchInfo.elem, '일지') +
      '</div>' +
      '<div class="btn-row no-print" style="margin-top:16px">' +
        '<a class="btn btn-sm" href="./?' + q + '">이 분의 개인 리포트 보기</a>' +
      '</div></div>';
  }

  function renderPairs(a, b, cp) {
    var pairs = ONM.compat.coupleRings(a, b, { bridge: cp.bridge, seed: state.seed, limit: 4 });

    $('c-pairs').innerHTML = pairs.map(function (p) {
      var priceA = R.estimatePrice(p.specA, 1);
      var priceB = R.estimatePrice(p.specB, 1);
      // 한쪽이라도 값이 안 나오는 치수면 한 쌍 값도 상담으로 넘깁니다
      var pairConsult = priceA.consult || priceB.consult;
      var pairTotal = pairConsult ? null : Math.round((priceA.unit + priceB.unit) *
        (1 - CONFIG.price.couplePairDiscount) / 1000) * 1000;
      /* 커플링은 두 분 반지를 한 사람씩 차례로 맞춥니다.
       * 첫 번째 분 반지부터 시작하고, 두 번째 분의 일주를 함께 실어 보냅니다. */
      var qa = 'couple=1&step=a&iljuB=' + encodeURIComponent(b.id) + '&' + R.specToQuery(p.specA);
      // 두 사양이 눈으로 같으면 미리보기를 하나만 보여 줍니다
      var previews = p.sameLook
        ? '<div class="pair-previews is-single">' +
            '<figure><div class="preview-box stage-bg">' + R.ringSvg(p.specA, { size: 200 }) + '</div>' +
              '<figcaption>두 분 같은 사양 · 호수만 각자 맞춤</figcaption></figure>' +
          '</div>'
        : '<div class="pair-previews">' +
            '<figure><div class="preview-box stage-bg">' + R.ringSvg(p.specA, { size: 170 }) + '</div>' +
              '<figcaption>' + esc(a.id) + ' · ' + esc(p.noteA) + '<br>' +
                p.specA.width + ' × ' + p.specA.thickness + 'mm</figcaption></figure>' +
            '<figure><div class="preview-box stage-bg">' + R.ringSvg(p.specB, { size: 170 }) + '</div>' +
              '<figcaption>' + esc(b.id) + ' · ' + esc(p.noteB) + '<br>' +
                p.specB.width + ' × ' + p.specB.thickness + 'mm</figcaption></figure>' +
          '</div>';

      return '<article class="card pair-card">' + previews +
        '<div>' +
          '<span class="fit">' + p.fit + '%<small> 어울림</small></span>' +
          '<h3 style="margin:4px 0 2px">' + esc(p.model.name) + '</h3>' +
          '<div class="meta">' + esc(p.family.label) + ' · ' +
            esc(R.PROFILE_LABEL[p.specA.profile]) + ' · ' + esc(R.textureLabel(p.specA)) + '</div>' +
          '<p class="reason" style="margin-top:10px">' + esc(p.reason) + '</p>' +
          '<p class="reason" style="color:var(--muted)">' + esc(p.model.desc) + '</p>' +
          '<div class="price" style="margin-top:8px">' +
            (pairConsult
              ? '상담 후 확정 <span class="meta">· ' + esc(pairConsult) + '</span>'
              : '한 쌍 ' + R.formatKRW(pairTotal) + ' <span class="meta">· 한 개 ' +
                (priceA.unit === priceB.unit
                  ? R.formatKRW(priceA.unit)
                  : R.formatKRW(priceA.unit) + ' / ' + R.formatKRW(priceB.unit)) +
                ' (한 쌍 할인 적용)</span>') +
          '</div>' +
          '<div class="btn-row no-print" style="margin-top:12px">' +
            '<a class="btn btn-sm btn-primary" href="studio.html?' + qa + '">두 반지 각각 맞추기</a>' +
            '<a class="btn btn-sm" href="order.html?' + R.specToQuery(p.specA, { qty: 2 }) +
              '">바로 주문 상담</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    if (pairs[0]) {
      $('c-go-order').href = 'studio.html?couple=1&step=a&iljuB=' + encodeURIComponent(b.id) +
        '&' + R.specToQuery(pairs[0].specA);
      $('c-go-order').textContent = '두 반지 각각 맞추고 주문하기';
    }
  }

  /* ───────────── 공유하기 ───────────── */
  function resetCards() {
    ['card-solo-box', 'card-couple-box'].forEach(function (id) {
      var el = $(id);
      el.innerHTML = '';
      el.classList.add('is-hidden');
    });
  }

  /** 첫 번째 추천 반지 — 공유 카드에 함께 싣습니다 */
  function firstSpec() {
    var card = $('r-rings').querySelector('a.btn-primary');
    if (!card) return null;
    return R.specFromQuery(card.getAttribute('href').split('?')[1] || '');
  }

  function soloPayload() {
    var rec = state.result.record;
    return {
      title: '온명 · ' + rec.id + ' 일주',
      text: rec.id + '(' + rec.hanja + ') — ' + ONM.iljuPhrase(rec) + '. ' + rec.keywords,
      url: location.href
    };
  }

  function couplePayload() {
    var a = state.result.record, b = state.resultB.record, cp = state.compat;
    return {
      title: '온명 · ' + a.id + ' × ' + b.id + ' 궁합',
      text: a.id + ' × ' + b.id + ' — ' + cp.grade + ' ' + cp.score + '점. ' + cp.headline,
      url: location.href
    };
  }

  function makeCard(kind, btn, boxId) {
    if (!ONM.share || !state.result) return;
    ONM.share.flash(btn, '카드를 만드는 중…');
    var job = kind === 'couple'
      ? ONM.share.coupleCard({ a: state.result.record, b: state.resultB.record, result: state.compat, url: location.href })
      : ONM.share.soloCard({ record: state.result.record, spec: firstSpec(), url: location.href });

    job.then(function (blob) {
      if (!blob) throw new Error('카드를 만들지 못했습니다');
      var name = kind === 'couple'
        ? 'onmyeong-' + state.result.record.id + '-' + state.resultB.record.id + '.png'
        : 'onmyeong-' + state.result.record.id + '.png';

      var box = $(boxId);
      box.innerHTML = '<img alt="온명 결과 카드" src="' + URL.createObjectURL(blob) + '">' +
        '<p class="small" style="margin-top:8px">이미지를 길게 눌러 저장하거나, 아래 버튼으로 내려받으세요.</p>';
      box.classList.remove('is-hidden');
      ONM.share.download(blob, name);
      ONM.share.flash(btn, '저장했습니다');
    }).catch(function () {
      ONM.share.flash(btn, '카드 저장에 실패했어요 — 인쇄를 이용해 주세요');
    });
  }

  $('share-solo').addEventListener('click', function () {
    var btn = this, p = soloPayload();
    if (!ONM.share.canShare()) { ONM.share.copyLink(p.url, btn); return; }
    // 카드 이미지까지 함께 보낼 수 있으면 같이 보냅니다
    ONM.share.soloCard({ record: state.result.record, spec: firstSpec(), url: p.url })
      .then(function (blob) { p.file = ONM.share.toFile(blob, 'onmyeong.png'); })
      .catch(function () {})
      .then(function () { ONM.share.share(p, btn); });
  });

  $('share-couple').addEventListener('click', function () {
    var btn = this, p = couplePayload();
    if (!ONM.share.canShare()) { ONM.share.copyLink(p.url, btn); return; }
    ONM.share.coupleCard({ a: state.result.record, b: state.resultB.record, result: state.compat, url: p.url })
      .then(function (blob) { p.file = ONM.share.toFile(blob, 'onmyeong-couple.png'); })
      .catch(function () {})
      .then(function () { ONM.share.share(p, btn); });
  });

  $('card-solo').addEventListener('click', function () { makeCard('solo', this, 'card-solo-box'); });
  $('card-couple').addEventListener('click', function () { makeCard('couple', this, 'card-couple-box'); });

  $('copy-link').addEventListener('click', function () { ONM.share.copyLink(location.href, this); });
  $('copy-link-c').addEventListener('click', function () { ONM.share.copyLink(location.href, this); });

  $('try-couple').addEventListener('click', function () {
    setMode('couple');
    $('input').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { $('y2').focus(); }, 420);
  });

  /* ───────────── URL로 들어온 경우 자동 실행 ───────────── */
  (function fromUrl() {
    var p = new URLSearchParams(location.search);
    var couple = p.get('mode') === 'couple' && p.get('y2') && p.get('m2') && p.get('d2');
    setMode(couple ? 'couple' : 'solo', { clear: false });

    if (!p.get('y') || !p.get('m') || !p.get('d')) return;
    var a = { year: p.get('y'), month: p.get('m'), day: p.get('d'), hour: p.get('h') || '' };
    fillPerson('', a);

    if (couple) {
      var b = { year: p.get('y2'), month: p.get('m2'), day: p.get('d2'), hour: p.get('h2') || '' };
      fillPerson('2', b);
      runCouple(a, b);
    } else {
      runSolo(a);
    }
  })();
})();
