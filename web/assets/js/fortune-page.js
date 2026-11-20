/*
 * 온명 — 2027 신년운세 화면
 * ------------------------------------------------------------------
 * 입력 → saju-full.js 로 여덟 글자 → fortune-2027.js 로 해석 → 화면에 그립니다.
 * 주소에 ?y=1995&m=7&d=21&h=9 처럼 생일이 실려 오면 바로 결과를 보여 줍니다.
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG;
  var F = ONM.fortune2027;
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var ELEM_CLASS = { 목: 'mok', 화: 'hwa', 토: 'to', 금: 'geum', 수: 'su' };
  var ELEM_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

  /* 시각 셀렉트 — 일주 리포트와 같은 모양 */
  var SIJU = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
  (function () {
    var sel = $('fx-h');
    for (var h = 0; h < 24; h++) {
      var o = document.createElement('option');
      o.value = String(h);
      o.textContent = pad(h) + ':00 ~ ' + pad(h) + ':59  (' + SIJU[Math.floor(((h + 1) % 24) / 2)] + ')';
      sel.appendChild(o);
    }
  })();

  function givenName(full) {
    var n = String(full || '').trim().replace(/\s+/g, '');
    if (!n) return '';
    if (/^[가-힣]{3}$/.test(n)) return n.slice(1);
    if (/^[가-힣]{4}$/.test(n)) return n.slice(2);
    return n;
  }

  function showError(msg) {
    var box = $('fx-error');
    box.textContent = msg;
    box.classList.toggle('is-hidden', !msg);
  }

  var state = {};

  function run(input) {
    var saju;
    try {
      saju = ONM.saju.getSaju(input);
    } catch (e) {
      showError(e.message || '생년월일을 다시 확인해 주세요.');
      return;
    }
    showError('');
    state.input = input;
    state.name = givenName(input.name);
    var f = F.analyze(saju);
    render(f);
    $('fx-report').classList.remove('is-hidden');
    syncUrl(input);
    setTimeout(function () { $('fx-report').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  }

  /* ───────────── 그리기 ───────────── */
  function render(f) {
    var s = f.saju, day = s.pillars.day;
    var rec = ONM.ILJU[day.id];

    // 일주 색으로 화면 포인트를 맞춥니다
    if (rec && ONM.zodiacColor) {
      var c = ONM.zodiacColor(rec);
      var box = $('fx-report');
      box.style.setProperty('--accent', c.solid);
      box.style.setProperty('--accent-ink', c.ink);
      box.style.setProperty('--accent-tint', c.tint);
    }
    $('fx-seal').innerHTML = ONM.zodiacSvg ? ONM.zodiacSvg('미', { label: '2027 정미년 — 양' }) : '';
    $('fx-person').textContent = state.name ? state.name + ' 님의 2027년' : '나의 2027년';
    $('fx-day').textContent = day.id + ' (' + day.hanja + ') 일주';
    $('fx-day-sub').textContent = rec && ONM.iljuPhrase ? ONM.iljuPhrase(rec) : '';
    $('fx-title').textContent = f.story.title;
    $('fx-overall').textContent = f.story.overall;
    document.title = '온명 반지공방 · ' + (state.name ? state.name + ' 님의 ' : '') + '2027 신년운세';

    // 한 해 흐름 점수 — 다섯 칸
    var dots = '';
    for (var k = 1; k <= 5; k++) {
      dots += '<span class="fx-dot' + (f.score >= k ? ' on' : (f.score >= k - 0.5 ? ' half' : '')) + '"></span>';
    }
    $('fx-score').innerHTML = '<span class="small">2027년 흐름</span>' + dots +
      '<span class="small">' + scoreWord(f.score) + '</span>';

    $('fx-notes').innerHTML = s.notes.map(function (n) { return '<div class="notice">' + esc(n) + '</div>'; }).join('');

    renderPillars(f);
    renderElems(f);

    $('fx-strength-title').textContent = f.strengthText.label;
    $('fx-strength').textContent = f.strengthText.body;
    $('fx-fav').innerHTML = '<span class="badge ' + ELEM_CLASS[f.fav] + '">' + f.fav + ' ' + ELEM_HANJA[f.fav] + '</span> ' + esc(f.favWhy);

    // 2027년이 들어오는 방식 — 천간 정, 지지 미, 십이운성
    $('fx-meet').innerHTML =
      meetCard('하늘 · 정(丁)', f.yStemGod, '드러나는 흐름', F.GROUP_WORD[F.GROUP[f.yStemGod]]) +
      meetCard('땅 · 미(未)', f.yBranchGod, '생활의 바탕', F.GROUP_WORD[F.GROUP[f.yBranchGod]]) +
      '<div class="card"><p class="eyebrow">십이운성</p><h3>' + esc(f.stage) + '</h3><p style="margin:0">' +
        esc(f.me + '(' + ONM.saju.STEM_HANJA[ONM.saju.STEMS.indexOf(f.me)] + ') 일간이 미(未)에서 ' + f.stage + '. ' + f.stageLine) + '</p></div>';

    var rels = [f.match.text].concat(f.stemRels.map(function (r) { return r.text; }), f.relations.map(function (r) { return r.text; }));
    if (!f.relations.length && !f.stemRels.length) rels.push('원국의 지지와 미(未) 사이에 크게 부딪치거나 묶이는 자리가 없습니다. 해의 기운이 무난하게 스며드는 한 해입니다.');
    $('fx-rel').innerHTML = rels.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');

    $('fx-areas').innerHTML =
      areaCard('일 · 사업', f.story.work) +
      areaCard('재물', f.story.money) +
      areaCard('연애 · 관계', f.story.love + relLove(f)) +
      areaCard('올해 해 볼 한 가지', f.action);
    $('fx-health').textContent = f.story.health + (f.healthExtra ? ' ' + f.healthExtra : '');

    renderMonths(f);
    renderLucky(f);

    $('fx-closing').textContent = '2027년, ' + f.fav + '의 기운을 손끝에 두세요. ' + f.luck.stones[0] + '처럼 작은 것 하나가 한 해의 균형을 잡아 줍니다.';
    var q = '?y=' + state.input.year + '&m=' + state.input.month + '&d=' + state.input.day +
      (state.input.hour !== '' ? '&h=' + state.input.hour : '') + (state.name ? '&n=' + encodeURIComponent(state.name) : '');
    $('fx-go-ring').href = './' + q;
  }

  function scoreWord(v) {
    if (v >= 4.5) return '순풍이 크게 부는 해';
    if (v >= 3.5) return '흐름이 내 편인 해';
    if (v >= 2.5) return '고르게 흘러가는 해';
    if (v >= 1.5) return '속도를 조절하는 해';
    return '안으로 다지는 해';
  }

  function meetCard(eyebrow, god, sub, word) {
    return '<div class="card"><p class="eyebrow">' + esc(eyebrow) + '</p><h3>' + esc(god) + ' <span class="small">· ' + esc(sub) + '</span></h3>' +
      '<p style="margin:0">' + esc(word) + '</p></div>';
  }
  function areaCard(title, body) {
    return '<div class="card trait"><h3>' + esc(title) + '</h3><p>' + esc(body) + '</p></div>';
  }
  function relLove(f) {
    var r = f.relations.filter(function (x) { return x.role === '일주'; })[0];
    if (!r) return '';
    if (r.type === '합') return ' 배우자 자리(일지)가 해와 합을 이루니, 가까운 사람과의 사이가 한층 단단해집니다.';
    if (r.type === '충') return ' 배우자 자리(일지)가 해와 충을 이루니, 관계에 변화가 오기 쉽습니다. 이사·동거·결혼처럼 "자리를 옮기는" 일로 풀리면 오히려 좋습니다.';
    return ' 배우자 자리(일지)에 작은 엇갈림이 있으니, 서운한 일은 쌓아 두지 말고 그때그때 이야기하세요.';
  }

  function renderPillars(f) {
    var s = f.saju;
    var cols = [['시', s.pillars.hour], ['일', s.pillars.day], ['월', s.pillars.month], ['년', s.pillars.year]];
    var godOf = {};
    f.table.forEach(function (t) { godOf[t.role] = t; });
    $('fx-pillars').innerHTML = cols.map(function (c) {
      var p = c[1];
      if (!p) {
        return '<div class="fx-col empty"><span class="fx-role">' + c[0] + '주</span><div class="fx-char">?</div><div class="fx-char">?</div><span class="small">시각 모름</span></div>';
      }
      var g = godOf[p.role];
      return '<div class="fx-col' + (p.role === '일주' ? ' me' : '') + '">' +
        '<span class="fx-role">' + c[0] + '주</span>' +
        '<span class="fx-god">' + esc(g.stemGod) + '</span>' +
        '<div class="fx-char ' + ELEM_CLASS[p.stemElem] + '"><b>' + p.hanja[0] + '</b><span>' + p.stem + ' · ' + p.stemElem + '</span></div>' +
        '<div class="fx-char ' + ELEM_CLASS[p.branchElem] + '"><b>' + p.hanja[1] + '</b><span>' + p.branch + ' · ' + p.branchElem + '</span></div>' +
        '<span class="fx-god">' + esc(g.branchGod) + '</span>' +
        '<span class="small">' + p.animal + '</span>' +
      '</div>';
    }).join('');
  }

  function renderElems(f) {
    var total = 0;
    Object.keys(f.count).forEach(function (k) { total += f.count[k]; });
    $('fx-elems').innerHTML = ['목', '화', '토', '금', '수'].map(function (e) {
      var n = f.count[e];
      var word = n === 0 ? '없음' : (n >= 3 ? '많음' : '');
      return '<div class="fx-bar"><span class="badge ' + ELEM_CLASS[e] + '">' + e + ' ' + ELEM_HANJA[e] + '</span>' +
        '<span class="fx-track"><i class="' + ELEM_CLASS[e] + '" style="width:' + Math.round(n / total * 100) + '%"></i></span>' +
        '<span class="small">' + n + '개' + (word ? ' · ' + word : '') + '</span></div>';
    }).join('') +
    '<p class="small" style="margin:10px 0 0">2027년은 화(火)와 토(土)가 더해지는 해입니다.</p>';
  }

  function renderMonths(f) {
    $('fx-months').innerHTML = f.months.map(function (m, k) {
      var from = m.from, to = m.to;
      var range = (k === 11 ? '2028. ' : '') + from.month + '.' + from.day + ' ~ ' + (k >= 10 ? '2028. ' : '') + to.month + '.' + (to.day - 1);
      var bar = '';
      for (var n = 1; n <= 5; n++) bar += '<span class="fx-dot sm' + (m.score >= n ? ' on' : (m.score >= n - 0.5 ? ' half' : '')) + '"></span>';
      return '<div class="fx-month">' +
        '<div class="fx-mhead"><b>' + (k === 11 ? '1월' : (from.month) + '월') + '</b><span class="small">' + range + ' · ' + esc(m.term) + '부터</span></div>' +
        '<div class="fx-mpillar"><span class="badge ' + ELEM_CLASS[m.pillar.stemElem] + '">' + m.pillar.id + ' ' + m.pillar.hanja + '</span><span class="small">' + esc(m.god) + '</span></div>' +
        '<div class="fx-mscore">' + bar + '</div>' +
        '<p class="fx-mline">' + esc(m.line) + (m.extra ? '<br><span class="small">' + esc(m.extra) + '</span>' : '') + '</p>' +
      '</div>';
    }).join('');
  }

  function renderLucky(f) {
    var L = f.luck;
    $('fx-lucky').innerHTML =
      '<p class="eyebrow" style="margin-bottom:6px">보태면 좋은 기운</p>' +
      '<h3 style="margin-top:0"><span class="badge ' + ELEM_CLASS[f.fav] + '">' + f.fav + ' ' + ELEM_HANJA[f.fav] + '</span></h3>' +
      '<dl class="fx-dl">' +
        '<dt>행운의 색</dt><dd>' + esc(L.color) + '</dd>' +
        '<dt>좋은 방향</dt><dd>' + esc(L.dir) + '</dd>' +
        '<dt>행운의 숫자</dt><dd>' + esc(L.num) + '</dd>' +
        '<dt>어울리는 반지</dt><dd>' + esc(L.ring) + '</dd>' +
      '</dl>';
    $('fx-stones').innerHTML = L.stones.map(function (name) {
      return '<div class="stone-row">' + (ONM.stoneIcon ? ONM.stoneIcon(name, { size: 46, cut: 'cabochon', label: name }) : '') +
        '<span><b>' + esc(name) + '</b><br><span class="small">' + f.fav + '의 기운 · 캐보션</span></span></div>';
    }).join('');
    $('fx-ring').textContent = '공방에서 반지 원석이나 소원팔찌로 고르실 때 2027년 행운의 원석을 말씀해 주세요.';
  }

  /* ───────────── 주소 ───────────── */
  function syncUrl(input) {
    var q = '?y=' + input.year + '&m=' + input.month + '&d=' + input.day +
      (input.hour !== '' ? '&h=' + input.hour : '') + (input.minute !== '' ? '&mi=' + input.minute : '') +
      (state.name ? '&n=' + encodeURIComponent(state.name) : '');
    try { history.replaceState(null, '', location.pathname + q); } catch (e) { /* 미리보기 등에서는 무시 */ }
  }

  $('fx-copy').addEventListener('click', function () {
    var btn = this;
    var url = location.href;
    function done() { btn.textContent = '복사했어요'; setTimeout(function () { btn.textContent = '결과 링크 복사'; }, 1600); }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('링크를 복사해 주세요', url); });
    else prompt('링크를 복사해 주세요', url);
  });

  $('fx-form').addEventListener('submit', function (e) {
    e.preventDefault();
    run({
      name: $('fx-name').value,
      year: $('fx-y').value, month: $('fx-m').value, day: $('fx-d').value,
      hour: $('fx-h').value, minute: $('fx-h').value === '' ? '' : $('fx-min').value
    });
  });

  /* 주소로 들어온 경우 바로 보여 줍니다 */
  (function () {
    var p = new URLSearchParams(location.search);
    if (!p.get('y') || !p.get('m') || !p.get('d')) return;
    var input = { name: p.get('n') || '', year: p.get('y'), month: p.get('m'), day: p.get('d'), hour: p.get('h') || '', minute: p.get('mi') || '' };
    $('fx-name').value = input.name; $('fx-y').value = input.year; $('fx-m').value = input.month; $('fx-d').value = input.day;
    $('fx-h').value = input.hour; $('fx-min').value = input.minute;
    run(input);
  })();
})();
