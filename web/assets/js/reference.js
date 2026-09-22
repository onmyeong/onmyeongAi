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

    load().then(function (saved) {
      list = saved.slice(0, MAX_N);
      draw();
      paintOverlay();
    });
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
