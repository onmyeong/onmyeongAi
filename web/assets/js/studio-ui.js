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

    // 모이사나이트 알 크기
    fillSelect($('c-stonesize'), CONFIG.stones.moissanite.sizes.map(function (z) {
      return [String(z.mm), z.label + ' — ' + z.hint + ' (+' + z.price.toLocaleString('ko-KR') + '원)'];
    }), String(Number(spec.stoneSize) || 2));

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
    var deepTexture = ['diamond', 'sandbar'].indexOf(spec.texture) !== -1;
    var hasGroove = (model.twist || 0) > 0 || deepTexture || spec.profile === 'step';
    var note = '';
    if (spec.epoxy && !hasGroove) {
      note = '이 디자인은 표면이 매끈해서 채울 홈이 거의 없습니다. ' +
        '결이 있는 마감(망치 자국 · 모래 · 바위)이나 비틀린 디자인에서 색이 또렷하게 남습니다.';
    } else if (spec.epoxy) {
      note = '파인 결을 따라 색이 남습니다.';
    }
    $('epoxy-note').textContent = note;
  }

  /* 고른 원석에 따라 필요한 칸만 남기고, 고를 수 있는 고정 방법도 추려 준다.
   * 천연석은 캐보션이라 테두리로 감싸는 방식밖에 안 되기 때문이다. */
  function refreshStoneFields() {
    var type = spec.stoneType || 'none';
    var has = type !== 'none';

    // 알 크기는 모이사나이트와 컬러큐빅이 고를 수 있습니다
    $('f-stonesize').classList.toggle('is-hidden', type !== 'moissanite' && type !== 'cubic');
    $('f-stone').classList.toggle('is-hidden', type !== 'natural');
    $('f-cubic').classList.toggle('is-hidden', type !== 'cubic');
    $('f-setting').classList.toggle('is-hidden', !has);

    if (type === 'moissanite' || type === 'cubic') {
      var kind = CONFIG.stones[type];
      fillSelect($('c-stonesize'), kind.sizes.map(function (z) {
        return [String(z.mm), z.label + ' — ' + z.hint +
          (z.price ? ' (+' + z.price.toLocaleString('ko-KR') + '원)' : '')];
      }), String(Number(spec.stoneSize) || 2));
    }

    var note = (CONFIG.stones[type] || {}).note || '';
    $('stone-note').textContent = note;

    refreshEpoxyNote();
    refreshStonePeek();
    refreshCubicPeek();

    if (!has) { spec.setting = 'none'; return; }

    var allowed = R.settingsFor(type);
    if (allowed.indexOf(spec.setting) === -1) spec.setting = allowed[0];
    fillSelect($('c-setting'), allowed.map(function (k) { return [k, R.SETTING_LABEL[k]]; }), spec.setting);
  }

  /* 고른 천연석이 실제로 어떤 알인지 옆에 바로 보여 준다 */
  function refreshStonePeek() {
    var box = $('stone-peek');
    if (!box) return;
    if (spec.stoneType !== 'natural' || !spec.stone) { box.innerHTML = ''; return; }
    box.innerHTML = ONM.stoneIcon(spec.stone, { size: 40, cut: 'cabochon', label: spec.stone }) +
      '<span class="small">' + R.esc(spec.stone) + ' · 캐보션 ' +
      CONFIG.stones.natural.mm.toFixed(1) + 'mm</span>';
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
  }

  function setOutputs() {
    $('o-thickness').textContent = spec.thickness.toFixed(1) + 'mm';
    $('o-width').textContent = spec.width.toFixed(1) + 'mm';
    $('o-size').textContent = spec.size + '호';
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
      setOutputs();
      studio.changed();
    });
  });

  ['texture', 'profile', 'setting', 'plating'].forEach(function (key) {
    $('c-' + key).addEventListener('change', function () {
      spec[key] = this.value;
      if (key === 'texture') refreshTextureFields();
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

  function syncPanel() {
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
      ['색 채움', (CONFIG.epoxy.colors[spec.epoxy || ''] || {}).label],
      ['각인', spec.engraving || '없음']
    );
    $('spec-body').innerHTML = rows.map(function (r) {
      return '<tr><th>' + R.esc(r[0]) + '</th><td>' + R.esc(r[1]) + '</td></tr>';
    }).join('');

    var price = R.estimatePrice(spec, 1);
    $('price-out').textContent = R.priceText(price, 'unit');
    // 값이 안 나오는 치수면 왜 그런지 바로 알려 준다
    var consultBox = $('price-consult');
    if (consultBox) {
      consultBox.textContent = price && price.consult
        ? price.consult + ' 아래 "커스텀 주문 상담"으로 넘어가시면 치수를 보고 값을 내 드립니다.'
        : '';
      consultBox.classList.toggle('is-hidden', !(price && price.consult));
    }
    // 수량(커플링이면 2개)은 스튜디오를 거쳐도 주문서까지 그대로 따라갑니다
    var extra = spec.quantity > 1 ? { qty: spec.quantity } : null;
    $('to-order').href = 'order.html?' + R.specToQuery(spec, extra);
    history.replaceState(null, '', location.pathname + '?' + R.specToQuery(spec, extra));
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
