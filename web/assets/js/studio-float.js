/*
 * 온명 — 따라오는 미리보기 (리모컨처럼 쓰기)
 * ------------------------------------------------------------------
 * 아래쪽 옵션을 고치다 보면 위에 있는 반지가 화면 밖으로 나가
 * 바꾸고 → 올라가서 보고 → 다시 내려오는 일을 되풀이하게 됩니다.
 * 미리보기가 화면 위로 빠져나가면 같은 3D 화면을 작게 띄워 따라붙게 합니다.
 *   좁은 화면(폰·세로 태블릿)  : 머리 아래 가로 띠
 *   넓은 화면(PC·가로 태블릿)  : 비어 있는 왼쪽 칸 아래쪽에 크게 (오른쪽 옵션 칸은 가리지 않게)
 * 같은 화면을 옮기는 것이라 따라온 작은 화면에서도 돌려 보고 다듬을 수 있습니다.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var dock = $('stage-dock');
  if (!dock) return;
  var wrap = dock.querySelector('.stage-wrap');
  var studioBox = dock.closest('.studio');
  var head = document.querySelector('.site-head');
  var WIDE = window.matchMedia('(min-width: 901px)');

  var floating = false;
  var dismissed = false;        // ✕ 를 누르면 원래 자리로 한 번 돌아갈 때까지 띄우지 않습니다

  function headBottom() {
    if (!head) return 0;
    var r = head.getBoundingClientRect();
    if (getComputedStyle(head).display === 'none') return 0;
    return Math.max(0, r.bottom);
  }

  function measuring() {
    var box = $('ref-measure-box');
    return box && !box.classList.contains('is-hidden');
  }

  function place() {
    if (!floating) return;
    if (WIDE.matches) {
      /* 넓은 화면은 옵션을 고치는 동안 왼쪽 칸 아래쪽이 비어 있습니다.
       * 그 자리에 칸 너비 그대로 붙여 둡니다 (위쪽의 레퍼런스 사진 칸은 가리지 않게 아래에서부터). */
      var col = dock.parentElement.getBoundingClientRect();
      var w = col.width;
      var h = Math.min(Math.round(w * 0.72), Math.round(window.innerHeight * 0.52));
      wrap.classList.remove('float-top');
      wrap.style.left = col.left + 'px';
      wrap.style.width = w + 'px';
      wrap.style.height = Math.max(200, h) + 'px';
      wrap.style.top = (window.innerHeight - Math.max(200, h) - 16) + 'px';
    } else {
      // 좁은 화면은 머리(메뉴)까지 덮고 맨 위에 붙어 반지를 조금이라도 크게 보여 줍니다
      wrap.classList.add('float-top');
      wrap.style.left = wrap.style.width = wrap.style.height = '';
      wrap.style.top = '0px';
    }
  }

  function setFloat(on) {
    if (on === floating) return;
    floating = on;
    if (on) {
      // 빠져나간 자리를 그대로 비워 두어야 아래 내용이 들썩이지 않습니다
      dock.style.height = dock.offsetHeight + 'px';
      wrap.classList.add('is-floating');
      place();
    } else {
      wrap.classList.remove('is-floating', 'float-top');
      wrap.style.left = wrap.style.width = wrap.style.height = wrap.style.top = '';
      dock.style.height = '';
    }
    $('float-bar').setAttribute('aria-hidden', String(!on));
    paintPrice();
  }

  function check() {
    var r = dock.getBoundingClientRect();
    var top = headBottom();
    // 미리보기가 거의 다 위로 지나갔을 때부터
    var gone = r.bottom < top + 80;
    if (!gone) dismissed = false;                 // 원래 자리로 돌아오면 다시 따라올 수 있게
    // 스튜디오 영역을 다 지나 아래(꼬리말 등)까지 내려가면 그만 따라옵니다
    var past = studioBox && studioBox.getBoundingClientRect().bottom < top + 160;
    setFloat(gone && !past && !dismissed && !measuring());
    place();
  }

  function paintPrice() {
    var out = $('price-out');
    var st = window.ONMYEONG && window.ONMYEONG.studio;
    var name = st && st.spec ? st.spec.modelName : '';
    $('float-price').textContent = (name ? name + ' · ' : '') + (out ? out.textContent : '');
  }

  $('float-up').addEventListener('click', function () {
    var y = window.scrollY + dock.getBoundingClientRect().top - headBottom() - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  });
  $('float-close').addEventListener('click', function () {
    dismissed = true;
    setFloat(false);
  });

  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  if (WIDE.addEventListener) WIDE.addEventListener('change', check);
  var st = window.ONMYEONG && window.ONMYEONG.studio;
  if (st && st.onChange) st.onChange(function () { setTimeout(paintPrice, 0); });
  check();
})();
