/*
 * 온명 — 디자인 시안 미리보기
 * ------------------------------------------------------------------
 * 주소 끝에 ?preview=1 을 붙이면 오른쪽 아래에 고르는 줄이 뜹니다.
 * 붙이지 않으면 이 파일은 아무 일도 하지 않습니다 — 손님에게는 안 보입니다.
 *
 * 고른 시안은 브라우저에 기억해 두고, 페이지를 옮겨도 따라갑니다.
 * 글꼴은 고른 시안의 것만 그때 불러옵니다 (평소에는 안 불러옵니다).
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var KEY = 'onmyeong.preview.theme';

  var THEMES = [
    { id: '',        label: '지금',   note: '1안 먹빛과 백자 (적용됨)' },
    { id: 'jagae',   label: '2안',   note: '자개와 남색',
      fonts: 'family=Gowun+Dodum&family=Gowun+Batang:wght@400;700' },
    { id: 'hongmae', label: '3안',   note: '홍매와 온기',
      fonts: 'family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700' }
  ];

  if (new URLSearchParams(global.location.search).get('preview') !== '1') return;

  function find(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return THEMES[0];
  }

  /* 고른 시안의 글꼴만 그때 불러옵니다 */
  var loaded = {};
  function loadFont(t) {
    if (!t.fonts || loaded[t.id]) return;
    loaded[t.id] = true;
    var l = doc.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + t.fonts + '&display=swap';
    doc.head.appendChild(l);
  }

  function apply(id) {
    var t = find(id);
    if (t.id) doc.documentElement.setAttribute('data-theme', t.id);
    else doc.documentElement.removeAttribute('data-theme');
    loadFont(t);
    try { global.localStorage.setItem(KEY, t.id); } catch (e) { /* 사생활 보호 모드 */ }
    paint(t.id);
  }

  var bar;
  function paint(id) {
    if (!bar) return;
    var btns = bar.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = btns[i].getAttribute('data-id') === id ? 'on' : '';
    }
    bar.querySelector('.tp-note').textContent = find(id).note;
  }

  function build() {
    var css = doc.createElement('style');
    css.textContent =
      '.tp-bar{position:fixed;right:14px;bottom:14px;z-index:99999;display:flex;' +
      'flex-direction:column;gap:6px;align-items:stretch;background:#fff;' +
      'border:1px solid #d8d4c8;border-radius:14px;padding:10px;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.18);font-family:system-ui,sans-serif}' +
      '.tp-row{display:flex;gap:5px}' +
      '.tp-bar button{font:inherit;font-size:13px;padding:7px 11px;border-radius:9px;' +
      'border:1px solid #d8d4c8;background:#faf9f6;color:#44423c;cursor:pointer}' +
      '.tp-bar button.on{background:#2f2f2b;border-color:#2f2f2b;color:#fff;font-weight:600}' +
      '.tp-note{font-size:11px;color:#86827a;text-align:center;letter-spacing:.02em}' +
      '@media(max-width:600px){.tp-bar{right:8px;bottom:8px;padding:8px}' +
      '.tp-bar button{font-size:12px;padding:6px 9px}}';
    doc.head.appendChild(css);

    bar = doc.createElement('div');
    bar.className = 'tp-bar';
    var row = doc.createElement('div');
    row.className = 'tp-row';
    THEMES.forEach(function (t) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.textContent = t.label;
      b.setAttribute('data-id', t.id);
      b.addEventListener('click', function () { apply(t.id); });
      row.appendChild(b);
    });
    bar.appendChild(row);
    var note = doc.createElement('div');
    note.className = 'tp-note';
    bar.appendChild(note);
    doc.body.appendChild(bar);
  }

  /* 페이지를 옮겨도 미리보기가 유지되도록 안쪽 링크에 preview=1 을 붙입니다 */
  function markLinks() {
    var as = doc.querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|#)/i.test(h)) continue;
      if (/[?&]preview=1(&|$)/.test(h)) continue;
      as[i].setAttribute('href', h + (h.indexOf('?') >= 0 ? '&' : '?') + 'preview=1');
    }
  }

  function start() {
    build();
    var saved = '';
    try { saved = global.localStorage.getItem(KEY) || ''; } catch (e) { /* 무시 */ }
    apply(saved);
    markLinks();
    new MutationObserver(markLinks).observe(doc.body, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['href']
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
}(window));
