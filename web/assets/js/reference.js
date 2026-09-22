/*
 * 온명 — 레퍼런스 사진
 * ------------------------------------------------------------------
 * "이런 느낌으로 만들어 주세요" 하고 가져오신 사진을 스튜디오에 띄워
 * 3D 미리보기와 나란히 놓고, 겹쳐 보면서 치수를 맞출 수 있게 합니다.
 *
 * 사진은 이 브라우저 안에만 있습니다.
 *  · 어디로도 올라가지 않습니다 (서버가 없는 정적 사이트입니다)
 *  · 브라우저 저장소(IndexedDB)에 담아 두어 주문서 화면까지 따라갑니다
 *  · "지우기"를 누르거나 브라우저 저장 자료를 지우면 함께 사라집니다
 *
 * 사진을 3D 모델로 자동 변환하지는 못합니다. 사진을 보면서 사람이 맞추는
 * 도구라는 점을 화면에서도 그대로 말합니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};

  var DB = 'onmyeong', STORE = 'refs', KEY = 'studio';
  var MAX_N = 3;                 // 한 번에 가질 수 있는 사진 수
  var MAX_PX = 1400;             // 긴 변 기준으로 줄여서 담습니다
  var MAX_BYTES = 12 * 1024 * 1024;

  /* ───────────────── 저장소 ───────────────── */

  var conn = null;
  function open() {
    if (conn) return conn;
    conn = new Promise(function (ok, no) {
      if (!global.indexedDB) { no(new Error('no-idb')); return; }
      var rq = global.indexedDB.open(DB, 1);
      rq.onupgradeneeded = function () {
        if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE);
      };
      rq.onsuccess = function () { ok(rq.result); };
      rq.onerror = function () { conn = null; no(rq.error); };
    });
    return conn;
  }

  function load() {
    return open().then(function (db) {
      return new Promise(function (ok) {
        var rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        rq.onsuccess = function () { ok(Array.isArray(rq.result) ? rq.result : []); };
        rq.onerror = function () { ok([]); };
      });
    }).catch(function () { return []; });
  }

  function save(list) {
    return open().then(function (db) {
      return new Promise(function (ok, no) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(list, KEY);
        tx.oncomplete = function () { ok(true); };
        tx.onerror = function () { no(tx.error); };
      });
    });
  }

  /* ───────────────── 사진 줄이기 ─────────────────
   * 원본 그대로 담으면 저장소가 금세 찹니다. 긴 변을 1400px 로 줄이고
   * JPEG 로 다시 구워 담습니다. 눈으로 보고 맞추는 용도라 이 정도면 충분합니다. */

  function shrink(file) {
    return new Promise(function (ok, no) {
      if (!/^image\//.test(file.type)) { no(new Error('사진 파일만 올릴 수 있습니다.')); return; }
      if (file.size > MAX_BYTES) { no(new Error('사진이 너무 큽니다. 12MB 아래로 줄여서 올려 주세요.')); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * k));
        var h = Math.max(1, Math.round(img.height * k));
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try {
          ok({ name: file.name || '레퍼런스.jpg', w: w, h: h, url: cv.toDataURL('image/jpeg', 0.82) });
        } catch (e) { no(new Error('사진을 읽지 못했습니다.')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error('사진을 읽지 못했습니다.')); };
      img.src = url;
    });
  }

  /* ───────────────── 스튜디오 화면 ───────────────── */

  function mountStudio() {
    var box = document.getElementById('ref-box');
    if (!box) return;
    var input = document.getElementById('ref-file');
    var strip = document.getElementById('ref-strip');
    var fade = document.getElementById('ref-fade');
    var fadeRow = document.getElementById('ref-fade-row');
    var clear = document.getElementById('ref-clear');
    var msg = document.getElementById('ref-msg');
    var stage = document.getElementById('stage');
    var list = [];
    var picked = 0;

    /* 3D 화면 위에 겹쳐 놓을 판 — 처음에는 투명합니다 */
    var over = document.createElement('div');
    over.className = 'ref-overlay';
    over.setAttribute('aria-hidden', 'true');
    if (stage) stage.appendChild(over);

    function note(text, kind) {
      msg.textContent = text || '';
      msg.className = 'small' + (kind === 'warn' ? ' warn-text' : '');
    }

    function paintOverlay() {
      var v = Number(fade.value);
      var on = list.length && v > 0;
      over.style.opacity = on ? (v / 100) : 0;
      over.style.backgroundImage = list.length ? 'url(' + list[picked].url + ')' : '';
      var out = document.getElementById('o-ref-fade');
      if (out) out.textContent = v === 0 ? '끄기' : v + '%';
    }

    function draw() {
      strip.innerHTML = '';
      list.forEach(function (it, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ref-thumb' + (i === picked ? ' is-on' : '');
        b.style.backgroundImage = 'url(' + it.url + ')';
        b.title = it.name;
        b.setAttribute('aria-label', it.name + ' — 겹쳐 볼 사진으로 고르기');
        b.setAttribute('aria-pressed', i === picked ? 'true' : 'false');
        b.onclick = function () { picked = i; draw(); paintOverlay(); };
        var x = document.createElement('span');
        x.className = 'ref-x';
        x.textContent = '×';
        x.title = '이 사진 지우기';
        x.onclick = function (e) {
          e.stopPropagation();
          list.splice(i, 1);
          if (picked >= list.length) picked = Math.max(0, list.length - 1);
          save(list).catch(function () {});
          draw(); paintOverlay();
          note(list.length ? '' : '사진을 모두 지웠습니다.');
        };
        b.appendChild(x);
        strip.appendChild(b);
      });
      var has = list.length > 0;
      strip.classList.toggle('is-hidden', !has);
      fadeRow.classList.toggle('is-hidden', !has);
      clear.classList.toggle('is-hidden', !has);
      var mrow = document.getElementById('ref-measure-row');
      if (mrow) mrow.classList.toggle('is-hidden', !has);
      input.disabled = list.length >= MAX_N;
    }

    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      input.value = '';
      if (!files.length) return;
      note('사진을 읽는 중입니다…');
      var room = MAX_N - list.length;
      if (room <= 0) {
        note('사진은 ' + MAX_N + '장까지 올릴 수 있습니다. 한 장을 지우고 다시 올려 주세요.', 'warn');
        return;
      }
      if (files.length > room) {
        files = files.slice(0, room);
        note('사진은 ' + MAX_N + '장까지 올릴 수 있어 앞의 ' + room + '장만 담았습니다.', 'warn');
      }
      Promise.all(files.map(shrink)).then(function (items) {
        list = list.concat(items).slice(0, MAX_N);
        picked = list.length - 1;
        /* 화면부터 그립니다. 저장소에 담는 일은 뒤에서 하고,
         * 실패하더라도 이번 화면에서는 사진을 그대로 쓸 수 있게 둡니다. */
        draw();
        if (Number(fade.value) === 0) fade.value = 35;
        paintOverlay();
        if (!/장까지/.test(msg.textContent)) note('');
        save(list).catch(function () {
          note('사진을 이 브라우저에 담아 두지 못했습니다. 지금 화면에서는 쓸 수 있지만 ' +
            '새로고침하면 사라지니, 주문서를 넘기기 전에 사진을 따로 챙겨 주세요.', 'warn');
        });
      }).catch(function (e) {
        note(e && e.message ? e.message : '사진을 담지 못했습니다.', 'warn');
      });
    });

    fade.addEventListener('input', paintOverlay);

    clear.addEventListener('click', function () {
      list = []; picked = 0;
      save(list).catch(function () {});
      draw(); paintOverlay();
      note('사진을 모두 지웠습니다.');
    });

    mountMeasure(function () { return list; }, function () { return picked; });

    load().then(function (saved) {
      list = saved.slice(0, MAX_N);
      draw();
      paintOverlay();
    });
  }

  /* ───────────────── 사진에서 치수 재기 ─────────────────
   * 사진을 3D 반지로 자동 변환하지는 못합니다. 사진 한 장으로는
   * 어디가 몇 밀리인지 알 방법이 없기 때문입니다.
   *
   * 대신 사진 안에 "이미 아는 길이"를 하나 두면 나머지를 잴 수 있습니다.
   * 반지 안쪽 구멍의 지름이 그것입니다 — 호수가 정해져 있으니 몇 mm 인지 압니다.
   * 그 구멍을 자 삼아, 폭과 두께를 비례로 환산합니다.
   *
   *   폭(mm) = (밴드 폭 픽셀 / 구멍 지름 픽셀) × 그 호수의 안지름(mm)
   *
   * 비스듬히 찍힌 사진이면 구멍이 타원으로 보이는데, 그때는 긴 쪽을 재야
   * 실제 지름과 같습니다. 화면에서도 그렇게 안내합니다.
   */

  var STEPS = [
    { key: 'hole',  ask: '반지 안쪽 구멍을 가로질러 선을 그어 주세요',
      tip: '이 길이를 자로 씁니다. 비스듬히 찍혀 구멍이 타원이면 긴 쪽을 재 주세요.', skip: false },
    { key: 'width', ask: '밴드 폭 — 손가락을 감싸는 너비를 그어 주세요',
      tip: '반지를 옆에서 본 면의 위아래 길이입니다.', skip: true },
    { key: 'thick', ask: '두께 — 반지 살의 두께를 그어 주세요',
      tip: '구멍 가장자리에서 바깥 가장자리까지, 살이 두꺼운 정도입니다.', skip: true }
  ];

  function mountMeasure(getList, getPicked) {
    var openBtn = document.getElementById('ref-measure');
    var row = document.getElementById('ref-measure-row');
    var box = document.getElementById('ref-measure-box');
    if (!openBtn || !box) return null;

    var canvas = document.getElementById('ref-canvas');
    var stepEl = document.getElementById('ref-step');
    var askEl = document.getElementById('ref-ask');
    var tipEl = document.getElementById('ref-tip');
    var resultEl = document.getElementById('ref-result');
    var step = 0, lines = {}, drag = null, img = null, fit = null;
    var svg = null, pixels = null;

    function show(on) {
      box.classList.toggle('is-hidden', !on);
      box.setAttribute('aria-hidden', on ? 'false' : 'true');
    }

    /* 사진을 판 크기에 맞춰 그리고, 화면 좌표 ↔ 사진 좌표 비율을 기억해 둡니다 */
    function layout() {
      if (!img) return;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      var k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      fit = { k: k, w: img.naturalWidth * k, h: img.naturalHeight * k };
      fit.x = (w - fit.w) / 2;
      fit.y = (h - fit.h) / 2;
      img.draggable = false;
      img.style.cssText = 'position:absolute;pointer-events:none;user-select:none;left:' + fit.x +
        'px;top:' + fit.y + 'px;width:' + fit.w + 'px;height:' + fit.h + 'px';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      redraw();
    }

    function redraw() {
      var html = '';
      ['hole', 'width', 'thick'].forEach(function (k, i) {
        var L = lines[k];
        if (!L) return;
        html += '<line x1="' + L.x1 + '" y1="' + L.y1 + '" x2="' + L.x2 + '" y2="' + L.y2 +
          '" class="rm-line rm-' + k + '"/>' +
          '<circle cx="' + L.x1 + '" cy="' + L.y1 + '" r="4" class="rm-dot"/>' +
          '<circle cx="' + L.x2 + '" cy="' + L.y2 + '" r="4" class="rm-dot"/>';
      });
      if (drag) {
        html += '<line x1="' + drag.x1 + '" y1="' + drag.y1 + '" x2="' + drag.x2 + '" y2="' + drag.y2 +
          '" class="rm-line rm-live"/>';
      }
      svg.innerHTML = html;
    }

    function ask() {
      var s = STEPS[step];
      stepEl.textContent = (step + 1) + ' / ' + STEPS.length;
      askEl.textContent = s ? s.ask : '다 됐습니다';
      tipEl.textContent = s ? s.tip : '';
      document.getElementById('ref-skip').classList.toggle('is-hidden', !s || !s.skip);
    }

    function len(L) { return Math.hypot(L.x2 - L.x1, L.y2 - L.y1); }

    /* 밴드 위의 밝기를 읽어 겉면 느낌을 짐작합니다.
     * 반들거리면 아주 밝은 점과 아주 어두운 점이 같이 나오고,
     * 무광이면 가운데 밝기에 몰립니다. 깊은 골이 있으면 어두운 점이 많아집니다. */
    function readSurface(L) {
      if (!pixels || !fit) return null;
      var n = 90, bright = [];
      for (var i = 0; i <= n; i++) {
        var t = i / n;
        var sx = Math.round(((L.x1 + (L.x2 - L.x1) * t) - fit.x) / fit.k);
        var sy = Math.round(((L.y1 + (L.y2 - L.y1) * t) - fit.y) / fit.k);
        if (sx < 0 || sy < 0 || sx >= pixels.width || sy >= pixels.height) continue;
        var o = (sy * pixels.width + sx) * 4;
        bright.push((pixels.data[o] * 0.299 + pixels.data[o + 1] * 0.587 + pixels.data[o + 2] * 0.114) / 255);
      }
      if (bright.length < 10) return null;
      var mean = bright.reduce(function (a, b) { return a + b; }, 0) / bright.length;
      var varr = bright.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / bright.length;
      var sd = Math.sqrt(varr);
      // 이웃한 점끼리 얼마나 튀는지 — 잔 결이 있으면 커집니다
      var jump = 0;
      for (var j = 1; j < bright.length; j++) jump += Math.abs(bright[j] - bright[j - 1]);
      jump /= (bright.length - 1);
      var darkShare = bright.filter(function (v) { return v < mean - sd * 0.9; }).length / bright.length;
      var texture = 'soft';
      if (jump > 0.085) texture = 'diamond';
      else if (jump > 0.05) texture = 'sandbar';
      else if (sd > 0.19) texture = 'polish';
      else if (sd > 0.1) texture = 'fine';
      return { texture: texture, oxidize: darkShare > 0.22, sd: sd, jump: jump };
    }

    function finish() {
      var hole = lines.hole && len(lines.hole);
      if (!hole || hole < 8) { close(); return; }
      var spec = ONM.studio && ONM.studio.spec;
      if (!spec) { close(); return; }
      var holeMm = ONM.rings.sizeToInnerDiameter(spec.size);   // 그 호수의 안지름 — 우리 자
      var model = ONM.rings.getModel(spec.modelId) || {};
      var said = [];

      if (lines.width) {
        var w = (len(lines.width) / hole) * holeMm;
        var lim = model.width || [2, 4, 9];
        w = Math.max(lim[0], Math.min(lim[2], Math.round(w * 10) / 10));
        spec.width = w;
        said.push('폭 ' + w.toFixed(1) + 'mm');
      }
      if (lines.thick) {
        var t = (len(lines.thick) / hole) * holeMm;
        var limT = model.thickness || [1.2, 2, 4];
        t = Math.max(limT[0], Math.min(limT[2], Math.round(t * 10) / 10));
        spec.thickness = t;
        if (spec.backThickness) spec.backThickness = Math.min(spec.backThickness, t);
        said.push('두께 ' + t.toFixed(1) + 'mm');
      }
      var surf = readSurface(lines.width || lines.thick || lines.hole);
      var hint = '';
      if (surf) {
        spec.texture = surf.texture;
        said.push('표면 ' + (ONM.rings.TEXTURE_LABEL[surf.texture] || surf.texture).split(' —')[0]);
        /* 유화는 값이 붙는 마감이라 마음대로 켜지 않습니다. 권하기만 합니다. */
        if (surf.oxidize && !spec.oxidize) hint = ' 골이 어두워 보이니 유화도 한번 켜 보세요.';
      }
      /* 슬라이더와 선택칸도 함께 움직여야 화면과 값이 어긋나지 않습니다.
       * 스튜디오가 이미 쓰고 있는 입력 경로를 그대로 타게 둡니다. */
      push('c-width', spec.width, 'input');
      push('c-thickness', spec.thickness, 'input');
      if (surf) push('c-texture', spec.texture, 'change');
      ONM.studio.changed();
      resultEl.textContent = said.length
        ? '사진에서 읽어 맞췄습니다 — ' + said.join(' · ') + '. 눈대중이라 조금 다를 수 있으니 슬라이더로 다듬어 주세요.' + hint
        : '잰 값이 없어 그대로 두었습니다.';
      resultEl.classList.remove('is-hidden');
      close();
    }

    /* 컨트롤에 값을 넣고, 스튜디오가 듣고 있는 이벤트를 일으켜 줍니다 */
    function push(id, value, type) {
      var el = document.getElementById(id);
      if (!el) return;
      el.value = value;
      el.dispatchEvent(new Event(type, { bubbles: true }));
    }

    function close() { show(false); }

    function reset() {
      step = 0; lines = {}; drag = null; ask(); redraw();
      resultEl.classList.add('is-hidden');
    }

    function point(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function bind() {
      canvas.addEventListener('pointerdown', function (e) {
        if (step >= STEPS.length) return;
        var p = point(e);
        drag = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = point(e);
        drag.x2 = p.x; drag.y2 = p.y;
        redraw();
      });
      canvas.addEventListener('pointerup', function () {
        if (!drag) return;
        var L = drag; drag = null;
        if (Math.hypot(L.x2 - L.x1, L.y2 - L.y1) < 10) { redraw(); return; }
        lines[STEPS[step].key] = L;
        step++;
        if (step >= STEPS.length) { finish(); return; }
        ask(); redraw();
      });
      document.getElementById('ref-skip').addEventListener('click', function () {
        step++;
        if (step >= STEPS.length) { finish(); return; }
        ask();
      });
      document.getElementById('ref-again').addEventListener('click', reset);
      document.getElementById('ref-close').addEventListener('click', close);
      window.addEventListener('resize', function () { if (!box.classList.contains('is-hidden')) layout(); });
    }

    openBtn.addEventListener('click', function () {
      var list = getList();
      if (!list.length) return;
      var it = list[Math.min(getPicked(), list.length - 1)];
      canvas.innerHTML = '';
      img = new Image();
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      img.onload = function () {
        // 사진 밝기를 읽으려면 원본 크기 그대로 한 번 그려 둬야 합니다
        try {
          var cv = document.createElement('canvas');
          cv.width = img.naturalWidth; cv.height = img.naturalHeight;
          var cx = cv.getContext('2d', { willReadFrequently: true });
          cx.drawImage(img, 0, 0);
          pixels = cx.getImageData(0, 0, cv.width, cv.height);
        } catch (e) { pixels = null; }
        layout();
      };
      img.src = it.url;
      canvas.appendChild(img);
      canvas.appendChild(svg);
      reset();
      show(true);
      // 버튼이 화면 아래쪽에 있어서, 판이 열려도 위로 밀려 안 보일 수 있습니다
      try { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
      if (img.complete) layout();
    });

    bind();
    return { row: row };
  }

  /* ───────────────── 주문서 화면 ─────────────────
   * 스튜디오에서 올린 사진을 다시 보여 주고, 상담으로 보낼 수 있게 내려받기를 답니다.
   * (사이트가 사진을 대신 보내 주지는 못합니다 — 그 점을 그대로 적어 둡니다) */

  function mountOrder() {
    var box = document.getElementById('ref-order');
    if (!box) return;
    var strip = document.getElementById('ref-order-strip');
    load().then(function (list) {
      if (!list.length) { box.classList.add('is-hidden'); return; }
      box.classList.remove('is-hidden');
      strip.innerHTML = '';
      list.forEach(function (it, i) {
        var wrap = document.createElement('div');
        wrap.className = 'ref-order-item';
        var img = document.createElement('img');
        img.src = it.url;
        img.alt = '레퍼런스 사진 ' + (i + 1);
        var a = document.createElement('a');
        a.href = it.url;
        a.download = '온명-레퍼런스-' + (i + 1) + '.jpg';
        a.className = 'btn btn-sm';
        a.textContent = '사진 내려받기';
        wrap.appendChild(img);
        wrap.appendChild(a);
        strip.appendChild(wrap);
      });
      ONM.referenceCount = list.length;
      // 사양서는 이미 한 번 그려진 뒤라, 사진 줄을 넣으려면 다시 그려야 합니다
      document.dispatchEvent(new CustomEvent('onm:refs', { detail: { count: list.length } }));
    });
  }

  ONM.reference = { load: load, save: save, count: function () { return load().then(function (l) { return l.length; }); } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountStudio(); mountOrder(); });
  } else { mountStudio(); mountOrder(); }
})(window);
