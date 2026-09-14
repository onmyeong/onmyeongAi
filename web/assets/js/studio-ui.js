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
    fillSelect($('c-profile'), pairs(R.PROFILE_LABEL), spec.profile);
    fillSelect($('c-setting'), pairs(R.SETTING_LABEL), spec.setting);

    // 원석 — 내 일주 추천 원석을 위로
    var rec = spec.ilju && ONM.ILJU[spec.ilju];
    var mine = rec ? rec.stones.map(function (s) { return s[0]; }) : [];
    var all = Object.keys(ONM.STONE_COLOR).filter(function (s) { return mine.indexOf(s) === -1; });
    var opts = [['', '원석 없음']]
      .concat(mine.map(function (s) { return [s, s + ' (내 일주 추천)']; }))
      .concat(all.map(function (s) { return [s, s]; }));
    fillSelect($('c-stone'), opts, spec.stone || '');

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

  ['texture', 'profile', 'setting'].forEach(function (key) {
    $('c-' + key).addEventListener('change', function () {
      spec[key] = this.value;
      studio.changed();
    });
  });

  $('c-stone').addEventListener('change', function () {
    spec.stone = this.value || null;
    if (spec.stone && spec.setting === 'none') {
      spec.setting = 'bezel';
      $('c-setting').value = 'bezel';
    }
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
  function syncPanel() {
    var model = R.getModel(spec.modelId);
    var rec = spec.ilju ? ONM.ILJU[spec.ilju] : null;
    var rows = [];
    if (rec) rows.push(['내 일주', rec.id + ' (' + rec.hanja + ')']);
    rows.push(
      ['디자인', model.name + ' (' + R.FAMILIES[model.family].label + ')'],
      ['두께', spec.thickness.toFixed(1) + ' mm'],
      ['높이 · 폭', spec.width.toFixed(1) + ' mm'],
      ['호수', spec.size + '호 (내경 ' + R.sizeToInnerDiameter(spec.size).toFixed(1) + 'mm)'],
      ['금속', (CONFIG.price.metals[spec.metal] || {}).label || spec.metal],
      ['표면 마감', R.TEXTURE_LABEL[spec.texture]],
      ['단면', R.PROFILE_LABEL[spec.profile]],
      ['원석', spec.stone ? spec.stone + ' · ' + R.SETTING_LABEL[spec.setting] : '없음'],
      ['각인', spec.engraving || '없음']
    );
    $('spec-body').innerHTML = rows.map(function (r) {
      return '<tr><th>' + R.esc(r[0]) + '</th><td>' + R.esc(r[1]) + '</td></tr>';
    }).join('');

    var price = R.estimatePrice(spec, 1);
    $('price-out').textContent = price ? R.formatKRW(price.unit) : '-';
    $('to-order').href = 'order.html?' + R.specToQuery(spec);
    history.replaceState(null, '', location.pathname + '?' + R.specToQuery(spec));
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
  render2d();
  syncPanel();
})();
