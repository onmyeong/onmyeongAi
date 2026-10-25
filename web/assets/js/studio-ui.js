/*
 * 온명 — 반지 스튜디오 (조절 패널)
 * ------------------------------------------------------------------
 * 이 파일은 three.js 없이도 혼자 동작합니다.
 * 슬라이더 · 사양표 · 예상가 · 주문 링크는 3D가 못 뜨는 환경에서도 그대로 쓸 수 있고,
 * studio-3d.js가 성공적으로 로드되면 2D 미리보기 자리를 3D 화면이 대신합니다.
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG;
  var R = ONM.rings;
  var CONFIG = ONM.CONFIG;
  var $ = function (id) { return document.getElementById(id); };

  var spec = R.specFromQuery();
  spec.quantity = spec.quantity || 1;

  /* ───────────── 커플링: 한 사람씩 차례로 ─────────────
   * 두 사람 반지를 한 화면에 욱여넣으면 뭘 만지는지 헷갈립니다.
   * 그래서 첫 번째 분 반지를 먼저 맞추고, 그 다음 화면에서 두 번째 분 반지를 맞춘 뒤
   * 마지막에 둘을 함께 주문서로 넘깁니다.
   * 앞 단계에서 정한 사양은 주소(a=…)에 실어 그대로 들고 다닙니다. */
  var Q = new URLSearchParams(location.search);
  var invite = {
    on: Q.get('invite') === '1',
    from: Q.get('na') || ''          // 초대한 분 이름 (적었을 때만)
  };

  var couple = {
    on: Q.get('couple') === '1',
    step: Q.get('step') === 'b' ? 'b' : 'a',
    // URLSearchParams 가 이미 한 겹 풀어 주므로 여기 담긴 값은 "생" 질의문자열입니다.
    // 다시 주소에 실을 때는 반드시 한 겹 싸야 안쪽 & 가 바깥으로 새지 않습니다.
    rawA: Q.get('a') || '',                     // 첫 번째 분이 이미 정한 사양
    iljuB: Q.get('iljuB') || ''                 // 두 번째 분의 일주
  };
  function pack(sp) { return encodeURIComponent(R.specToQuery(sp)); }
  function packRaw(raw) { return encodeURIComponent(raw); }
  var specA = couple.on && couple.step === 'b' && couple.rawA
    ? R.specFromQuery(couple.rawA) : null;

  /** 이 단계가 누구의 반지인지 */
  function personOf(which) {
    var id = which === 'a'
      ? (specA ? specA.ilju : spec.ilju)
      : (couple.step === 'b' ? spec.ilju : couple.iljuB);
    var rec = id && ONM.ILJU ? ONM.ILJU[id] : null;
    return rec ? rec.id + ' (' + rec.hanja + ')' : (which === 'a' ? '첫 번째 분' : '두 번째 분');
  }

  var listeners = [];
  var studio = ONM.studio = {
    spec: spec,
    ready3d: false,
    onChange: function (fn) { listeners.push(fn); },
    changed: function () {
      listeners.forEach(function (fn) { try { fn(spec); } catch (e) { console.error(e); } });
      render2d();
      syncPanel();
      scheduleCommit();
    },
    /* 붓질하는 동안은 기록을 미뤄 두었다가 손을 떼면 한 칸으로 남깁니다 */
    holdHistory: function (on) {
      hist.hold = !!on;
      if (!on) scheduleCommit(true);
    }
  };

  /* ───────────── 되돌리기 · 다시 하기 ─────────────
   * 사양 전체를 한 장씩 찍어 두고(앞에 _ 가 붙은 계산용 값은 빼고) 앞뒤로 오갑니다.
   * 슬라이더를 끄는 동안처럼 잇달아 바뀌는 것은 손을 멈춘 뒤 한 칸으로 묶습니다.
   * 붓질은 그은 한 번이 한 칸입니다. */
  var HIST_MAX = 80;
  var hist = { past: [], future: [], cur: null, timer: 0, hold: false, applying: false };

  function snapSpec() {
    var o = {};
    Object.keys(spec).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = spec[k]; });
    return JSON.stringify(o);
  }
  function scheduleCommit(now) {
    if (hist.applying || hist.cur === null) return;
    clearTimeout(hist.timer);
    hist.timer = setTimeout(commitHistory, now ? 0 : 450);
  }
  function commitHistory() {
    clearTimeout(hist.timer);
    if (hist.applying || hist.hold || hist.cur === null) return;
    var s = snapSpec();
    if (s === hist.cur) return;
    hist.past.push(hist.cur);
    if (hist.past.length > HIST_MAX) hist.past.shift();
    hist.cur = s;
    hist.future = [];
    paintHistory();
  }
  function restoreSpec(s) {
    hist.applying = true;
    try {
      Object.keys(spec).forEach(function (k) { delete spec[k]; });   // 계산용 값(_sculpt 등)까지 비웁니다
      var o = JSON.parse(s);
      Object.keys(o).forEach(function (k) { spec[k] = o[k]; });
      buildControls();
      studio.changed();
    } finally {
      hist.applying = false;
    }
  }
  function undo() {
    commitHistory();                         // 아직 기록 전인 마지막 손질부터 남깁니다
    if (!hist.past.length) return false;
    hist.future.push(hist.cur);
    hist.cur = hist.past.pop();
    restoreSpec(hist.cur);
    paintHistory();
    return true;
  }
  function redo() {
    commitHistory();
    if (!hist.future.length) return false;
    hist.past.push(hist.cur);
    hist.cur = hist.future.pop();
    restoreSpec(hist.cur);
    paintHistory();
    return true;
  }
  function paintHistory() {
    var u = $('undo'), r = $('redo');
    if (u) u.disabled = !hist.past.length;
    if (r) r.disabled = !hist.future.length;
  }
  studio.undo = undo;
  studio.redo = redo;

  /* ───────────── 2D 미리보기 (3D가 뜨기 전/못 뜰 때) ───────────── */
  function render2d() {
    if (studio.ready3d) return;
    $('preview-2d').innerHTML = R.ringSvg(spec, { size: 320 });
  }

  /* ───────────── 컨트롤 ───────────── */
  function fillSelect(el, entries, value) {
    el.innerHTML = entries.map(function (e) {
      return '<option value="' + R.esc(e[0]) + '"' + (e[0] === value ? ' selected' : '') + '>' +
        R.esc(e[1]) + '</option>';
    }).join('');
    if (PICKERS[el.id]) renderPicker(el);
  }

  /* ───────────── 그림으로 고르기 ─────────────
   * '사포바', '베젤', '유화' 같은 말은 처음 듣는 분이 많습니다.
   * 목록 대신 항목마다 예시 그림을 왼쪽에 붙인 칸으로 보여 줍니다.
   * (속의 select 는 그대로 두고 값만 맞춰 바꾸므로 나머지 동작은 전과 같습니다)
   * 그림은 assets/img/opt/ 에 있습니다 — 같은 이름의 실사진으로 바꿔 끼우면 그대로 쓰입니다. */
  var OPT_IMG = 'assets/img/opt/';
  function hexOf(c) { return String(c || '').replace('#', '').toLowerCase(); }
  var PICKERS = {
    'c-texture':    function (v) { return 'texture-' + (v === 'sandbar' ? 'sandbar-vertical' : v) + '.svg'; },
    'c-grain':      function (v) { return 'texture-sandbar-' + v + '.svg'; },
    'c-profile':    function (v) { return 'profile-' + v + '.svg'; },
    'c-stonetype':  function (v) { return 'stonetype-' + v + '.webp'; },
    'c-stone':      function (v) { return ONM.STONE_COLOR[v] ? 'stone-' + hexOf(ONM.STONE_COLOR[v]) + '.webp' : null; },
    'c-stoneshape': function (v) { return 'shape-' + v + '.webp'; },
    'c-cubic':      function (v) { var c = CONFIG.stones.cubic.colors[v]; return c ? 'cubic-' + hexOf(c) + '.webp' : null; },
    'c-setting':    function (v) { return v === 'flush' ? 'stonetype-moissanite.webp' : 'setting-' + v + '.webp'; },
    'c-plating':    function (v) { return 'plating-' + v + '.webp'; },
    'c-epoxy':      function (v) { var c = CONFIG.epoxy.colors[v]; return 'epoxy-' + (v && c ? hexOf(c.color) : 'none') + '.webp'; },
    'c-epoxycov':   function (v) { return 'epoxycov-' + v + '.webp'; }
  };

  /** '이름 — 설명' · '이름 (덧붙임)' 을 큰 글씨와 작은 글씨로 나눕니다 */
  function splitLabel(t) {
    var m = t.match(/^(.*?)\s+—\s+(.*)$/);
    if (m) return [m[1], m[2]];
    m = t.match(/^(.*\S)\s*\(([^()]*)\)$/);
    if (m) return [m[1], m[2]];
    return [t, ''];
  }

  function renderPicker(sel) {
    var img = PICKERS[sel.id];
    var box = sel._pick;
    if (!box) {
      box = document.createElement('div');
      box.className = 'opt-pick';
      box.setAttribute('role', 'radiogroup');
      var lab = document.querySelector('label[for="' + sel.id + '"]');
      if (lab) box.setAttribute('aria-label', lab.textContent);
      sel.insertAdjacentElement('afterend', box);
      sel.classList.add('pick-hidden');
      sel._pick = box;
      box.addEventListener('click', function (e) {
        var b = e.target.closest('.opt');
        if (!b || b.disabled || sel.disabled) return;
        if (sel.value !== b.getAttribute('data-v')) {
          sel.value = b.getAttribute('data-v');
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncPickers();
      });
    }
    box.innerHTML = Array.prototype.map.call(sel.options, function (o) {
      var src = img(o.value);
      var t = splitLabel(o.textContent);
      return '<button type="button" class="opt" role="radio" data-v="' + R.esc(o.value) + '">' +
        (src ? '<img src="' + OPT_IMG + src + '" alt="" loading="lazy" width="52" height="52">' : '') +
        '<span><b>' + R.esc(t[0]) + '</b>' + (t[1] ? '<small>' + R.esc(t[1]) + '</small>' : '') + '</span>' +
      '</button>';
    }).join('');
    box.classList.toggle('is-long', sel.options.length > 12);
    syncPicker(sel);
  }

  function syncPicker(sel) {
    var box = sel._pick;
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.opt'), function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-v') === sel.value));
      b.disabled = sel.disabled;
    });
    box.classList.toggle('is-disabled', sel.disabled);
  }
  function syncPickers() {
    Object.keys(PICKERS).forEach(function (id) { var el = $(id); if (el) syncPicker(el); });
  }

  function buildControls() {
    fillSelect($('c-model'), R.MODELS.map(function (m) {
      return [m.id, m.name + ' — ' + R.FAMILIES[m.family].label];
    }), spec.modelId);
    fillSelect($('c-texture'), pairs(R.TEXTURE_LABEL), spec.texture);
    fillSelect($('c-grain'), pairs(R.GRAIN_LABEL), spec.grain || 'vertical');
    fillSelect($('c-cubic'), Object.keys(CONFIG.stones.cubic.colors).map(function (k) {
      return [k, k];
    }), spec.cubicColor || Object.keys(CONFIG.stones.cubic.colors)[0]);
    fillSelect($('c-profile'), pairs(R.PROFILE_LABEL), spec.profile);

    // 원석 종류
    fillSelect($('c-stonetype'), [
      ['none', '원석 없이 — 금속만'],
      ['moissanite', '모이사나이트 — 무색 투명, 가장 반짝임'],
      ['natural', '천연석 — 내 일주에 맞춘 돌'],
      ['cubic', '컬러큐빅 — 색이 있는 알']
    ], spec.stoneType || 'none');

    fillSelect($('c-stoneshape'), pairs(CONFIG.stones.natural.shapes), spec.stoneShape || 'round');
    fillSelect($('c-epoxycov'), Object.keys(CONFIG.epoxy.coverage).map(function (k) {
      var v = CONFIG.epoxy.coverage[k];
      return [k, v.label + ' (+' + v.price.toLocaleString('ko-KR') + '원)'];
    }), spec.epoxyCoverage || 'part');

    // 천연석 — 내 일주 추천을 위로
    var rec = spec.ilju && ONM.ILJU[spec.ilju];
    var mine = rec ? rec.stones.map(function (x) { return x[0]; }) : [];
    var all = Object.keys(ONM.STONE_COLOR).filter(function (x) { return mine.indexOf(x) === -1; });
    fillSelect($('c-stone'),
      mine.map(function (x) { return [x, x + ' — 내 일주 추천']; })
        .concat(all.map(function (x) { return [x, x]; })),
      spec.stone || mine[0] || all[0]);

    fillSelect($('c-plating'), Object.keys(CONFIG.plating).map(function (k) {
      var v = CONFIG.plating[k];
      return [k, v.label + (v.price ? ' (+' + v.price.toLocaleString('ko-KR') + '원)' : '')];
    }), spec.plating || 'none');

    $('c-oxidize').checked = !!spec.oxidize;
    $('oxidize-label').textContent = CONFIG.oxidize.label +
      ' (+' + CONFIG.oxidize.price.toLocaleString('ko-KR') + '원)';
    $('oxidize-note').textContent = CONFIG.oxidize.note;
    var ev = CONFIG.price.engravingEvent || {};
    $('review-label').textContent = ev.label || '리뷰 이벤트 — 각인 무료';
    $('review-note').textContent = ev.note || '';
    $('c-review').checked = !!spec.reviewEvent;

    fillSelect($('c-epoxy'), Object.keys(CONFIG.epoxy.colors).map(function (k) {
      var v = CONFIG.epoxy.colors[k];
      return [k, v.label + (k ? ' (+' + CONFIG.epoxy.price.toLocaleString('ko-KR') + '원)' : '')];
    }), spec.epoxy || '');

    refreshStoneFields();
    refreshTextureFields();
    refreshFinishFields();

    var metalKeys = Object.keys(CONFIG.price.metals);
    // 제작 소재가 하나뿐이면 고를 것이 없으므로 선택 영역을 숨긴다
    $('c-metal').closest('.field').classList.toggle('is-hidden', metalKeys.length < 2);
    $('c-metal').innerHTML = metalKeys.map(function (k) {
      var v = CONFIG.price.metals[k];
      return '<button class="swatch" type="button" data-metal="' + k + '" title="' + R.esc(v.label) +
        '" aria-label="' + R.esc(v.label) + '" aria-pressed="' + (k === spec.metal) +
        '" style="background:' + v.color + '"></button>';
    }).join('');

    $('c-engraving').value = spec.engraving || '';
    /* 글자 수 상한은 config.js 한 곳에서 옵니다 — 입력칸과 안내를 같이 맞춥니다 */
    (function engraveLimit() {
      var n = R.engraveMax();
      $('c-engraving').maxLength = n;
      var tag = $('c-engrave-max');
      if (tag) tag.textContent = '(반지 안쪽, 최대 ' + n + '자)';
    }());
    applyModelLimits();
    setOutputs();
  }

  function pairs(obj) {
    return Object.keys(obj).map(function (k) { return [k, obj[k]]; });
  }

  /* 사포바를 골랐을 때만 줄 방향 칸을 연다 */
  function refreshTextureFields() {
    $('f-grain').classList.toggle('is-hidden', spec.texture !== 'sandbar');
    $('texture-note').textContent = R.TEXTURE_DESC[spec.texture] || '';
    // 인장일 때만 판 크기를 고릅니다
    $('f-plate').classList.toggle('is-hidden', spec.profile !== 'signet');
    $('c-plate').value = spec.plateSize || 1;
  }

  /* 도금과 유화는 같이 못 합니다. 하나를 고르면 다른 하나를 잠급니다. */
  function refreshFinishFields() {
    var plated = spec.plating && spec.plating !== 'none';
    $('c-oxidize').disabled = plated;
    $('c-plating').disabled = !!spec.oxidize;

    var msg = '';
    if (plated) msg = '도금과 유화는 같이 할 수 없습니다. 유화를 하시려면 도금을 "도금 없이"로 바꿔 주세요.';
    else if (spec.oxidize) msg = '유화를 고르셔서 도금은 잠겼습니다. 도금을 하시려면 유화를 먼저 꺼 주세요.';
    $('finish-conflict').textContent = msg;
  }

  /* 색을 채우려면 채울 홈이 있어야 한다.
   * 매끈한 디자인에 색 채움을 고르면 값만 오르고 티가 안 나므로 미리 알려 준다. */
  function refreshEpoxyNote() {
    var model = R.getModel(spec.modelId) || {};
    var deepTexture = spec.texture === 'sandbar';
    var hasGroove = (model.twist || 0) > 0 || (model.sweep || 0) > 0 ||
      deepTexture || spec.profile === 'step';
    var note = '';
    if (spec.epoxy && !hasGroove) {
      note = '이 디자인은 표면이 매끈해서 채울 홈이 거의 없습니다. ' +
        '사포바처럼 결이 깊은 마감이나, 면을 깎아 낸 디자인 · 비틀린 디자인이라야 색이 고입니다. ' +
        '도안 새기기로 직접 홈을 판 자리에도 색이 채워집니다.';
    } else if (spec.epoxy) {
      note = '파인 홈 안에 수지를 부어 굳힌 뒤 표면과 같은 높이로 깎아 냅니다. ' +
        '금속에 스며드는 것이 아니라 홈에 잠기는 것이라 경계가 또렷하고, 만졌을 때 단차가 없습니다.';
    }
    $('epoxy-note').textContent = note;
    $('f-epoxycov').classList.toggle('is-hidden', !spec.epoxy);
    $('f-epoxylines').classList.toggle('is-hidden', !spec.epoxy);
    $('c-epoxylines').value = String(spec.epoxyLines || 1);
  }

  /* 고른 원석에 따라 필요한 칸만 남기고, 고를 수 있는 고정 방법도 추려 준다.
   * 천연석은 캐보션이라 테두리로 감싸는 방식밖에 안 되기 때문이다. */
  /** 알 개수·자리 칸만 현재 사양에 맞춰 둡니다 (알 놓기 도구로 바뀌면 여기가 따라옵니다) */
  function syncStonePlace() {
    $('c-stonecount').value = String(spec.stoneCount || 1);
    $('c-stoneangle').value = spec.stoneAngle || 0;
    $('stone-place-note').innerHTML = spec.stoneAt
      ? '손으로 놓은 자리 <b>' + R.stoneAngles(spec).length + '곳</b>을 쓰고 있습니다. ' +
        '위 개수나 위치를 건드리면 다시 고르게 나눠 앉습니다.'
      : '둘레에 고르게 나눠 앉습니다. <b>손으로 다듬기 → 알 놓기</b>로 반지를 짚으면 ' +
        '원하는 자리에 하나씩 놓을 수 있습니다.';
  }

  function refreshStoneFields() {
    var type = spec.stoneType || 'none';
    var has = type !== 'none';

    // 세 종류 모두 크기를 고릅니다. 값은 크기로 정해집니다.
    $('f-stonesize').classList.toggle('is-hidden', !has);
    $('f-stone').classList.toggle('is-hidden', type !== 'natural');
    $('f-stoneshape').classList.toggle('is-hidden', type !== 'natural');
    $('f-cubic').classList.toggle('is-hidden', type !== 'cubic');
    $('f-stoneheight').classList.toggle('is-hidden', !has);
    $('c-stoneheight').value = spec.stoneHeight || 0;
    $('f-stoneplace').classList.toggle('is-hidden', !has);
    syncStonePlace();
    /* 물림 방식 — 천연석만 세 가지 중에 고릅니다.
     * 모이사나이트와 컬러큐빅은 매립(우물) 한 가지뿐이라 고를 것이 없습니다. */
    var allowed = R.settingsFor(type);
    $('f-setting').classList.toggle('is-hidden', allowed.length < 2);
    if (allowed.length > 1) {
      if (allowed.indexOf(spec.setting) === -1) spec.setting = allowed[0];
      fillSelect($('c-setting'), allowed.map(function (k) {
        return [k, R.SETTING_LABEL[k]];
      }), spec.setting);
      $('setting-note').textContent = R.SETTING_DESC[spec.setting] || '';
    }

    if (has) {
      var kind = CONFIG.stones[type];
      var sizes = kind.sizes.map(function (z) { return z.mm; });
      if (sizes.indexOf(Number(spec.stoneSize)) === -1) {
        spec.stoneSize = sizes[Math.min(1, sizes.length - 1)];
      }
      fillSelect($('c-stonesize'), kind.sizes.map(function (z) {
        return [String(z.mm), z.label + ' — ' + z.hint +
          (z.price ? ' (+' + z.price.toLocaleString('ko-KR') + '원)' : '')];
      }), String(spec.stoneSize));
    }

    var note = (CONFIG.stones[type] || {}).note || '';
    $('stone-note').textContent = note;

    refreshEpoxyNote();
    refreshStonePeek();
    refreshCubicPeek();

    if (!has) { spec.setting = 'none'; return; }
    if (allowed.indexOf(spec.setting) === -1) spec.setting = allowed[0];
  }

  /* 고른 천연석이 실제로 어떤 알인지 옆에 바로 보여 준다 */
  function refreshStonePeek() {
    var box = $('stone-peek');
    if (!box) return;
    if (spec.stoneType !== 'natural' || !spec.stone) { box.innerHTML = ''; return; }
    box.innerHTML = ONM.stoneIcon(spec.stone, { size: 40, cut: 'cabochon', label: spec.stone }) +
      '<span class="small">' + R.esc(R.stoneLabel(spec)) + '</span>';
  }

  /* 고른 큐빅 색이 어떤 색인지 옆에 바로 보여 준다 */
  function refreshCubicPeek() {
    var box = $('cubic-peek');
    if (!box) return;
    if (spec.stoneType !== 'cubic') { box.innerHTML = ''; return; }
    var name = spec.cubicColor || Object.keys(CONFIG.stones.cubic.colors)[0];
    box.innerHTML = ONM.stoneIcon(null, {
      size: 40, cut: 'round', color: CONFIG.stones.cubic.colors[name], label: name + ' 큐빅'
    }) + '<span class="small">' + R.esc(name) + ' · ' +
      (Number(spec.stoneSize) || 2).toFixed(1) + 'mm · 최종 색과 크기는 상담에서</span>';
  }

  function applyModelLimits() {
    var model = R.getModel(spec.modelId);
    [['c-thickness', 'thickness'], ['c-width', 'width']].forEach(function (p) {
      var lim = R.limitsFor(model, p[1]);
      var el = $(p[0]);
      el.min = lim.min; el.max = lim.max;
      spec[p[1]] = Math.min(lim.max, Math.max(lim.min, spec[p[1]]));
      el.value = spec[p[1]];
    });
    var sz = CONFIG.limits.sizeKR;
    $('c-size').min = sz.min; $('c-size').max = sz.max; $('c-size').value = spec.size;
    $('c-comfort').value = Math.max(0, Math.min(1, Number(spec.comfort) || 0));

    /* 뒤쪽 두께는 앞쪽을 넘을 수 없습니다 (뒤가 더 두꺼운 반지는 손에 걸립니다).
     * 0 은 "앞뒤 같게"라는 뜻이라 최솟값을 앞 두께의 절반으로 둡니다. */
    var back = $('c-backthickness');
    var lim = R.limitsFor(model, 'thickness');
    back.min = Math.max(lim.min, spec.thickness * 0.45).toFixed(1);
    back.max = spec.thickness.toFixed(1);
    if (!spec.backThickness || spec.backThickness > spec.thickness) spec.backThickness = spec.thickness;
    if (spec.backThickness < Number(back.min)) spec.backThickness = Number(back.min);
    back.value = spec.backThickness;
    $('c-organic').value = spec.organic || 0;
  }

  function setOutputs() {
    $('o-thickness').textContent = spec.thickness.toFixed(1) + 'mm';
    $('o-width').textContent = spec.width.toFixed(1) + 'mm';
    // 손가락이 굵으면 은이 더 들어가므로 큰 호수일수록 값이 단계별로 오릅니다
    var big = R.sizeSurcharge(spec.size);
    $('o-size').textContent = spec.size + '호' + (big ? ' (+' + R.formatKRW(big.price) + ')' : '');
    $('o-comfort').textContent = R.comfortLabel(spec.comfort);

    var gap = spec.thickness - (spec.backThickness || spec.thickness);
    $('o-backthickness').textContent = (spec.backThickness || spec.thickness).toFixed(1) + 'mm' +
      (gap > 0.05 ? ' (단차 ' + gap.toFixed(1) + 'mm)' : ' (앞뒤 같게)');

    var org = Number(spec.organic) || 0;
    $('o-organic').textContent = org === 0 ? '반듯하게'
      : org < 0.35 ? '살짝' : org < 0.7 ? '뚜렷하게' : '많이';

    var plate = Number(spec.plateSize) || 1;
    $('o-plate').textContent = plate < 0.8 ? '작게' : plate > 1.3 ? '크게' : '보통';

    var ang = Number(spec.stoneAngle) || 0;
    $('o-stoneangle').textContent = ang === 0 ? '손등 쪽 가운데'
      : (ang > 0 ? '오른쪽 ' : '왼쪽 ') + Math.abs(ang) + '°';

    var lift = Number(spec.stoneHeight) || 0;
    $('o-stoneheight').textContent = (lift > 0 ? '+' : '') + lift.toFixed(1) + 'mm' +
      (Math.abs(lift) < 0.05 ? ' (기본)' : lift < 0 ? ' (낮게)' : ' (높게)');
  }

  /* ───────────── 이벤트 ───────────── */
  $('c-metal').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-metal]');
    if (!btn) return;
    spec.metal = btn.getAttribute('data-metal');
    Array.prototype.forEach.call(this.querySelectorAll('.swatch'), function (s) {
      s.setAttribute('aria-pressed', String(s.getAttribute('data-metal') === spec.metal));
    });
    studio.changed();
  });

  [['c-thickness', 'thickness'], ['c-width', 'width'], ['c-size', 'size']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () {
      spec[p[1]] = p[1] === 'size' ? parseInt(this.value, 10) : parseFloat(this.value);
      // 앞 두께를 줄이면 뒤 두께도 따라 줄어야 앞뒤가 뒤집히지 않습니다
      if (p[1] === 'thickness') applyModelLimits();
      setOutputs();
      studio.changed();
    });
  });

  $('c-comfort').addEventListener('input', function () {
    spec.comfort = parseFloat(this.value) || 0;
    setOutputs();
    studio.changed();
  });

  $('c-backthickness').addEventListener('input', function () {
    spec.backThickness = parseFloat(this.value);
    setOutputs();
    studio.changed();
  });

  $('c-plate').addEventListener('input', function () {
    spec.plateSize = parseFloat(this.value);
    setOutputs();
    studio.changed();
  });

  $('c-organic').addEventListener('input', function () {
    spec.organic = parseFloat(this.value);
    setOutputs();
    studio.changed();
  });

  $('c-stoneheight').addEventListener('input', function () {
    spec.stoneHeight = parseFloat(this.value);
    setOutputs();
    studio.changed();
  });

  $('c-stoneangle').addEventListener('input', function () {
    spec.stoneAngle = parseFloat(this.value);
    spec.stoneAt = '';        // 손으로 찍어 둔 자리는 비웁니다
    setOutputs();
    studio.changed();
  });

  $('c-stonecount').addEventListener('change', function () {
    spec.stoneCount = parseInt(this.value, 10) || 1;
    spec.stoneAt = '';
    studio.changed();
  });

  $('c-review').addEventListener('change', function () {
    spec.reviewEvent = this.checked;
    studio.changed();
  });

  $('c-epoxylines').addEventListener('change', function () {
    spec.epoxyLines = parseInt(this.value, 10) || 1;
    studio.changed();
  });

  /* ───────────── 손으로 다듬기 ─────────────
   * 3D가 떠 있을 때만 쓸 수 있습니다. 켜면 화면 돌리기가 잠깐 멈추고,
   * 반지 위에서 위아래로 끌면 그 자리가 두꺼워지거나 얇아집니다. */
  /* ───────────── 손으로 다듬기 ─────────────
   * 3D가 떠 있을 때만 쓸 수 있습니다. 켜면 화면 돌리기가 잠깐 멈추고,
   * 고른 도구에 따라 반지 위에서 끌면 두께·폭·각·무광이 바뀝니다. */
  (function sculptButtons() {
    var toggle = $('sculpt-toggle'), clear = $('sculpt-clear');
    var box = $('sculpt-box'), hint = $('sculpt-hint');

    var HINTS = {
      add:    '그은 자리에만 살이 붙어 도톰해집니다. 왁스를 덧붙이듯 여러 번 그으면 더 두꺼워집니다. 살을 붙이면 은이 더 들어가므로, 최종 금액은 상담에서 무게를 보고 확정해 드립니다.',
      carve:  '그은 자리만 깎아 얇게 만듭니다. 여러 번 그을수록 더 깎입니다.',
      push:   '위로 끌면 그 자리가 도톰해지고, 아래로 끌면 얇아집니다.',
      wide:   '짚은 쪽 가장자리만 움직입니다. 위로 끌면 그쪽이 넓어지고, 아래로 끌면 좁아집니다. 넓히면 은이 더 들어가므로, 최종 금액은 상담에서 무게를 보고 확정해 드립니다.',
      chisel: '좁은 붓으로 깊게 깎아 각을 세웁니다. 어느 쪽으로 끌든 파내기만 합니다.',
      matte:  '그은 자리만 무광으로 칠합니다. 윗면 한쪽 가장자리만 칠할 수도 있습니다.',
      unmatte: '무광으로 칠한 자리를 문질러 다시 광이 나게 합니다.',
      engrave: '반지 위에 그대로 선을 그으면 그 자리가 파여 무늬가 됩니다. 유화나 에폭시를 고르면 새긴 선에 색이 들어갑니다.',
      erase:  '잘못 새긴 자리를 문질러 지웁니다.',
      stone:  '반지를 짚으면 그 자리에 알이 놓이고, 놓인 알을 다시 짚으면 빠집니다.',
      star:   '반지를 짚으면 그 자리에 별이 새겨집니다. 새긴 별을 다시 짚으면 지워집니다.',
      draw:   '반지 위에 그대로 그으면 검정으로 칠해집니다. 굵기는 아래에서 고르세요.',
      unpaint: '지우고 싶은 선을 짚으면 그 선이 통째로 지워집니다.'
    };

    function tool() {
      var on = $('sculpt-tools').querySelector('[aria-pressed="true"]');
      return on ? on.getAttribute('data-tool') : 'add';
    }

    /** 원석을 안 골랐으면 '알 놓기'는 쓸 수 없습니다 */
    function syncStoneTool() {
      var btn = $('sculpt-tools').querySelector('[data-tool="stone"]');
      if (!btn) return;
      var has = spec.stoneType && spec.stoneType !== 'none' && spec.setting !== 'none';
      btn.disabled = !has;
      btn.title = has ? '' : '먼저 오른쪽에서 원석을 고르세요';
      // 원석을 빼면 다른 도구로 돌려 놓습니다
      if (!has && btn.getAttribute('aria-pressed') === 'true') {
        Array.prototype.forEach.call($('sculpt-tools').querySelectorAll('[data-tool]'), function (x) {
          x.setAttribute('aria-pressed', String(x.getAttribute('data-tool') === 'add'));
        });
        if (studio.setSculptTool) studio.setSculptTool('add');
      }
    }

    function refresh(on) {
      syncStoneTool();
      toggle.setAttribute('aria-pressed', String(on));
      toggle.textContent = on ? '다듬기 끝내기' : '손으로 다듬기';
      toggle.classList.toggle('btn-primary', on);
      box.classList.toggle('is-hidden', !on);
      $('turn-row').classList.toggle('is-hidden', !on);
      var t = tool();
      var tap = (t === 'stone' || t === 'star' || t === 'unpaint');
      hint.textContent = (HINTS[t] || '') +
        (tap || t === 'draw' ? '' : ' 끌면서 옆으로 움직이면 붓처럼 이어집니다.') +
        ' 다듬는 중에도 오른쪽 버튼(태블릿은 두 손가락)으로 끌면 반지가 돌아갑니다.';
      // 크기 조절칸은 그 도구를 고른 동안에만 꺼냅니다
      $('f-starsize').classList.toggle('is-hidden', t !== 'star');
      $('f-drawsize').classList.toggle('is-hidden', t !== 'draw');
      clear.classList.toggle('is-hidden', !R.hasSculpt(spec) && !on);
    }

    // 3D가 준비되면 버튼을 꺼내 줍니다
    var wait = setInterval(function () {
      if (!studio.setSculptMode) return;
      clearInterval(wait);
      toggle.classList.remove('is-hidden');
      refresh(false);

      toggle.addEventListener('click', function () {
        var on = studio.setSculptMode(toggle.getAttribute('aria-pressed') !== 'true');
        refresh(on);
        /* 다듬기를 켜면 반지 화면을 맨 위로 올립니다. 그래야 반지와 아래 도구가 한 화면에
         * 같이 들어와, 도구를 고르러 내려갔다가 반지가 화면 밖으로 나가는 일이 줄어듭니다. */
        if (on) {
          var st = $('stage');
          var top = st.getBoundingClientRect().top + window.pageYOffset - 12;
          try { window.scrollTo({ top: top, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, top); }
        }
      });

      clear.addEventListener('click', function () {
        studio.clearSculpt();
        refresh(toggle.getAttribute('aria-pressed') === 'true');
      });

      $('sculpt-tools').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-tool]');
        if (!btn) return;
        Array.prototype.forEach.call(this.querySelectorAll('[data-tool]'), function (x) {
          x.setAttribute('aria-pressed', String(x === btn));
        });
        studio.setSculptTool(btn.getAttribute('data-tool'));
        refresh(true);
      });

      $('c-brush').addEventListener('input', function () {
        var v = parseFloat(this.value);
        studio.setSculptSize(v);
        $('o-brush').textContent = v < 0.8 ? '가늘게' : v > 1.5 ? '넓게' : '보통';
      });

      $('c-mirror').addEventListener('change', function () {
        studio.setSculptMirror(this.checked);
      });

      $('c-drawsize').addEventListener('input', function () {
        spec.drawSize = parseFloat(this.value) || 0.8;
        $('o-drawsize').textContent = spec.drawSize.toFixed(1) + ' mm';
      });

      $('c-starsize').addEventListener('input', function () {
        spec.starSize = parseFloat(this.value) || 3;
        $('o-starsize').textContent = spec.starSize.toFixed(1) + ' mm';
      });

      studio.onChange(function () {
        syncStoneTool();
        clear.classList.toggle('is-hidden',
          !R.hasSculpt(spec) && toggle.getAttribute('aria-pressed') !== 'true');
      });
    }, 200);
    setTimeout(function () { clearInterval(wait); }, 12000);
  })();

  ['texture', 'profile', 'plating'].forEach(function (key) {
    $('c-' + key).addEventListener('change', function () {
      spec[key] = this.value;
      if (key === 'texture' || key === 'profile') refreshTextureFields();
      if (key === 'plating') {
        // 도금을 고르면 유화는 꺼집니다
        if (spec.plating !== 'none') { spec.oxidize = false; $('c-oxidize').checked = false; }
        refreshFinishFields();
      }
      refreshEpoxyNote();
      studio.changed();
    });
  });

  $('c-stonetype').addEventListener('change', function () {
    spec.stoneType = this.value;
    if (spec.stoneType === 'natural' && !spec.stone) spec.stone = $('c-stone').value;
    if (spec.stoneType === 'cubic' && !spec.cubicColor) spec.cubicColor = $('c-cubic').value;
    if (spec.stoneType === 'moissanite' || spec.stoneType === 'cubic') {
      // 종류마다 고를 수 있는 크기가 달라서, 없는 크기면 가운데 값으로 되돌린다
      var sizes = CONFIG.stones[spec.stoneType].sizes.map(function (z) { return z.mm; });
      if (sizes.indexOf(Number(spec.stoneSize)) === -1) spec.stoneSize = sizes[Math.min(1, sizes.length - 1)];
    }
    refreshStoneFields();
    studio.changed();
  });

  $('c-stonesize').addEventListener('change', function () {
    spec.stoneSize = parseFloat(this.value) || 2;
    refreshCubicPeek();
    refreshStonePeek();
    studio.changed();
  });

  $('c-stoneshape').addEventListener('change', function () {
    spec.stoneShape = this.value;
    refreshStonePeek();
    studio.changed();
  });

  $('c-cubic').addEventListener('change', function () {
    spec.cubicColor = this.value;
    refreshCubicPeek();
    studio.changed();
  });

  $('c-grain').addEventListener('change', function () {
    spec.grain = this.value;
    studio.changed();
  });

  $('c-oxidize').addEventListener('change', function () {
    spec.oxidize = this.checked;
    if (spec.oxidize) spec.plating = 'none';
    $('c-plating').value = spec.plating;
    refreshFinishFields();
    studio.changed();
  });

  $('c-stone').addEventListener('change', function () {
    spec.stone = this.value || null;
    refreshStonePeek();
    studio.changed();
  });

  $('c-epoxy').addEventListener('change', function () {
    spec.epoxy = this.value;
    refreshEpoxyNote();
    studio.changed();
  });

  $('c-epoxycov').addEventListener('change', function () {
    spec.epoxyCoverage = this.value;
    studio.changed();
  });

  $('c-setting').addEventListener('change', function () {
    spec.setting = this.value;
    $('setting-note').textContent = R.SETTING_DESC[spec.setting] || '';
    studio.changed();
  });

  $('c-engraving').addEventListener('input', function () {
    spec.engraving = this.value.trim();
    syncPanel();
  });

  $('c-model').addEventListener('change', function () {
    var model = R.getModel(this.value);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;
    var next = R.defaultSpec(model, rec, { metal: spec.metal });
    next.size = spec.size;
    next.engraving = spec.engraving;
    Object.keys(next).forEach(function (k) { spec[k] = next[k]; });
    buildControls();
    studio.changed();
  });

  $('reset').addEventListener('click', function () {
    var model = R.getModel(spec.modelId);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;
    var next = R.defaultSpec(model, rec, { metal: spec.metal });
    Object.keys(next).forEach(function (k) { spec[k] = next[k]; });
    buildControls();
    studio.changed();
  });

  /* ───────────── 사양 · 가격 ───────────── */
  /** 일주가 실려 있으면 그 일주의 색과 십이지 아이콘을 패널에 얹는다 */
  function paintIlju() {
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;
    var box = $('studio-ilju');
    if (!rec || !ONM.zodiacColor) { box.classList.add('is-hidden'); return; }
    var color = ONM.zodiacColor(rec);
    document.body.style.setProperty('--accent', color.solid);
    document.body.style.setProperty('--accent-ink', color.ink);
    document.body.style.setProperty('--accent-tint', color.tint);
    box.innerHTML = '<span class="seal-mini">' +
      ONM.zodiacSvg(rec.branch, { label: rec.branchInfo.animal }) + '</span>' +
      '<span><b>' + R.esc(rec.id) + ' (' + R.esc(rec.hanja) + ')</b>' +
      '<br><span class="small">' + R.esc(ONM.iljuPhrase(rec)) + '</span></span>';
    box.classList.remove('is-hidden');
  }

  /* ───────────── 체험하기 / 주문 제작 ─────────────
   * 값은 어느 쪽이든 똑같습니다. 다만 "그냥 구경 중"인 분에게
   * 주문 버튼을 계속 들이밀지 않으려고 화면만 바꿉니다. */
  var use = localStorage.getItem('onm-use') === 'play' ? 'play' : 'order';

  function setUse(next, remember) {
    use = next === 'play' ? 'play' : 'order';
    if (remember) { try { localStorage.setItem('onm-use', use); } catch (e) {} }
    $('use-play').setAttribute('aria-pressed', String(use === 'play'));
    $('use-order').setAttribute('aria-pressed', String(use === 'order'));

    var playing = use === 'play';
    $('to-order').classList.toggle('is-hidden', playing && !couple.on);
    var hint = $('use-hint');
    if (hint) {
      hint.textContent = playing
        ? '지금은 체험 모드입니다. 마음껏 바꿔 보세요. 값은 그대로 보여 드리고, 주문으로 넘어가는 버튼만 감춰 뒀습니다.'
        : '';
      hint.classList.toggle('is-hidden', !playing);
    }
  }

  $('use-play').addEventListener('click', function () { setUse('play', true); });
  $('use-order').addEventListener('click', function () { setUse('order', true); });

  /* ───────────── 짝 맞추기 초대장 ─────────────
   * 보내는 쪽: 지금 맞춘 반지를 링크에 담습니다.
   * 받는 쪽: 생일만 넣으면 그 사람 일주에 맞는 반지가 옆자리에 놓입니다. */

  function inviteLink() {
    var me = ($('inv-me') && $('inv-me').value || '').trim();
    var seed = R.defaultSpec(R.getModel(spec.modelId), null, { metal: spec.metal });
    seed.size = spec.size;
    var base = location.origin + location.pathname;
    return base + '?couple=1&step=b&invite=1' +
      (me ? '&na=' + encodeURIComponent(me) : '') +
      '&a=' + pack(spec) + '&' + R.specToQuery(seed);
  }

  (function inviteMaker() {
    var open = $('make-invite'), box = $('invite-make');
    if (!open || !box) return;
    // 초대장은 커플 흐름이 아닐 때만 만듭니다 (이미 둘이 맞추는 중이면 필요 없습니다)
    if (couple.on) { open.classList.add('is-hidden'); return; }

    function refreshUrl() { $('inv-url').value = inviteLink(); }

    open.addEventListener('click', function () {
      var hidden = box.classList.toggle('is-hidden');
      if (!hidden) { refreshUrl(); $('inv-me').focus(); }
    });
    $('inv-me').addEventListener('input', refreshUrl);
    // 반지를 더 만지면 링크도 따라 바뀌어야 합니다
    studio.onChange(function () { if (!box.classList.contains('is-hidden')) refreshUrl(); });

    $('inv-copy').addEventListener('click', function () {
      refreshUrl();
      if (ONM.share) ONM.share.copyLink(inviteLink(), this);
    });

    $('inv-share').addEventListener('click', function () {
      var me = ($('inv-me').value || '').trim();
      var text = (me ? me + ' 님이' : '누군가') + ' 반지를 맞춰 두었어요. 옆에 둘 반지를 골라 주세요.';
      if (ONM.share) {
        ONM.share.share({ title: '온명 — 짝 맞추기', text: text, url: inviteLink() }, this);
      }
    });
  })();

  (function inviteLanding() {
    var box = $('invite-box');
    if (!box || !invite.on || !couple.on || couple.step !== 'b') return;
    box.classList.remove('is-hidden');

    $('invite-title').textContent = (invite.from ? invite.from + ' 님이' : '누군가') +
      ' 반지를 맞춰 두었어요.';
    $('invite-desc').textContent = '옆에 둘 반지를 골라 주세요. 생일을 넣으면 그 일주에 맞는 반지를 ' +
      '골라 드리고, 마음대로 바꾸셔도 됩니다.';
    if (specA) $('invite-ring').innerHTML = R.ringSvg(specA, { size: 96 });

    function seedFromIlju(rec) {
      // 그 일주에 가장 잘 맞는 디자인으로 갈아 끼웁니다 (첫 번째 분의 호수는 그대로 두지 않습니다)
      var pick = R.recommend(rec, { seed: 3, limit: 1, mood: 'all' })[0];
      var model = pick ? pick.model : R.getModel(spec.modelId);
      var seeded = R.defaultSpec(model, rec, { metal: spec.metal });
      seeded.size = spec.size;
      Object.keys(seeded).forEach(function (k) { spec[k] = seeded[k]; });
      spec.ilju = rec.id;
      buildControls();
      studio.changed();
    }

    $('inv-go').addEventListener('click', function () {
      var y = $('inv-y').value, m = $('inv-m').value, d = $('inv-d').value;
      var out = $('inv-result');
      if (!y || !m || !d) { out.textContent = '생년월일을 모두 넣어 주세요.'; return; }
      var res;
      try {
        res = ONM.getIlju({ year: y, month: m, day: d, hour: '' });
      } catch (err) {
        out.textContent = err.message;
        return;
      }
      var name = ($('inv-name').value || '').trim();
      seedFromIlju(res.record);
      out.textContent = (name ? name + ' 님은 ' : '') + res.record.id + '(' + res.record.hanja + ') 일주 — ' +
        ONM.iljuPhrase(res.record) + '. 이 일주에 어울리는 반지로 골라 뒀습니다. 마음대로 바꿔 보세요.';
      $('invite-form').classList.add('is-hidden');
      $('inv-go').classList.add('is-hidden');
      $('inv-skip').textContent = '다시 고르기';
    });

    $('inv-skip').addEventListener('click', function () {
      $('invite-form').classList.toggle('is-hidden');
      $('inv-go').classList.toggle('is-hidden');
      $('inv-result').textContent = '';
      this.textContent = $('invite-form').classList.contains('is-hidden')
        ? '생일 넣고 골라 받기' : '그냥 내가 직접 고를게요';
    });
  })();

  /* 커플링 단계 안내 — 지금 누구 반지를 만지고 있는지, 다음에 뭘 하는지 */
  function paintCoupleStep() {
    if (!couple.on) return;
    var box = $('couple-step');
    box.classList.remove('is-hidden');

    var onB = couple.step === 'b';
    $('step-dots').innerHTML =
      '<span class="' + (onB ? 'did' : 'on') + '">1</span>' +
      '<span class="' + (onB ? 'on' : '') + '">2</span>';

    // 초대장으로 들어온 분에게는 "두 번째 분"보다 "내 반지"가 자연스럽습니다
    if (invite.on && onB) {
      $('step-title').textContent = '옆에 둘 내 반지 고르기';
      $('step-desc').textContent = (invite.from ? invite.from + ' 님이 맞춰 둔 반지 옆에 놓입니다. ' : '') +
        '다 고르면 두 반지가 한 쌍으로 주문서에 담깁니다.';
    } else {
      $('step-title').textContent = onB
        ? '2단계 — 두 번째 분 반지 (' + personOf('b') + ')'
        : '1단계 — 첫 번째 분 반지 (' + personOf('a') + ')';
      $('step-desc').textContent = onB
        ? '두 분 반지를 각각 다르게 맞출 수 있습니다. 이 반지까지 정하면 주문서에서 한 쌍으로 묶입니다.'
        : '먼저 첫 번째 분 반지를 맞춥니다. 다 정하고 나면 두 번째 분 반지로 넘어갑니다.';
    }

    // 앞 단계에서 정해 둔 반지를 옆에 띄워 두면 짝을 맞추기 쉽습니다
    var done = $('step-done');
    if (onB && specA) {
      done.classList.remove('is-hidden');
      done.innerHTML = '<div class="preview-box stage-bg">' + R.ringSvg(specA, { size: 74 }) + '</div>' +
        '<span class="small">' + R.esc(invite.on && invite.from ? invite.from + ' 님' : '첫 번째 분') +
        '<br>' + R.esc(specA.modelName) + ' · ' +
        specA.width + '×' + specA.thickness + 'mm</span>' +
        '<button class="btn btn-sm" type="button" id="copy-from-a">이 반지 그대로 가져오기</button>';
      // 앞 분 반지를 똑같이 — 호수와 일주만 이 분 것으로 남깁니다
      $('copy-from-a').addEventListener('click', function () {
        adoptSpec(specA);
        this.textContent = '똑같이 맞췄습니다 (호수는 그대로)';
      });
    } else {
      done.classList.add('is-hidden');
      done.innerHTML = '';
    }

    var back = $('back-step');
    if (onB) {
      back.classList.remove('is-hidden');
      back.textContent = '첫 번째 분 반지 다시 고치기';
      back.href = 'studio.html?couple=1&step=a&iljuB=' + encodeURIComponent(spec.ilju || '') +
        '&' + R.specToQuery(specA || spec);
    } else {
      back.classList.add('is-hidden');
    }
  }

  /** 손으로 손댄 항목을 한 줄로 */
  function sculptNote() {
    var bits = [];
    if (spec.sculpt) bits.push('두께');
    if (spec.relief) {
      var rv = R.reliefRead(spec.relief);
      if (rv.some(function (v) { return v > 0.02; })) bits.push('살 붙이기');
      if (rv.some(function (v) { return v < -0.02; })) bits.push('살 깎기');
    }
    if (spec.sculptW || spec.sculptWa || spec.sculptWb) bits.push('폭');
    if (spec.matte || spec.matteMap) bits.push('부분 무광');
    if (spec.engrave) bits.push('도안 새김');
    if (spec.stoneAt) bits.push('알 자리 지정');
    var st = R.starList(spec);
    if (st.length) bits.push('별 조각 ' + st.length + '개');
    var dr = R.drawStrokes(spec);
    if (dr.length) bits.push('그림 ' + dr.length + '획');
    return bits.length ? ' · 손으로 다듬음 (' + bits.join('·') + ')' : '';
  }

  function syncPanel() {
    syncPickers();
    syncStonePlace();
    var model = R.getModel(spec.modelId);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;
    var rows = [];
    if (rec) rows.push(['내 일주', rec.id + ' (' + rec.hanja + ')']);
    rows.push(
      ['디자인', model.name + ' (' + R.FAMILIES[model.family].label + ')'],
      ['두께', spec.thickness.toFixed(1) + ' mm'],
      ['폭', spec.width.toFixed(1) + ' mm'],
      ['호수', spec.size + '호 (안지름 ' + R.sizeToInnerDiameter(spec.size).toFixed(1) + 'mm)'],
      ['내경 굴림', R.comfortLabel(spec.comfort)],
      ['소재', (CONFIG.price.metals[spec.metal] || {}).label || spec.metal],
      ['표면 느낌', R.textureLabel(spec)],
      ['옆모양', R.PROFILE_LABEL[spec.profile]],
      ['원석', R.stoneLabel(spec)],
      ['고정 방법', (spec.stoneType && spec.stoneType !== 'none')
        ? R.SETTING_LABEL[spec.setting] + ' (공임은 원석 값에 포함)' : '—'],
      ['겉면 마감', spec.oxidize
        ? CONFIG.oxidize.label
        : (CONFIG.plating[spec.plating || 'none'] || {}).label],
      ['앞뒤 두께', spec.thickness.toFixed(1) + ' / ' +
        (spec.backThickness || spec.thickness).toFixed(1) + ' mm'],
      ['굴곡', $('o-organic').textContent + sculptNote()],
      ['색 채움', (CONFIG.epoxy.colors[spec.epoxy || ''] || {}).label +
        (spec.epoxy ? ' · ' + (CONFIG.epoxy.coverage[spec.epoxyCoverage || 'part'] || {}).label : '')],
      ['각인', (spec.engraving || '없음') +
        (spec.engraving && spec.reviewEvent ? ' · 리뷰 이벤트로 무료' : '')]
    );
    $('spec-body').innerHTML = rows.map(function (r) {
      return '<tr><th>' + R.esc(r[0]) + '</th><td>' + R.esc(r[1]) + '</td></tr>';
    }).join('');

    var price = R.estimatePrice(spec, couple.on ? 1 : (spec.quantity || 1));
    $('price-out').textContent = R.priceText(price, 'unit');
    // 값이 어떻게 나왔는지 한 줄씩 펼쳐 둡니다
    $('price-body').innerHTML = R.priceBreakdown(price).map(function (r) {
      return '<tr><th>' + R.esc(r[0]) + '</th><td>' + R.formatKRW(r[1]) + '</td></tr>';
    }).join('');
    // 값이 안 나오는 치수면 왜 그런지 바로 알려 준다
    var consultBox = $('price-consult');
    if (consultBox) {
      consultBox.textContent = price && price.consult
        ? price.consult + ' 아래 "커스텀 주문 상담"으로 넘어가시면 치수를 보고 값을 내 드립니다.'
        : '';
      consultBox.classList.toggle('is-hidden', !(price && price.consult));
    }
    var btn = $('to-order');
    if (couple.on && couple.step === 'a') {
      // 다음은 두 번째 분 반지 — 지금 사양을 a= 에 싣고 넘어갑니다
      var seedB = R.defaultSpec(R.getModel(spec.modelId),
        couple.iljuB && ONM.ILJU ? ONM.ILJU[couple.iljuB] : null, { metal: spec.metal });
      seedB.size = spec.size;
      btn.textContent = '두 번째 분 반지 정하기 →';
      btn.href = 'studio.html?couple=1&step=b&a=' + pack(spec) + '&' + R.specToQuery(seedB);
      history.replaceState(null, '', location.pathname + '?couple=1&step=a&iljuB=' +
        encodeURIComponent(couple.iljuB) + '&' + R.specToQuery(spec));

    } else if (couple.on) {
      // 두 반지가 모두 정해졌으니 한 쌍으로 주문서에 넘깁니다
      btn.textContent = '두 반지 주문서로 넘어가기 →';
      btn.href = 'order.html?couple=1&a=' + packRaw(couple.rawA) + '&b=' + pack(spec) + '&qty=2';
      history.replaceState(null, '', location.pathname + '?couple=1&step=b&a=' +
        packRaw(couple.rawA) + '&' + R.specToQuery(spec));

    } else {
      // 수량(커플링이면 2개)은 스튜디오를 거쳐도 주문서까지 그대로 따라갑니다
      var extra = spec.quantity > 1 ? { qty: spec.quantity } : null;
      btn.textContent = '이 사양으로 주문 상담';
      btn.href = 'order.html?' + R.specToQuery(spec, extra);
      history.replaceState(null, '', location.pathname + '?' + R.specToQuery(spec, extra));
    }
    paintCoupleStep();
    if (couple.on) $('use-switch').classList.add('is-hidden');
    else setUse(use, false);
  }

  /* ───────────── 버튼 ───────────── */
  $('snap').addEventListener('click', function () {
    var url, name = 'onmyeong-' + spec.modelId + '-t' + spec.thickness + '-w' + spec.width + '-' + spec.size + 'ho';
    if (studio.ready3d && studio.snapshot) {
      url = studio.snapshot();
      name += '.png';
    } else {
      url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(R.ringSvg(spec, { size: 600 }));
      name += '.svg';
    }
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  });

  $('spin').addEventListener('click', function () {
    if (!studio.ready3d || !studio.toggleSpin) return;
    this.textContent = studio.toggleSpin() ? '회전 멈춤' : '회전 시작';
  });

  /* ───────────── 사양 복사 · 붙여넣기 ─────────────
   * 복사한 글에는 사양 한 줄과 이 화면 링크가 담깁니다.
   * 붙여넣기는 그 링크에서 사양을 읽어 지금 화면에 그대로 옮깁니다 —
   * 커플링이면 앞 분 반지를 뒷 분에게, 매장에서는 앞 손님 반지를 다음 손님에게. */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }
  // 클립보드 권한이 막힌 브라우저용 — 숨긴 글상자를 잠깐 골라 복사합니다
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  $('copy-spec').addEventListener('click', function () {
    var btn = this;
    var text = R.describeSpec(spec) + '\n' + location.href;
    copyText(text).then(function (ok) {
      btn.textContent = ok ? '복사했습니다' : '복사 실패';
      setTimeout(function () { btn.textContent = '사양 복사'; }, 2000);
      // 복사가 막혔으면 붙여넣기 칸에 담아 두어 손으로라도 옮길 수 있게 합니다
      if (!ok) openPaste(text, '자동 복사가 막혀 있어 여기에 담아 두었습니다. 글을 길게 눌러 복사해 주세요.');
    });
  });

  /** 붙여 넣은 글(사양 한 줄 + 링크, 또는 링크만)에서 사양을 읽습니다 */
  function specFromText(text) {
    var found = null;
    String(text || '').split(/\s+/).forEach(function (tok) {
      if (tok.indexOf('modelId=') === -1) return;
      var q = tok.indexOf('?') >= 0 ? tok.slice(tok.indexOf('?') + 1) : tok;
      found = q.replace(/#.*$/, '');
    });
    return found ? R.specFromQuery(found) : null;
  }

  // 사람마다 다른 것 — 붙여 넣어도 지금 분 것을 그대로 둡니다
  var OWN_KEYS = ['size', 'ilju', 'quantity', 'qty'];
  /** 다른 사양을 지금 화면으로 옮깁니다 (되돌리기로 무를 수 있습니다) */
  function adoptSpec(src) {
    var o = JSON.parse(JSON.stringify(src));
    Object.keys(o).forEach(function (k) { if (k.charAt(0) === '_') delete o[k]; });
    OWN_KEYS.forEach(function (k) {
      if (spec[k] !== undefined) o[k] = spec[k]; else delete o[k];
    });
    Object.keys(spec).forEach(function (k) { delete spec[k]; });
    Object.keys(o).forEach(function (k) { spec[k] = o[k]; });
    buildControls();
    studio.changed();
  }
  studio.adoptSpec = adoptSpec;

  function openPaste(prefill, msg) {
    $('paste-box').classList.remove('is-hidden');
    $('paste-in').value = prefill || '';
    $('paste-msg').textContent = msg ||
      '호수와 일주는 지금 분 것을 그대로 두고, 디자인·치수·원석·마감·각인을 가져옵니다.';
    if (!prefill) $('paste-in').focus();
  }
  function closePaste() { $('paste-box').classList.add('is-hidden'); }

  function applyPasted(text) {
    var got = specFromText(text);
    if (!got) {
      openPaste(text, '사양을 찾지 못했습니다. "사양 복사"로 복사한 글이나 스튜디오 링크를 붙여 넣어 주세요.');
      return false;
    }
    adoptSpec(got);
    closePaste();
    var btn = $('paste-spec');
    btn.textContent = got.modelName + ' 사양으로 바꿨습니다';
    setTimeout(function () { btn.textContent = '사양 붙여넣기'; }, 2600);
    return true;
  }

  $('paste-spec').addEventListener('click', function () {
    // 클립보드를 바로 읽을 수 있으면 한 번에, 아니면 붙여 넣을 칸을 엽니다
    if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) {
      navigator.clipboard.readText().then(function (t) {
        if (!specFromText(t)) openPaste(t && t.length < 4000 ? t : '');
        else applyPasted(t);
      }, function () { openPaste(); });
    } else {
      openPaste();
    }
  });
  $('paste-apply').addEventListener('click', function () { applyPasted($('paste-in').value); });
  $('paste-cancel').addEventListener('click', closePaste);
  // 붙여 넣는 순간 바로 바꿔 줍니다 (버튼을 한 번 더 누를 필요 없이)
  $('paste-in').addEventListener('paste', function () {
    var el = this;
    setTimeout(function () { if (specFromText(el.value)) applyPasted(el.value); }, 0);
  });

  /* PDF 리포트 — 맞춘 반지(지금 화면 그대로의 사진 · 사양 · 예상 금액)와 일주 리포트를 함께 */
  $('pdf-spec').addEventListener('click', function () {
    var shot = studio.ready3d && studio.snapshot ? studio.snapshot() : null;
    var people = [], rings = [];
    if (couple.on && couple.step === 'b' && specA) {
      if (specA.ilju) people.push({ ilju: specA.ilju });
      if (spec.ilju) people.push({ ilju: spec.ilju });
      rings.push({ spec: specA, who: '첫 번째 분' + (specA.ilju ? ' · ' + specA.ilju : '') });
      rings.push({ spec: spec, image: shot, who: '두 번째 분' + (spec.ilju ? ' · ' + spec.ilju : '') });
    } else {
      if (spec.ilju) people.push({ ilju: spec.ilju, name: Q.get('n') || '' });
      rings.push({ spec: spec, image: shot });
    }
    ONM.pdfReport.download({ people: people, rings: rings }, this);
  });

  /* ───────────── 3D 로딩 감시 ─────────────
   * WebGL을 못 쓰는 기기에서는 3D가 끝내 준비되지 않습니다.
   * 6초가 지나면 2D 미리보기로 계속 쓰도록 안내만 띄우고 나머지 기능은 그대로 둡니다. */
  setTimeout(function () {
    if (studio.ready3d) return;
    $('fallback').classList.remove('is-hidden');
    $('stage').classList.add('is-hidden');
    $('spin').classList.add('is-hidden');
    $('snap').textContent = '이미지로 저장 (SVG)';
  }, 6000);

  buildControls();
  paintIlju();
  render2d();
  syncPanel();

  // 처음 연 그대로를 첫 장으로 — 여기까지 되돌릴 수 있습니다
  hist.cur = snapSpec();
  paintHistory();
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);

  /* 단축키 — Ctrl+Z 되돌리기, Ctrl+Shift+Z · Ctrl+Y 다시 하기 (맥은 Cmd).
   * 각인 칸처럼 글자를 치는 중에는 그 칸의 글자 되돌리기를 그대로 둡니다. */
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var t = e.target;
    var typing = t && (t.tagName === 'TEXTAREA' || t.isContentEditable ||
      (t.tagName === 'INPUT' && /^(text|search|email|tel|url|number|password)$/i.test(t.type || 'text')));
    if (typing) return;
    var k = (e.key || '').toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
  });

  /* 다듬는 동안 반지 돌리기 — 버튼으로 30°씩 바퀴처럼 돌립니다 */
  $('turn-left').addEventListener('click', function () { if (studio.turnRing) studio.turnRing(30); });
  $('turn-right').addEventListener('click', function () { if (studio.turnRing) studio.turnRing(-30); });
})();
