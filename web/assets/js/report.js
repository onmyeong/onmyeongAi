/*
 * 온명 — 리포트 화면 동작
 * 입력 → 일주 계산 → 리포트 렌더링 → 반지 추천 카드
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG;
  var R = ONM.rings;
  var CONFIG = ONM.CONFIG;
  var esc = R.esc;

  var $ = function (id) { return document.getElementById(id); };
  var ELEM_CLASS = { 목: 'mok', 화: 'hwa', 토: 'to', 금: 'geum', 수: 'su' };

  var state = { result: null, seed: 1 };

  /* ───────────── 시각 셀렉트 채우기 ───────────── */
  var SIJU = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
  (function fillHours() {
    var sel = $('h');
    for (var i = 0; i < 24; i++) {
      var opt = document.createElement('option');
      opt.value = String(i);
      var idx = Math.floor(((i + 1) % 24) / 2);
      opt.textContent = pad(i) + ':00 ~ ' + pad(i) + ':59  (' + SIJU[idx] + ')';
      sel.appendChild(opt);
    }
  })();
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ───────────── 금속 셀렉트 채우기 ───────────── */
  (function fillMetals() {
    var sel = $('f-metal');
    Object.keys(CONFIG.price.metals).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k;
      o.textContent = CONFIG.price.metals[k].label;
      sel.appendChild(o);
    });
  })();

  /* ───────────── 폼 ───────────── */
  $('birth-form').addEventListener('submit', function (e) {
    e.preventDefault();
    run({ year: $('y').value, month: $('m').value, day: $('d').value, hour: $('h').value });
  });

  $('sample-btn').addEventListener('click', function () {
    $('y').value = 1995; $('m').value = 7; $('d').value = 21; $('h').value = '9';
    run({ year: 1995, month: 7, day: 21, hour: 9 });
  });

  function showError(msg) {
    var box = $('form-error');
    box.textContent = msg;
    box.classList.remove('is-hidden');
  }

  function run(input) {
    $('form-error').classList.add('is-hidden');
    var res;
    try {
      res = ONM.getIlju(input);
    } catch (err) {
      showError(err.message);
      return;
    }
    state.result = res;
    state.seed = Math.floor(Math.random() * 100000) + 1;
    renderReport(res);
    renderRings();
    $('report').classList.remove('is-hidden');
    syncUrl(input);
    $('ilju').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function syncUrl(input) {
    var q = 'y=' + input.year + '&m=' + input.month + '&d=' + input.day +
      (input.hour === '' || input.hour === null || input.hour === undefined ? '' : '&h=' + input.hour);
    history.replaceState(null, '', location.pathname + '?' + q);
  }

  /* ───────────── 리포트 렌더링 ───────────── */
  function renderReport(res) {
    var rec = res.record;

    $('r-hanja').textContent = rec.hanja;
    $('r-name').textContent = rec.id;
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

    $('r-pillars').innerHTML =
      pillarCard('일간 · 천간', rec.stem, rec.stemInfo) +
      pillarCard('일지 · 지지', rec.branch, rec.branchInfo);

    $('r-lucky').innerHTML = rec.lucky.map(function (k) {
      return '<span>' + esc(k) + '</span>';
    }).join('');

    $('r-stones').innerHTML = rec.stones.map(function (s) {
      var color = ONM.STONE_COLOR[s[0]] || '#7a8b9c';
      return '<div class="stone-row">' +
        '<span class="stone-dot" style="background:' + color + '"></span>' +
        '<span><b>' + esc(s[0]) + '</b><br><span class="small">' + esc(s[1]) + '</span></span></div>';
    }).join('');

    $('r-ringnote').textContent = rec.ringNote;
    $('r-closing').textContent = rec.closing;

    var src = rec.source === 'draft'
      ? '이 일주의 리포트 문구는 온명 톤으로 작성한 초안입니다.'
      : '리포트 문구 출처: 온명 Ai 자료 (캔바).';
    if (rec.review) src += ' ' + rec.review;
    $('r-source').textContent = src;
  }

  function badge(text, elem, label) {
    return '<span class="badge ' + (ELEM_CLASS[elem] || '') + '">' +
      esc(label) + ' ' + esc(text) + ' · ' + esc(elem) + '</span>';
  }

  function pillarCard(label, ko, info) {
    return '<div class="card">' +
      '<p class="eyebrow">' + esc(label) + '</p>' +
      '<h2 style="margin-bottom:4px">' + esc(info.hanja) + ' <span style="font-size:.62em;color:var(--muted)">' +
      esc(ko) + ' · ' + esc(info.elem) + '</span></h2>' +
      '<h3 style="color:var(--gold-soft)">' + esc(info.title) + '</h3>' +
      '<p style="margin:0;color:var(--muted)">' + esc(info.desc) + '</p></div>';
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
        '<div class="preview">' + R.ringSvg(spec, { size: 200 }) + '</div>' +
        '<div>' +
          '<span class="fit">' + item.fit + '%<small> 적합도</small></span>' +
          '<h3 style="margin:4px 0 2px">' + esc(spec.modelName) + '</h3>' +
          '<div class="meta">' + esc(item.family.label) + ' · ' +
            esc(R.PROFILE_LABEL[spec.profile]) + ' · ' + esc(R.TEXTURE_LABEL[spec.texture]) +
            (spec.stone ? ' · ' + esc(spec.stone) : '') + '</div>' +
        '</div>' +
        '<p class="reason">' + esc(item.reason) + '</p>' +
        '<p class="reason" style="color:var(--muted-2)">' + esc(item.model.desc) + '</p>' +
        '<div class="price">' + R.formatKRW(price.unit) +
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

  $('copy-link').addEventListener('click', function () {
    var btn = this;
    var done = function (ok) {
      btn.textContent = ok ? '복사했습니다' : '복사 실패 — 주소창을 이용해 주세요';
      setTimeout(function () { btn.textContent = '리포트 링크 복사'; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(function () { done(true); }, function () { done(false); });
    } else { done(false); }
  });

  /* ───────────── URL로 들어온 경우 자동 실행 ───────────── */
  (function fromUrl() {
    var p = new URLSearchParams(location.search);
    if (!p.get('y') || !p.get('m') || !p.get('d')) return;
    $('y').value = p.get('y'); $('m').value = p.get('m'); $('d').value = p.get('d');
    if (p.get('h') !== null) $('h').value = p.get('h');
    run({ year: p.get('y'), month: p.get('m'), day: p.get('d'), hour: p.get('h') || '' });
  })();
})();
