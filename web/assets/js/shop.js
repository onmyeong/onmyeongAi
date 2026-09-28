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

  var SCREENS = ['start', 'ilju', 'traits', 'advice', 'rings'];
  var LABELS = ['생일', '일주', '성향', '강점', '반지'];

  var state = { at: 0, res: null, name: '', seed: 1 };

  /* ───────────── 화면 넘기기 ───────────── */

  function paintSteps() {
    $('s-steps').innerHTML = SCREENS.map(function (k, i) {
      return '<li class="' + (i === state.at ? 'is-on' : (i < state.at ? 'is-done' : '')) + '">' +
        esc(LABELS[i]) + '</li>';
    }).join('');
  }

  function go(n) {
    if (n < 0 || n >= SCREENS.length) return;
    if (n > 0 && !state.res) return;              // 생일을 아직 안 넣었으면 못 넘어갑니다
    state.at = n;
    var all = doc.querySelectorAll('.shop-screen');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('is-on', i === n);
    $('s-prev').disabled = n === 0;
    $('s-next').disabled = n === SCREENS.length - 1;
    $('s-next').textContent = n === SCREENS.length - 2 ? '반지 보기 →' : '다음 →';
    paintSteps();
    $('s-stage').scrollTop = 0;
  }

  /* ───────────── 상담 시작 ───────────── */

  function start() {
    var err = $('s-error');
    var input = {
      name: $('s-name').value,
      year: $('s-y').value, month: $('s-m').value, day: $('s-d').value,
      hour: '', minute: ''
    };
    var res;
    try { res = ONM.getIlju(input); }
    catch (e) {
      err.textContent = e.message || '생년월일을 다시 확인해 주세요.';
      err.classList.remove('is-hidden');
      return;
    }
    err.classList.add('is-hidden');
    state.res = res;
    state.name = givenName(input.name);
    state.seed = Math.floor(Math.random() * 100000) + 1;
    render();
    go(1);
  }

  function givenName(full) {
    var n = String(full || '').trim().replace(/\s+/g, '');
    if (!n) return '';
    if (/^[가-힣]{3}$/.test(n)) return n.slice(1);
    if (/^[가-힣]{4}$/.test(n)) return n.slice(2);
    return n;
  }

  /* ───────────── 내용 채우기 ───────────── */

  function render() {
    var rec = state.res.record;
    var who = state.name ? state.name + ' 님' : state.res.id + ' 일주';
    $('s-who').textContent = who;

    // 1. 일주
    // 십이지 아이콘은 지지(띠 글자) 하나를 받습니다
    var icon = ONM.zodiacIcon ? ONM.zodiacIcon(rec.branch, { size: 190, label: rec.branch + ' 띠' }) : '';
    $('s-zodiac').innerHTML = icon || '<div class="shop-zodiac-fallback">' + esc(rec.branch) + '</div>';
    if (ONM.zodiacColor) $('s-zodiac').style.color = ONM.zodiacColor(rec.branch) || '';
    $('s-tagline').textContent = (rec.tagline || '').replace(/\s*\/\s*/g, ' · ');
    $('s-ilju').innerHTML = esc(state.res.id) + ' <small>' + esc(state.res.hanja) + '</small>';
    $('s-keywords').textContent = rec.keywords || '';
    var el = ONM.reading ? ONM.reading.solo(rec) : null;
    $('s-chips').innerHTML = [
      ['일간', rec.stem + ' · ' + rec.stemInfo.elem],
      ['일지', rec.branch + ' · ' + rec.branchInfo.elem],
      ['자리', el && el.sipsin ? el.sipsin.name : ''],
      ['단계', el && el.stage ? el.stage.name : '']
    ].filter(function (c) { return c[1]; }).map(function (c) {
      return '<span class="shop-chip"><b>' + esc(c[0]) + '</b>' + esc(c[1]) + '</span>';
    }).join('');
    $('s-summary').textContent = rec.summary || '';

    // 2. 성향
    $('s-traits').innerHTML = (rec.traits || []).map(function (t) {
      return '<div class="shop-card"><h3>' + esc(t[0]) + '</h3><p>' + esc(t[1]) + '</p></div>';
    }).join('');

    // 3. 강점 · 조언 · 행운
    $('s-strength').textContent = rec.strength || '';
    $('s-advice').textContent = rec.advice || '';
    $('s-lucky').innerHTML = '<span class="shop-lucky-label">행운의 말</span>' +
      (rec.lucky || []).map(function (w) { return '<span class="shop-word">' + esc(w) + '</span>'; }).join('');

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

  function studioLink(x) {
    return 'studio.html?' + R.specToQuery(x.spec) +
      '&ilju=' + encodeURIComponent(state.res.id) +
      (state.name ? '&n=' + encodeURIComponent(state.name) : '');
  }

  /* ───────────── 손님 폰으로 보내기 ───────────── */

  function reportUrl() {
    var base = location.origin + location.pathname.replace(/[^/]*$/, 'index.html');
    if (!state.res) return base;
    var s = state.res.solar;
    return base + '?y=' + s.year + '&m=' + s.month + '&d=' + s.day +
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
  ['s-name', 's-y', 's-m', 's-d'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') start(); });
  });
  $('s-prev').addEventListener('click', function () { go(state.at - 1); });
  $('s-next').addEventListener('click', function () { go(state.at + 1); });
  $('s-reshuffle').addEventListener('click', function () {
    state.seed = Math.floor(Math.random() * 100000) + 1;
    renderRings();
  });
  $('s-home').addEventListener('click', function () {
    if (state.res && !global.confirm('상담을 처음부터 다시 시작할까요?')) return;
    state.res = null; state.name = '';
    ['s-name', 's-y', 's-m', 's-d'].forEach(function (id) { $(id).value = ''; });
    $('s-who').textContent = '';
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
