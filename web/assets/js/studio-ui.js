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
    }
  };

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
    var bigFrom = CONFIG.price.bigSize ? CONFIG.price.bigSize.from : 99;
    // 손가락이 굵으면 은이 더 들어가므로 큰 호수부터 값이 한 번 오릅니다
    $('o-size').textContent = spec.size + '호' +
      (spec.size >= bigFrom ? ' (+' + R.formatKRW(CONFIG.price.bigSize.price) + ')' : '');

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
      push:   '위로 끌면 그 자리가 도톰해지고, 아래로 끌면 얇아집니다.',
      wide:   '위로 끌면 그 자리가 넓어지고, 아래로 끌면 좁아집니다.',
      chisel: '좁은 붓으로 깊게 깎아 각을 세웁니다. 어느 쪽으로 끌든 파내기만 합니다.',
      matte:  '끄는 자리를 무광으로 칠합니다. 아래로 끌면 다시 광이 납니다.',
      engrave: '반지 위에 그대로 선을 그으면 그 자리가 파여 무늬가 됩니다. 유화나 에폭시를 고르면 새긴 선에 색이 들어갑니다.',
      erase:  '잘못 새긴 자리를 문질러 지웁니다.',
      stone:  '반지를 짚으면 그 자리에 알이 놓이고, 놓인 알을 다시 짚으면 빠집니다.',
      star:   '반지를 짚으면 그 자리에 별이 새겨집니다. 새긴 별을 다시 짚으면 지워집니다.',
      draw:   '반지 위에 그대로 그으면 검정으로 칠해집니다. 굵기는 아래에서 고르세요.',
      unpaint: '지우고 싶은 선을 짚으면 그 선이 통째로 지워집니다.'
    };

    function tool() {
      var on = $('sculpt-tools').querySelector('[aria-pressed="true"]');
      return on ? on.getAttribute('data-tool') : 'push';
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
          x.setAttribute('aria-pressed', String(x.getAttribute('data-tool') === 'push'));
        });
        if (studio.setSculptTool) studio.setSculptTool('push');
      }
    }

    function refresh(on) {
      syncStoneTool();
      toggle.setAttribute('aria-pressed', String(on));
      toggle.textContent = on ? '다듬기 끝내기' : '손으로 다듬기';
      toggle.classList.toggle('btn-primary', on);
      box.classList.toggle('is-hidden', !on);
      var t = tool();
      var tap = (t === 'stone' || t === 'star' || t === 'unpaint');
      hint.textContent = (HINTS[t] || '') +
        (tap || t === 'draw' ? '' : ' 끌면서 옆으로 움직이면 붓처럼 이어집니다.');
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
        refresh(studio.setSculptMode(toggle.getAttribute('aria-pressed') !== 'true'));
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

  /* 커플링 단계 안내 — 지금 누구 반지를 만지고 있는지, 다음에 뭘 하는지 */
  function paintCoupleStep() {
    if (!couple.on) return;
    var box = $('couple-step');
    box.classList.remove('is-hidden');

    var onB = couple.step === 'b';
    $('step-dots').innerHTML =
      '<span class="' + (onB ? 'did' : 'on') + '">1</span>' +
      '<span class="' + (onB ? 'on' : '') + '">2</span>';

    $('step-title').textContent = onB
      ? '2단계 — 두 번째 분 반지 (' + personOf('b') + ')'
      : '1단계 — 첫 번째 분 반지 (' + personOf('a') + ')';
    $('step-desc').textContent = onB
      ? '두 분 반지를 각각 다르게 맞출 수 있습니다. 이 반지까지 정하면 주문서에서 한 쌍으로 묶입니다.'
      : '먼저 첫 번째 분 반지를 맞춥니다. 다 정하고 나면 두 번째 분 반지로 넘어갑니다.';

    // 앞 단계에서 정해 둔 반지를 옆에 띄워 두면 짝을 맞추기 쉽습니다
    var done = $('step-done');
    if (onB && specA) {
      done.classList.remove('is-hidden');
      done.innerHTML = '<div class="preview-box stage-bg">' + R.ringSvg(specA, { size: 74 }) + '</div>' +
        '<span class="small">첫 번째 분<br>' + R.esc(specA.modelName) + ' · ' +
        specA.width + '×' + specA.thickness + 'mm</span>';
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
    if (spec.sculptW) bits.push('폭');
    if (spec.matte) bits.push('부분 무광');
    if (spec.engrave) bits.push('도안 새김');
    if (spec.stoneAt) bits.push('알 자리 지정');
    var st = R.starList(spec);
    if (st.length) bits.push('별 조각 ' + st.length + '개');
    var dr = R.drawStrokes(spec);
    if (dr.length) bits.push('그림 ' + dr.length + '획');
    return bits.length ? ' · 손으로 다듬음 (' + bits.join('·') + ')' : '';
  }

  function syncPanel() {
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
      ['각인', spec.engraving || '없음']
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

  $('copy-spec').addEventListener('click', function () {
    var btn = this;
    var text = R.describeSpec(spec) + '\n' + location.href;
    var done = function (ok) {
      btn.textContent = ok ? '복사했습니다' : '복사 실패';
      setTimeout(function () { btn.textContent = '사양 복사'; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else { done(false); }
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
})();
