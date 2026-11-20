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
  ['fx-h', 'fx-h2'].forEach(function (id) {
    var sel = $(id);
    for (var h = 0; h < 24; h++) {
      var o = document.createElement('option');
      o.value = String(h);
      o.textContent = pad(h) + ':00 ~ ' + pad(h) + ':59  (' + SIJU[Math.floor(((h + 1) % 24) / 2)] + ')';
      sel.appendChild(o);
    }
  });

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

  function run(input, inputB) {
    var saju, sajuB = null;
    try {
      saju = ONM.saju.getSaju(input);
    } catch (e) {
      showError(e.message || '생년월일을 다시 확인해 주세요.');
      return;
    }
    if (inputB) {
      try {
        sajuB = ONM.saju.getSaju(inputB);
      } catch (e2) {
        showError('두 번째 분 — ' + (e2.message || '생년월일을 다시 확인해 주세요.'));
        return;
      }
    }
    showError('');
    state.input = input;
    state.inputB = inputB || null;
    state.name = givenName(input.name);
    state.nameB = inputB ? givenName(inputB.name) : '';
    var f = F.analyze(saju);
    state.f = f;
    state.fB = sajuB ? F.analyze(sajuB) : null;
    render(f);
    renderCouple();
    $('fx-report').classList.remove('is-hidden');
    syncUrl(input, inputB);
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
    // 큰 도장은 내 일주 동물(병인이면 호랑이), 2027년의 양은 제목 옆 작은 도장으로
    if (ONM.zodiacSvg) {
      $('fx-seal').innerHTML = ONM.zodiacSvg(day.branch, { label: day.animal + ' — ' + day.id + ' 일주' });
      $('fx-year-seal').innerHTML = ONM.zodiacSvg('미', { label: '2027 정미년 — 붉은 양' });
    }
    $('fx-person').textContent = state.name ? state.name + ' 님의 2027년' : '나의 2027년';
    $('fx-day').textContent = day.id + ' (' + day.hanja + ') 일주';
    $('fx-day-sub').textContent = rec && ONM.iljuPhrase ? ONM.iljuPhrase(rec) : '';
    $('fx-title').textContent = '“' + f.easy.line + '”';
    $('fx-overall').textContent = f.easy.overall;
    $('fx-tags').innerHTML = f.easy.tags.map(function (t) { return '<span class="badge">#' + esc(t) + '</span>'; }).join('');
    $('fx-quick').innerHTML = '<span>좋은 달 <b>' + f.top.best.map(function (k) { return monthName(k, f.months[k]); }).join(' · ') + '</b></span>' +
      '<span>행운의 원석 <b>' + esc(f.luck.stones[0]) + '</b></span><span>행운의 색 <b>' + esc(f.luck.color.split(' · ')[0]) + '</b></span>';
    renderStars(f);
    renderWeather(f);
    $('fx-action').textContent = f.action;
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
    renderTop(f);
    renderDaewoon(f);
    renderSinsal(f);
    renderAptTips(f);
    renderRings(f);
    $('fx-story-box').classList.add('is-hidden');

    $('fx-closing').textContent = '2027년엔 ' + f.fav + '의 기운을 손끝에 두세요. ' + f.luck.stones[0] + ' 하나가 한 해의 균형을 잡아 줘요.';
    if (ONM.terms) $('fx-gloss').innerHTML = ONM.terms.glossaryHtml(GLOSS);
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


  /* 용어 풀이 — 신년운세에서 새로 쓰는 낱말을 더해 둡니다 */
  if (ONM.terms && ONM.terms.all) {
    var T = ONM.terms.all;
    T['사주팔자'] = T['사주팔자'] || ['태어난 해·달·날·시 네 기둥, 여덟 글자', '기둥마다 하늘 글자(천간) 하나와 땅 글자(지지) 하나가 있어 모두 여덟 글자예요.'];
    T['세운'] = T['세운'] || ['그해의 기운', '2027년은 정미(丁未)년이에요. 이 두 글자가 내 사주와 어떻게 만나는지 보는 것이 신년운세예요.'];
    T['대운'] = T['대운'] || ['10년마다 바뀌는 큰 흐름', '계절처럼 10년 단위로 바뀌는 배경이에요. 성별과 태어난 날로 방향과 시작 나이가 정해져요.'];
    T['신강'] = T['신강'] || ['나를 돕는 기운이 넉넉한 사주', '힘을 밖으로 쓸 때 — 표현하고 벌고 책임질 때 운이 열려요.'];
    T['신약'] = T['신약'] || ['나를 받쳐 주는 기운이 가벼운 사주', '배움과 사람의 도움을 받아들일 때 운이 크게 열려요.'];
    T['도화'] = T['도화'] || ['사람을 끄는 별', '매력과 인기, 연애운으로 드러나요.'];
    T['역마'] = T['역마'] || ['움직이는 별', '이동, 여행, 이사, 해외와 인연이 깊어요.'];
    T['화개'] = T['화개'] || ['깊어지는 별', '예술, 공부, 손으로 하는 정교한 일에 재능이 있어요.'];
  }
  var GLOSS = ['사주팔자', '천간', '지지', '일간', '일지', '오행', '십신', '신강', '신약', '세운', '대운', '십이운성', '육합', '충', '형', '해', '도화', '역마', '화개'];

  var AREA = [['work', '💼', '일 · 사업'], ['money', '💰', '돈'], ['love', '💕', '연애 · 관계'], ['health', '🌿', '건강']];
  function starText(n) { var t = ''; for (var k = 1; k <= 5; k++) t += k <= n ? '★' : '☆'; return t; }

  function renderStars(f) {
    $('fx-stars').innerHTML = AREA.map(function (a) {
      return '<div class="card trait fx-star-card"><h3><span aria-hidden="true">' + a[1] + '</span> ' + a[2] +
        ' <span class="fx-stars" aria-label="5점 중 ' + f.stars[a[0]] + '점">' + starText(f.stars[a[0]]) + '</span></h3>' +
        '<p>' + esc(f.easy[a[0]]) + '</p></div>';
    }).join('');
  }

  function renderWeather(f) {
    $('fx-weather').innerHTML = f.months.map(function (m, k) {
      return '<div class="fx-wx ' + (m.score >= 4 ? 'sun' : (m.score >= 3 ? 'cloud' : 'rain')) + '">' +
        '<b>' + (k === 11 ? '1월' : m.from.month + '월') + '</b>' +
        '<span class="fx-wx-ico" role="img" aria-label="' + m.weather.word + '">' + m.weather.icon + '</span>' +
        '<span class="fx-wx-key">' + esc(m.key) + '</span></div>';
    }).join('');
  }

  /* 공유하기 — 생일은 빼고, 한 줄 운세와 신년운세 페이지 주소만 보냅니다 */
  $('fx-share').addEventListener('click', function () {
    if (!state.f) return;
    var btn = this, label = btn.textContent;
    var url = location.origin + location.pathname;
    var text = (state.name ? state.name + ' 님의 ' : '나의 ') + '2027년은 “' + state.f.easy.line + '” ' +
      state.f.easy.tags.map(function (t) { return '#' + t; }).join(' ') + '\n너의 2027년도 궁금하면 →';
    function flash(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = label; }, 1800); }
    if (navigator.share) {
      navigator.share({ title: '2027 정미년 신년운세 · 온명', text: text, url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + ' ' + url).then(function () { flash('문구와 링크를 복사했어요'); }, function () { prompt('복사해 주세요', text + ' ' + url); });
    } else {
      prompt('복사해 주세요', text + ' ' + url);
    }
  });

  function monthName(k, m) { return k === 11 ? '2028년 1월' : m.from.month + '월'; }

  function renderTop(f) {
    $('fx-best').innerHTML = f.top.best.map(function (k) {
      var m = f.months[k];
      return '<li><b>' + monthName(k, m) + '</b> · ' + esc(m.pillar.id) + ' — ' + esc(m.line) + '</li>';
    }).join('');
    $('fx-care').innerHTML = f.top.care.map(function (k) {
      var m = f.months[k];
      return '<li><b>' + monthName(k, m) + '</b> · ' + esc(m.pillar.id) + ' — ' + esc(m.extra || m.line) + '</li>';
    }).join('');
  }

  function renderDaewoon(f) {
    var sec = $('fx-dw-sec');
    var d = f.daewoon;
    if (!d) {
      sec.classList.remove('is-hidden');
      $('fx-dw-lead').textContent = '대운은 성별에 따라 흐르는 방향이 달라집니다. 위에서 성별을 고르시면 10년 단위의 큰 흐름과 2027년이 그중 어디에 있는지 보여 드립니다.';
      $('fx-dw').innerHTML = '';
      return;
    }
    $('fx-dw-lead').textContent = d.text;
    $('fx-dw').innerHTML = d.list.map(function (x, k) {
      return '<div class="fx-dw-cell' + (k === d.current ? ' now' : '') + '">' +
        '<span class="small">' + x.age + '세</span>' +
        '<b class="' + ELEM_CLASS[x.pillar.stemElem] + '">' + x.pillar.hanja[0] + '</b>' +
        '<b class="' + ELEM_CLASS[x.pillar.branchElem] + '">' + x.pillar.hanja[1] + '</b>' +
        '<span class="small">' + esc(x.god) + '</span>' +
        (k === d.current ? '<span class="fx-now">2027</span>' : '') +
      '</div>';
    }).join('');
  }

  function renderSinsal(f) {
    $('fx-sinsal').innerHTML = f.sinsal.map(function (x) {
      var months = x.monthOn.map(function (k) { return monthName(k, f.months[k]); });
      var on = x.present.length || x.yearOn;
      return '<div class="card' + (on ? ' tone-green' : '') + '">' +
        '<p class="eyebrow">' + esc(x.short) + '</p>' +
        '<h3>' + esc(x.name) + (on ? ' <span class="badge">있음</span>' : '') + '</h3>' +
        '<p>' + esc(x.body) + '</p>' +
        '<p class="small" style="margin:0">' + esc(x.line) + (months.length ? ' (' + months.join(', ') + ')' : '') + '</p>' +
      '</div>';
    }).join('');
  }

  function renderAptTips(f) {
    var a = f.aptitude;
    $('fx-apt').innerHTML = '<p class="eyebrow">적성 · 일하는 방식</p><h3>' + esc(a.mainText.title) + '</h3>' +
      '<p>' + esc(a.mainText.body) + '</p>' +
      '<p class="small" style="margin:0 0 8px">잘 맞는 분야 · ' + esc(a.mainText.fields) + '</p>' +
      (a.subText ? '<p class="small" style="margin:0">두 번째로 강한 결 — ' + esc(a.subText.title) + '. ' + esc(a.subText.fields) + '</p>' : '');
    var t = f.tips;
    $('fx-tips').innerHTML = '<p class="eyebrow">' + f.fav + '의 기운 채우기</p><h3>생활 속 보완법</h3>' +
      (f.lack.length ? '<p class="small" style="margin:0 0 10px">원국에 없는 오행: ' + f.lack.join(', ') + '</p>' : '') +
      '<dl class="fx-dl"><dt>음식</dt><dd>' + esc(t.food) + '</dd><dt>습관</dt><dd>' + esc(t.habit) + '</dd><dt>장소</dt><dd>' + esc(t.place) + '</dd></dl>';
  }

  /* 2027 행운의 반지 — 내 일주에 맞는 디자인 중 행운의 오행과 겹치는 것을 먼저 */
  function renderRings(f) {
    var R = ONM.rings;
    var rec = ONM.ILJU[f.saju.pillars.day.id];
    $('fx-rings-lead').textContent = '내 일주에 어울리는 디자인 가운데, 2027년에 보태면 좋은 ' + f.fav + '의 결을 가진 반지를 골랐습니다. 원석은 2027 행운의 원석으로 바꿔 끼울 수 있습니다.';
    if (!R || !rec) { $('fx-rings').innerHTML = ''; return; }
    var list = R.recommend(rec, { seed: 1, limit: R.MODELS.length, mood: 'all' });
    var withFav = list.filter(function (it) { return it.model.elements && it.model.elements.indexOf(f.fav) !== -1; });
    var pick = withFav.concat(list.filter(function (it) { return withFav.indexOf(it) === -1; })).slice(0, 3);
    $('fx-rings').innerHTML = pick.map(function (item) {
      var spec = item.spec, q = R.specToQuery(spec);
      var favHit = withFav.indexOf(item) !== -1;
      return '<article class="card ring-card">' +
        '<div class="preview-box stage-bg">' + R.ringSvg(spec, { size: 180 }) + '</div>' +
        '<h3 style="margin:8px 0 2px">' + esc(spec.modelName) + '</h3>' +
        '<p class="small" style="margin:0 0 6px">' + esc(item.family.label) + (favHit ? ' · ' + f.fav + '의 결' : '') + '</p>' +
        '<p class="reason">' + esc(item.reason) + '</p>' +
        '<div class="btn-row no-print"><a class="btn btn-sm btn-primary" href="studio.html?' + q + '">3D로 조절하기</a>' +
        '<a class="btn btn-sm" href="order.html?' + q + '">주문 상담</a></div>' +
      '</article>';
    }).join('');
  }

  /* ───────────── 둘이 함께 ───────────── */
  function renderCouple() {
    var sec = $('fx-couple-sec');
    if (!state.fB) { sec.classList.add('is-hidden'); return; }
    sec.classList.remove('is-hidden');
    var fa = state.f, fb = state.fB;
    var c = F.couple(fa, fb, { a: state.name, b: state.nameB });
    state.c = c;
    $('fx-c-title').textContent = c.A + ' × ' + c.B + ' · 둘이 함께 보는 2027';
    $('fx-c-lead').textContent = c.ilju ? c.ilju.headline + ' (일주 어울림 ' + c.ilju.score + '점)' : '';
    $('fx-c-people').innerHTML = [[c.A, fa], [c.B, fb]].map(function (x) {
      var d = x[1].saju.pillars.day;
      return '<div class="card"><p class="eyebrow">' + esc(x[0]) + ' · ' + esc(d.id) + ' 일주</p>' +
        '<h3>' + esc(x[1].easy.line) + '</h3>' +
        '<p class="small" style="margin:0">2027 흐름 ' + x[1].score + ' / 5 · 보태면 좋은 기운 ' + x[1].fav + ' · 행운의 원석 ' + esc(x[1].luck.stones[0]) + '</p></div>';
    }).join('');
    $('fx-c-best').innerHTML = c.best.map(function (m) {
      return '<li><b>' + monthName(m.k, fa.months[m.k]) + '</b> · ' + esc(m.pillar.id) + ' — 둘 다 흐름이 좋아요. 기념일, 여행, 중요한 약속을 잡기 좋아요.</li>';
    }).join('');
    $('fx-c-care').innerHTML = c.care.map(function (m) {
      return '<li><b>' + monthName(m.k, fa.months[m.k]) + '</b> · ' + esc(m.pillar.id) + ' — ' +
        (m.clash ? '한 사람에게 변화가 생기기 쉬운 달이에요. 서로의 속도를 맞춰 주세요.' : '둘 다 기운이 낮은 달이에요. 큰 결정보다 쉬어 가는 데이트가 좋아요.') + '</li>';
    }).join('');
    $('fx-c-notes').innerHTML = [c.leadText, c.relText, c.favText].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('fx-c-months').innerHTML = '<div class="fx-cm-head"><span></span><span>' + esc(c.A) + '</span><span>' + esc(c.B) + '</span></div>' +
      c.months.map(function (m) {
        return '<div class="fx-cm-row"><span><b>' + monthName(m.k, fa.months[m.k]) + '</b> <span class="small">' + m.pillar.id + '</span></span>' +
          '<span>' + wx(m.a) + '</span><span>' + wx(m.b) + '</span></div>';
      }).join('');
  }

  function wx(v) {
    var w = v >= 4 ? ['☀️', '맑음'] : (v >= 3 ? ['⛅', '무난'] : ['🌧️', '조심']);
    return '<span class="fx-cwx" role="img" aria-label="' + w[1] + '">' + w[0] + '</span> <span class="small">' + w[1] + '</span>';
  }
  function dotsHtml(v) {
    var h = '';
    for (var n = 1; n <= 5; n++) h += '<span class="fx-dot sm' + (v >= n ? ' on' : (v >= n - 0.5 ? ' half' : '')) + '"></span>';
    return h;
  }

  /* ───────────── 인스타 스토리 카드 (1080 × 1920) ───────────── */
  /* 띄어쓰기 단위로 줄을 나눕니다 — 한 단어가 너무 길 때만 글자 단위로 자릅니다 */
  function wrapLines(x, text, maxW) {
    var out = [], line = '';
    String(text).split(' ').forEach(function (word) {
      var t = line ? line + ' ' + word : word;
      if (x.measureText(t).width <= maxW) { line = t; return; }
      if (line) out.push(line);
      line = word;
      while (x.measureText(line).width > maxW && line.length > 1) {
        var cut = line.length - 1;
        while (cut > 1 && x.measureText(line.slice(0, cut)).width > maxW) cut--;
        out.push(line.slice(0, cut)); line = line.slice(cut);
      }
    });
    if (line) out.push(line);
    return out;
  }

  function storyCard(f, name, icon) {
    var W = 1080, H = 1920;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    var SERIF = '"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif';
    var SANS = '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    var day = f.saju.pillars.day, rec = ONM.ILJU[day.id];
    var col = rec && ONM.zodiacColor ? ONM.zodiacColor(rec) : { solid: '#B34E42', ink: '#7a2f27' };
    x.fillStyle = '#F1EFE9'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#FCFBF8'; x.fillRect(60, 60, W - 120, H - 120);
    x.strokeStyle = '#D3D6D1'; x.lineWidth = 2; x.strokeRect(60, 60, W - 120, H - 120);
    x.textAlign = 'center';
    x.fillStyle = '#626A6D'; x.font = '600 30px ' + SANS; x.fillText('2027 丁未年 · 붉은 양의 해', W / 2, 190);
    x.fillStyle = '#252D30'; x.font = '700 64px ' + SERIF; x.fillText(name ? name + ' 님의 2027' : '나의 2027', W / 2, 290);
    // 일주 도장 — 일주 리포트와 같은 십이지 아이콘 (병인이면 호랑이)
    x.fillStyle = col.solid; x.beginPath(); x.arc(W / 2, 470, 120, 0, Math.PI * 2); x.fill();
    if (icon) x.drawImage(icon, W / 2 - 92, 470 - 92, 184, 184);
    else { x.fillStyle = '#fff'; x.font = '700 92px ' + SERIF; x.fillText(day.hanja, W / 2, 500); }
    x.fillStyle = '#252D30'; x.font = '700 44px ' + SERIF; x.fillText(day.hanja + '  ' + day.id + ' 일주', W / 2, 660);
    if (rec && ONM.iljuPhrase) { x.fillStyle = '#626A6D'; x.font = '500 32px ' + SANS; x.fillText(ONM.iljuPhrase(rec), W / 2, 712); }
    // 한 해 제목
    // 마지막 줄에 한두 글자만 남지 않도록 글자 크기를 조금씩 줄여 봅니다
    var size = 62, lines;
    do {
      x.font = '700 ' + size + 'px ' + SERIF;
      lines = wrapLines(x, f.easy.line, W - 220);
      size -= 4;
    } while (size >= 46 && lines.length > 1 && lines[lines.length - 1].length <= 2);
    x.fillStyle = col.ink || '#252D30';
    var y = 830;
    lines.forEach(function (l) { x.fillText(l, W / 2, y); y += Math.round((size + 4) * 1.3); });
    // 점수
    y += 20;
    for (var n = 0; n < 5; n++) {
      x.beginPath(); x.arc(W / 2 - 120 + n * 60, y, 18, 0, Math.PI * 2);
      x.lineWidth = 4; x.strokeStyle = col.solid; x.stroke();
      if (f.score >= n + 1) { x.fillStyle = col.solid; x.fill(); }
    }
    y += 110;
    // 좋은 달 · 행운
    function row(label, val) {
      x.fillStyle = '#626A6D'; x.font = '500 32px ' + SANS; x.fillText(label, W / 2, y); y += 56;
      x.fillStyle = '#252D30'; x.font = '600 44px ' + SERIF;
      wrapLines(x, val, W - 260).forEach(function (l) { x.fillText(l, W / 2, y); y += 60; });
      y += 44;
    }
    row('좋은 달', f.top.best.map(function (k) { return monthName(k, f.months[k]); }).join(' · '));
    row('행운의 원석', f.luck.stones.join(' · '));
    row('행운의 색 · 방향', f.luck.color + ' · ' + f.luck.dir);
    row('올해 해 볼 한 가지', f.action.split('. ')[0].replace(/\.$/, ''));
    // 바닥글
    x.fillStyle = '#626A6D'; x.font = '600 34px ' + SERIF; x.fillText('ONMYEONG · 온명 반지공방', W / 2, H - 170);
    x.font = '28px ' + SANS; x.fillText('사주 여덟 글자로 읽는 2027 신년운세', W / 2, H - 120);
    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  }

  /** 흰색 십이지 아이콘 — 캔바 원본 파일이 있으면 그것, 없으면 코드로 그린 아이콘 */
  function storyIcon(branch) {
    var SH = ONM.share;
    if (!SH || !SH.tintedZodiac) return Promise.resolve(null);
    return SH.tintedZodiac(branch, '#ffffff', 312).then(function (img) {
      if (img || !ONM.zodiacSvg) return img;
      var svg = ONM.zodiacSvg(branch, { size: 312, stroke: 2.4 }).replace('currentColor', '#ffffff');
      return SH.loadImage(SH.svgToUrl(svg, 312)).catch(function () { return null; });
    }).catch(function () { return null; });
  }

  $('fx-story').addEventListener('click', function () {
    if (!state.f) return;
    var btn = this, label = btn.textContent;
    btn.textContent = '카드를 만드는 중…';
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () { return storyIcon(state.f.saju.pillars.day.branch); })
      .then(function (icon) { return storyCard(state.f, state.name, icon); }).then(function (blob) {
      if (!blob) throw new Error('fail');
      var box = $('fx-story-box');
      box.innerHTML = '<img alt="2027 신년운세 스토리 카드" style="max-width:280px" src="' + URL.createObjectURL(blob) + '">' +
        '<p class="small" style="margin-top:8px">이미지를 길게 눌러 저장하거나, 내려받은 파일을 스토리에 올려 주세요.</p>';
      box.classList.remove('is-hidden');
      var file = ONM.share && ONM.share.toFile ? ONM.share.toFile(blob, 'onmyeong-2027.png') : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: '나의 2027 신년운세' }).catch(function () {});
      } else if (ONM.share) {
        ONM.share.download(blob, 'onmyeong-2027.png');
      }
      btn.textContent = '저장했어요';
      setTimeout(function () { btn.textContent = label; }, 1800);
    }).catch(function () {
      btn.textContent = '카드 저장에 실패했어요';
      setTimeout(function () { btn.textContent = label; }, 1800);
    });
  });

  /* ───────────── 매장 출력용 한 장 (A5) ───────────── */
  function sheetHtml(f, name, coupleLine) {
    var s = f.saju;
    var cols = [['시', s.pillars.hour], ['일', s.pillars.day], ['월', s.pillars.month], ['년', s.pillars.year]];
    return '<article class="fx-sheet-page">' +
      '<header><span>ONMYEONG · 온명 반지공방</span><span>2027 丁未年 신년운세</span></header>' +
      '<h1>' + esc(name ? name + ' 님의 2027' : '나의 2027') + '</h1>' +
      '<p class="sub">' + esc(s.pillars.day.id + '(' + s.pillars.day.hanja + ') 일주') + '</p>' +
      '<div class="pillars">' + cols.map(function (c) {
        var p = c[1];
        if (!p) return '<div class="none"><span>' + c[0] + '주</span><i class="ico"></i><b>시각 모름</b></div>';
        // 일주(나)만 동물 아이콘 + 한자 · 한글, 나머지 기둥은 한자 두 글자 + 한글
        if (p.role === '일주') {
          var rec = ONM.ILJU[p.id];
          var bg = rec && ONM.zodiacColor ? ONM.zodiacColor(rec).solid : '#364D50';
          return '<div class="me"><span>일주 · 나</span>' +
            '<i class="ico" style="background:' + bg + '">' + (ONM.zodiacSvg ? ONM.zodiacSvg(p.branch) : '') + '</i>' +
            '<b><i class="' + ELEM_CLASS[p.stemElem] + '">' + p.hanja[0] + '</i><i class="' + ELEM_CLASS[p.branchElem] + '">' + p.hanja[1] + '</i></b>' +
            '<em>' + p.id + ' · ' + p.animal + ' · ' + p.stemElem + '·' + p.branchElem + '</em></div>';
        }
        // 글자색 = 오행 색 (목 초록 · 화 빨강 · 토 황토 · 금 회색 · 수 남색), 흑백 출력용으로 오행 글자도 함께
        return '<div><span>' + c[0] + '주</span>' +
          '<strong class="hj"><i class="' + ELEM_CLASS[p.stemElem] + '">' + p.hanja[0] + '</i><i class="' + ELEM_CLASS[p.branchElem] + '">' + p.hanja[1] + '</i></strong>' +
          '<em>' + p.id + ' · ' + p.stemElem + '·' + p.branchElem + '</em></div>';
      }).join('') + '</div>' +
      '<h2>“' + esc(f.easy.line) + '”</h2>' +
      '<p class="tags">' + f.easy.tags.map(function (t) { return '#' + esc(t); }).join(' ') + '</p>' +
      '<p>' + esc(f.easy.overall) + '</p>' +
      '<div class="two"><div><h3>좋은 달</h3><p>' + f.top.best.map(function (k) { return monthName(k, f.months[k]); }).join(' · ') + '</p></div>' +
      '<div><h3>조심할 달</h3><p>' + f.top.care.map(function (k) { return monthName(k, f.months[k]); }).join(' · ') + '</p></div></div>' +
      '<div class="two"><div><h3>행운의 원석</h3><p>' + esc(f.luck.stones.join(' · ')) + '</p></div>' +
      '<div><h3>행운의 색 · 방향 · 숫자</h3><p>' + esc(f.luck.color + ' · ' + f.luck.dir + ' · ' + f.luck.num) + '</p></div></div>' +
      '<h3>올해 해 볼 한 가지</h3><p>' + esc(f.action) + '</p>' +
      (coupleLine ? '<h3>둘이 함께</h3><p>' + esc(coupleLine) + '</p>' : '') +
      '<footer>사주 여덟 글자와 2027년 세운으로 본 참고용 풀이입니다 · 온명 반지공방</footer>' +
    '</article>';
  }

  $('fx-sheet-btn').addEventListener('click', function () {
    if (!state.f) return;
    var cl = '';
    if (state.fB && state.c) {
      cl = '함께 좋은 달 ' + state.c.best.map(function (m) { return monthName(m.k, state.f.months[m.k]); }).join(' · ') + '. ' + state.c.favText;
    }
    var html = sheetHtml(state.f, state.name, cl);
    if (state.fB) html += sheetHtml(state.fB, state.nameB, cl);
    $('fx-sheet').innerHTML = html;
    var st = document.createElement('style');
    st.id = 'fx-page-a5';
    st.textContent = '@page { size: A5; margin: 10mm; }';
    document.head.appendChild(st);
    document.body.classList.add('fx-print-sheet');
    var done = function () {
      document.body.classList.remove('fx-print-sheet');
      var old = document.getElementById('fx-page-a5');
      if (old) old.parentNode.removeChild(old);
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 50);
  });

  /* ───────────── 주소 ───────────── */
  function personQuery(input, sfx, name) {
    return '&y' + sfx + '=' + input.year + '&m' + sfx + '=' + input.month + '&d' + sfx + '=' + input.day +
      (input.hour !== '' ? '&h' + sfx + '=' + input.hour : '') + (input.minute !== '' && input.minute !== undefined ? '&mi' + sfx + '=' + input.minute : '') +
      (input.gender ? '&g' + sfx + '=' + input.gender : '') + (name ? '&n' + sfx + '=' + encodeURIComponent(name) : '');
  }
  function syncUrl(input, inputB) {
    var q = '?' + personQuery(input, '', state.name).slice(1) + (inputB ? personQuery(inputB, '2', state.nameB) : '');
    try { history.replaceState(null, '', location.pathname + q); } catch (e) { /* 미리보기 등에서는 무시 */ }
  }

  $('fx-copy').addEventListener('click', function () {
    var btn = this;
    var url = location.href;
    function done() { btn.textContent = '복사했어요'; setTimeout(function () { btn.textContent = '내 결과 링크 복사'; }, 1600); }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('링크를 복사해 주세요', url); });
    else prompt('링크를 복사해 주세요', url);
  });

  function readPerson(sfx) {
    return {
      name: $('fx-name' + sfx).value,
      year: $('fx-y' + sfx).value, month: $('fx-m' + sfx).value, day: $('fx-d' + sfx).value,
      hour: $('fx-h' + sfx).value, minute: $('fx-h' + sfx).value === '' ? '' : $('fx-min' + sfx).value,
      gender: $('fx-g' + sfx).value
    };
  }
  function fillPerson(sfx, p) {
    $('fx-name' + sfx).value = p.name; $('fx-y' + sfx).value = p.year; $('fx-m' + sfx).value = p.month; $('fx-d' + sfx).value = p.day;
    $('fx-h' + sfx).value = p.hour; $('fx-min' + sfx).value = p.minute; $('fx-g' + sfx).value = p.gender;
  }
  $('fx-pair').addEventListener('change', function () {
    $('fx-b').classList.toggle('is-hidden', !this.checked);
  });

  $('fx-form').addEventListener('submit', function (e) {
    e.preventDefault();
    run(readPerson(''), $('fx-pair').checked ? readPerson('2') : null);
  });

  /* 주소로 들어온 경우 바로 보여 줍니다 */
  (function () {
    var p = new URLSearchParams(location.search);
    if (!p.get('y') || !p.get('m') || !p.get('d')) return;
    function from(sfx) {
      return { name: p.get('n' + sfx) || '', year: p.get('y' + sfx), month: p.get('m' + sfx), day: p.get('d' + sfx),
        hour: p.get('h' + sfx) || '', minute: p.get('mi' + sfx) || '', gender: p.get('g' + sfx) || '' };
    }
    var input = from('');
    var inputB = p.get('y2') && p.get('m2') && p.get('d2') ? from('2') : null;
    fillPerson('', input);
    if (inputB) { fillPerson('2', inputB); $('fx-pair').checked = true; $('fx-b').classList.remove('is-hidden'); }
    run(input, inputB);
  })();
})();
