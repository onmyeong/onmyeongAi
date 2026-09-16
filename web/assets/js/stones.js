/*
 * 온명 — 원석 그림
 * ------------------------------------------------------------------
 * 리포트의 "추천 원석"과 스튜디오의 알 선택에 쓰는 그림입니다.
 * 원석 색(ONMYEONG.STONE_COLOR)을 받아 그 자리에서 그리므로
 * 이미지 파일이 없어도 동작하고, 어떤 크기로도 깨지지 않습니다.
 *
 * 컷은 두 가지입니다.
 *   캐보션(cabochon) — 천연석. 각을 내지 않고 둥글게 갈아 올린 알.
 *   라운드(round)    — 모이사나이트. 면을 낸 브릴리언트 컷.
 *
 * 캔바에서 내려받은 원석 사진을 쓰고 싶으면
 * config.js 의 stoneIcons.custom 을 true 로 바꾸고
 * assets/icons/stones/ 에 원석 이름 그대로 파일을 넣으면 됩니다. (예: 문스톤.png)
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};

  /* 빛을 거의 통과시키지 않는 돌 — 하이라이트를 좁고 단단하게 준다 */
  var OPAQUE = ['블랙 오닉스', '블랙 루틸', '블랙 루틸 쿼츠', '스노우플레이크 옵시디언',
    '터쿼이즈', '더쿼이즈', '우나카이트', '모스아게이트', '라피스라쥴리', '커넬리언', '카넬리먼'];

  function shade(hex, mult) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * mult));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * mult));
    var b = Math.min(255, Math.round((n & 255) * mult));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function uid() { return 'st' + Math.random().toString(36).slice(2, 8); }

  /** 캐보션 — 둥글게 갈아 올린 알 */
  function cabochon(color, opaque, id) {
    var deep = shade(color, 0.52);
    var mid = shade(color, 0.86);
    var lit = shade(color, opaque ? 1.25 : 1.5);
    return '<defs>' +
      '<radialGradient id="' + id + 'b" cx="36%" cy="30%" r="78%">' +
        '<stop offset="0%" stop-color="' + lit + '"/>' +
        '<stop offset="46%" stop-color="' + color + '"/>' +
        '<stop offset="82%" stop-color="' + mid + '"/>' +
        '<stop offset="100%" stop-color="' + deep + '"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + id + 'h" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity="' + (opaque ? 0.55 : 0.85) + '"/>' +
        '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>' +
      '</radialGradient>' +
      // 아래쪽에서 되비쳐 오르는 빛 — 가장자리로 갈수록 스르르 사라지게
      '<radialGradient id="' + id + 'r" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="' + lit + '" stop-opacity="' + (opaque ? 0.3 : 0.6) + '"/>' +
        '<stop offset="55%" stop-color="' + lit + '" stop-opacity="' + (opaque ? 0.12 : 0.26) + '"/>' +
        '<stop offset="100%" stop-color="' + lit + '" stop-opacity="0"/>' +
      '</radialGradient>' +
    '</defs>' +
    '<circle cx="32" cy="32" r="29" fill="url(#' + id + 'b)"/>' +
    '<ellipse cx="32" cy="43" rx="21" ry="13" fill="url(#' + id + 'r)"/>' +
    // 윗면에 맺히는 빛
    '<ellipse cx="24" cy="22" rx="' + (opaque ? 7 : 11) + '" ry="' + (opaque ? 5 : 7.5) +
      '" fill="url(#' + id + 'h)" transform="rotate(-22 24 22)"/>' +
    '<circle cx="32" cy="32" r="29" fill="none" stroke="' + deep + '" stroke-opacity=".5" stroke-width="1.4"/>';
  }

  /** 색의 밝기 (0~1) — 이미 밝은 돌은 명암을 좁게 줘야 탁해 보이지 않는다 */
  function luma(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  /** 라운드 브릴리언트 — 위에서 내려다본 면 구성 */
  function round(color, id) {
    // 무색에 가까운 모이사나이트는 어둡게 깎으면 탁해 보이므로 명암 폭을 좁힌다
    var pale2 = luma(color) > 0.8;
    var deep = shade(color, pale2 ? 0.8 : 0.55);
    var mid = shade(color, pale2 ? 0.93 : 0.82);
    var lit = shade(color, pale2 ? 1.06 : 1.45);
    var pale = shade(color, pale2 ? 1.14 : 1.7);

    var cx = 32, cy = 32, rOut = 29, rIn = 15;
    var kites = [], stars = [];
    for (var k = 0; k < 8; k++) {
      var a0 = (k / 8) * Math.PI * 2 - Math.PI / 2;
      var a1 = ((k + 1) / 8) * Math.PI * 2 - Math.PI / 2;
      var am = (a0 + a1) / 2;
      kites.push([
        'M', cx + rIn * Math.cos(a0), cy + rIn * Math.sin(a0),
        'L', cx + rOut * Math.cos(am), cy + rOut * Math.sin(am),
        'L', cx + rIn * Math.cos(a1), cy + rIn * Math.sin(a1),
        'L', cx + rIn * 0.62 * Math.cos(am), cy + rIn * 0.62 * Math.sin(am), 'Z'
      ].join(' '));
      // 면마다 빛이 다르게 맺히도록 — 나란히 붙은 면끼리 밝기를 엇갈리게 둔다
      stars.push([pale, lit, mid, deep, mid, lit, deep, pale][k]);
    }

    var table = [];
    for (var t = 0; t < 8; t++) {
      var at = (t / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8;
      table.push((cx + rIn * 0.62 * Math.cos(at)).toFixed(1) + ',' + (cy + rIn * 0.62 * Math.sin(at)).toFixed(1));
    }

    var paths = kites.map(function (d, n) {
      return '<path d="' + d + '" fill="' + stars[n] + '" stroke="' + deep +
        '" stroke-opacity=".35" stroke-width=".7"/>';
    }).join('');

    return '<defs>' +
      '<radialGradient id="' + id + 'g" cx="38%" cy="30%" r="76%">' +
        '<stop offset="0%" stop-color="' + pale + '"/>' +
        '<stop offset="60%" stop-color="' + color + '"/>' +
        '<stop offset="100%" stop-color="' + deep + '"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + id + 't" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#ffffff"/>' +
        '<stop offset="55%" stop-color="' + pale + '"/>' +
        '<stop offset="100%" stop-color="' + mid + '"/>' +
      '</linearGradient>' +
    '</defs>' +
    '<circle cx="32" cy="32" r="29.5" fill="url(#' + id + 'g)"/>' +
    paths +
    '<polygon points="' + table.join(' ') + '" fill="url(#' + id + 't)" stroke="' + deep +
      '" stroke-opacity=".3" stroke-width=".7"/>' +
    '<circle cx="32" cy="32" r="29.5" fill="none" stroke="' + deep + '" stroke-opacity=".55" stroke-width="1.4"/>';
  }

  /**
   * 원석 그림 한 조각
   * @param {string} name 원석 이름 (ONMYEONG.STONE_COLOR 의 키)
   * @param {Object} opts { size, cut: 'cabochon' | 'round', color, label }
   */
  function stoneIcon(name, opts) {
    opts = opts || {};
    var color = opts.color || (ONM.STONE_COLOR && ONM.STONE_COLOR[name]) || '#7a8b9c';
    var cfg = (ONM.CONFIG && ONM.CONFIG.stoneIcons) || {};
    var size = opts.size || 44;
    var label = opts.label || name || '원석';

    // 준비해 둔 원석 사진이 있으면 그걸 먼저 씁니다
    if (cfg.custom && name) {
      var url = (cfg.path || '') + encodeURIComponent(name) + (cfg.ext || '.png');
      return '<img class="stone-img" width="' + size + '" height="' + size +
        '" alt="' + esc(label) + '" src="' + esc(url) + '">';
    }

    var id = uid();
    var body = opts.cut === 'round' ? round(color, id) : cabochon(color, OPAQUE.indexOf(name) !== -1, id);
    return '<svg class="stone-svg" viewBox="0 0 64 64" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  ONM.stoneIcon = stoneIcon;
  ONM.stoneShade = shade;
})(typeof window !== 'undefined' ? window : globalThis);
