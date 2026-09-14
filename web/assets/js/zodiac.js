/*
 * 온명 — 십이지 아이콘 & 천간 색 지표
 * ------------------------------------------------------------------
 * 캔바 "딸깍" 문서의 두 페이지를 코드로 옮긴 것입니다.
 *   · 1면 "일주별 아이콘"  → 십이지 열두 동물의 선화 아이콘
 *   · 2면 "일주 색 지표"    → 천간 열 개의 색
 *
 * 그래서 일주 하나가 곧 "색 + 동물"이 됩니다.
 *   병자(丙子) = 빨강 동그라미 + 쥐,  갑술(甲戌) = 초록 동그라미 + 개
 *
 * 아이콘은 선으로만 그려 색을 currentColor로 따라가므로,
 * 동그라미 안에 흰색으로 얹어도 되고 글자 옆에 작게 놓아도 됩니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};

  /* ────────────────── 천간 색 지표 (딸깍 2면) ──────────────────
   * solid : 동그라미를 채우는 색
   * ink   : 같은 계열에서 글자로 써도 읽히는 진한 톤
   * tint  : 아주 옅게 깐 배경용
   * 양간(갑·병·무·경·임)은 진하게, 음간(을·정·기·신·계)은 연하게 갑니다.
   */
  var STEM_COLOR = {
    갑: { solid: '#548235', ink: '#3d6127', tint: '#eaf2e3', name: '진한 초록' },
    을: { solid: '#70bf52', ink: '#4a8235', tint: '#edf6e7', name: '연한 초록' },
    병: { solid: '#e15b4c', ink: '#b23f33', tint: '#fbebe8', name: '빨강' },
    정: { solid: '#ee9c90', ink: '#c06254', tint: '#fdf0ed', name: '연한 빨강' },
    무: { solid: '#d9a92b', ink: '#9d7513', tint: '#faf2dc', name: '진한 노랑' },
    기: { solid: '#f3be2f', ink: '#a88214', tint: '#fdf6e0', name: '연한 노랑' },
    경: { solid: '#6e6e6e', ink: '#4c4c4c', tint: '#eeeeee', name: '진한 회색' },
    신: { solid: '#c2c2c2', ink: '#6b6b6b', tint: '#f4f4f4', name: '연한 회색' },
    임: { solid: '#2b7cc9', ink: '#205e99', tint: '#e6f0fa', name: '진한 파랑' },
    계: { solid: '#5b9bd5', ink: '#35699b', tint: '#ebf3fb', name: '연한 파랑' }
  };

  /* ────────────────── 십이지 아이콘 (딸깍 1면) ──────────────────
   * 64×64 기준 선화. 눈·코처럼 채워야 하는 부분만 fill을 따로 줍니다.
   */
  function dot(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 1.9) + '" fill="currentColor" stroke="none"/>';
  }

  var ICONS = {};

  // 자(子) 쥐 — 큰 동그란 귀, 뾰족한 주둥이, 수염
  ICONS['자'] =
    '<circle cx="17" cy="19" r="8.5"/><circle cx="47" cy="19" r="8.5"/>' +
    '<circle cx="17" cy="19" r="4"/><circle cx="47" cy="19" r="4"/>' +
    '<path d="M17 34c0-8 7-13 15-13s15 5 15 13c0 7-3.5 11-6.5 14-2.8 2.5-5.5 5.5-8.5 5.5s-5.7-3-8.5-5.5C20.5 45 17 41 17 34Z"/>' +
    '<path d="M24 47l-11 1.5M25 50.5l-9 4M40 47l11 1.5M39 50.5l9 4"/>' +
    dot(26, 34) + dot(38, 34) + dot(32, 47, 1.9);

  // 축(丑) 소 — 위로 뻗은 뿔과 넓은 주둥이
  ICONS['축'] =
    '<path d="M17 23c-8-2-11-10-5-13 4-2 7 1 7 5M47 23c8-2 11-10 5-13-4-2-7 1-7 5"/>' +
    '<ellipse cx="13" cy="30" rx="6.5" ry="4.2"/><ellipse cx="51" cy="30" rx="6.5" ry="4.2"/>' +
    '<path d="M20 24h24c3.5 0 5 3 5 7v6c0 8.5-7 14.5-17 14.5S15 45.5 15 37v-6c0-4 1.5-7 5-7Z"/>' +
    '<ellipse cx="32" cy="43" rx="9.5" ry="6.5"/>' +
    dot(24, 31) + dot(40, 31) + dot(28.5, 43, 1.5) + dot(35.5, 43, 1.5);

  // 인(寅) 호랑이 — 이마의 세 줄무늬와 볼털
  ICONS['인'] =
    '<circle cx="16" cy="21" r="7.5"/><circle cx="48" cy="21" r="7.5"/>' +
    '<circle cx="16" cy="21" r="3.4"/><circle cx="48" cy="21" r="3.4"/>' +
    '<path d="M12 32c0-10 9-16 20-16s20 6 20 16c0 12.5-9 20-20 20s-20-7.5-20-20Z"/>' +
    '<path d="M25 22v4.5M32 20v5.5M39 22v4.5"/>' +
    '<path d="M29.5 39.5h5L32 43Z" fill="currentColor" stroke="none"/>' +
    '<path d="M32 43.5c0 2.2-2.2 3.5-4 2.2M32 43.5c0 2.2 2.2 3.5 4 2.2"/>' +
    dot(24, 32) + dot(40, 32);

  // 묘(卯) 토끼 — 길게 선 두 귀
  ICONS['묘'] =
    '<ellipse cx="25" cy="17" rx="4.8" ry="12.5" transform="rotate(-9 25 17)"/>' +
    '<ellipse cx="39" cy="17" rx="4.8" ry="12.5" transform="rotate(9 39 17)"/>' +
    '<path d="M16 39c0-8 7-13 16-13s16 5 16 13c0 9-7 14.5-16 14.5S16 48 16 39Z"/>' +
    '<path d="M32 45.5v2.2M32 47.7c-1.4 2-4 1.8-5 .2M32 47.7c1.4 2 4 1.8 5 .2"/>' +
    dot(25, 38) + dot(39, 38) + dot(32, 43.5, 1.7);

  // 진(辰) 용 — 뿔과 갈기 돌기, 말려 올라간 수염
  ICONS['진'] =
    '<path d="M22 20c-3-5-8-6-11-3-2 2-1 5 2 5M42 20c3-5 8-6 11-3 2 2 1 5-2 5"/>' +
    '<path d="M27 17l2-5 1.5 5 2-5 1.5 5 2-5 1.5 5"/>' +
    '<path d="M16 33c0-8 7-13 16-13s16 5 16 13c0 6-3 10-6 13-3 2.8-5 5-10 5s-7-2.2-10-5c-3-3-6-7-6-13Z"/>' +
    '<ellipse cx="32" cy="42" rx="8" ry="5.2"/>' +
    '<path d="M23 47c-4 6-9 8-13 6M41 47c4 6 9 8 13 6"/>' +
    dot(24, 32) + dot(40, 32) + dot(28.8, 42, 1.4) + dot(35.2, 42, 1.4);

  // 사(巳) 뱀 — S자로 감긴 몸통과 갈라진 혀
  ICONS['사'] =
    '<ellipse cx="32" cy="47" rx="19" ry="8"/>' +
    '<ellipse cx="32" cy="39" rx="12.5" ry="5.5"/>' +
    '<path d="M37 34c-1-6-2-10 1-14"/>' +
    '<circle cx="42" cy="17" r="6.5"/>' +
    '<path d="M48.5 17h5m0 0l4-2.5M53.5 17l4 2.5"/>' +
    dot(43, 15, 1.4);

  // 오(午) 말 — 쫑긋한 귀와 앞머리 갈기
  ICONS['오'] =
    '<path d="M23 21c-3-7-2-11 1-11 3 0 5 4 5 10M41 21c3-7 2-11-1-11-3 0-5 4-5 10"/>' +
    '<path d="M28 16c1-5 4-7 6-5s1 5-1 7"/>' +
    '<path d="M22 24c-3 6-4 12-2 18 2 8 6 13 12 13s10-5 12-13c2-6 1-12-2-18Z"/>' +
    '<ellipse cx="32" cy="45" rx="7.5" ry="5"/>' +
    dot(25, 32) + dot(39, 32) + dot(29, 45, 1.5) + dot(35, 45, 1.5);

  // 미(未) 양 — 둥근 털과 말린 뿔
  ICONS['미'] =
    '<path d="M16 31a6.5 6.5 0 0 1 4-10 6.5 6.5 0 0 1 8-6 7 7 0 0 1 8 0 6.5 6.5 0 0 1 8 6 6.5 6.5 0 0 1 4 10"/>' +
    '<path d="M16 31c-5 2-7 8-3 10.5 3 2 5.5-.8 4.5-3M48 31c5 2 7 8 3 10.5-3 2-5.5-.8-4.5-3"/>' +
    '<path d="M21 34c0 11 5 18 11 18s11-7 11-18Z"/>' +
    '<path d="M32 43v2.4M32 45.4c-1.3 1.8-3.6 1.6-4.6.2M32 45.4c1.3 1.8 3.6 1.6 4.6.2"/>' +
    dot(27.5, 37) + dot(36.5, 37);

  // 신(申) 원숭이 — 양옆으로 붙은 귀
  ICONS['신'] =
    '<circle cx="14" cy="33" r="6"/><circle cx="50" cy="33" r="6"/>' +
    '<path d="M15 30c0-9 8-15 17-15s17 6 17 15c0 10-8 17-17 17s-17-7-17-17Z"/>' +
    '<path d="M22 37c0-7 4-11 10-11s10 4 10 11-4 12-10 12-10-5-10-12Z"/>' +
    '<path d="M23 26c4-4 14-4 18 0"/>' +
    '<path d="M28 44c2.5 2.4 5.5 2.4 8 0"/>' +
    dot(28, 35) + dot(36, 35) + dot(30, 40, 1.2) + dot(34, 40, 1.2);

  // 유(酉) 닭 — 세 봉우리 볏과 부리, 턱볏
  ICONS['유'] =
    '<path d="M25 20c-.5-4.5 3-6 4.5-2.5.5-4.5 4.5-5 5.5-1.5 1-3.5 4.5-3.5 4.5 1"/>' +
    '<path d="M21 28c0-6.5 5-11 11-11s11 4.5 11 11c0 6-2.5 10-6 12.5h-10C23.5 38 21 34 21 28Z"/>' +
    '<path d="M28.5 36.5h7L32 42Z" fill="currentColor" stroke="none"/>' +
    '<path d="M29 43c-2.5 2.5-2 6 .5 6.5M35 43c2.5 2.5 2 6-.5 6.5"/>' +
    '<path d="M23 48c-3 3.5-1.5 7 3 7.5h12c4.5-.5 6-4 3-7.5"/>' +
    dot(26.5, 28) + dot(37.5, 28);

  // 술(戌) 개 — 늘어진 귀
  ICONS['술'] =
    '<path d="M20 26c-8 2-11 12-7 20 2 4.5 8 4.5 9 0M44 26c8 2 11 12 7 20-2 4.5-8 4.5-9 0"/>' +
    '<path d="M20 27c0-7.5 5.5-12 12-12s12 4.5 12 12c0 6.5-2 10.5-5 13.5-2.8 2.8-4.2 4.5-7 4.5s-4.2-1.7-7-4.5C22 37.5 20 33.5 20 27Z"/>' +
    '<ellipse cx="32" cy="42" rx="7.5" ry="5.5"/>' +
    '<path d="M32 42v2.5M32 44.5c-1.5 2-4 2-5 .2M32 44.5c1.5 2 4 2 5 .2"/>' +
    '<ellipse cx="32" cy="38.5" rx="2.8" ry="2.1" fill="currentColor" stroke="none"/>' +
    dot(26, 30) + dot(38, 30);

  // 해(亥) 돼지 — 위로 선 귀와 큰 코
  ICONS['해'] =
    '<path d="M20 23c-4-4-4-10 0-11 3-.7 6 2 7 6M44 23c4-4 4-10 0-11-3-.7-6 2-7 6"/>' +
    '<path d="M13 34c0-10 8.5-16 19-16s19 6 19 16c0 10.5-8.5 17-19 17s-19-6.5-19-17Z"/>' +
    '<ellipse cx="32" cy="39" rx="10" ry="7"/>' +
    dot(23, 31) + dot(41, 31) +
    '<ellipse cx="28.6" cy="39" rx="1.8" ry="2.5" fill="currentColor" stroke="none"/>' +
    '<ellipse cx="35.4" cy="39" rx="1.8" ry="2.5" fill="currentColor" stroke="none"/>';

  /**
   * 십이지 아이콘
   *
   * config 의 zodiacIcons.custom 이 켜져 있으면 캔바에서 내려받아 넣어 둔
   * 파일을 씁니다. 파일은 마스크로 얹기 때문에 글자색(currentColor)을 그대로
   * 따라가므로, 색 동그라미 안에서는 흰색으로, 다른 곳에서는 그 자리 색으로 나옵니다.
   * 파일을 아직 안 넣었으면 코드에 그려 둔 기본 아이콘이 나옵니다.
   *
   * @param {string} branch 지지 한 글자 (자·축·인 …)
   * @param {Object} opts   { size, stroke, label }
   */
  function zodiacIcon(branch, opts) {
    opts = opts || {};
    var body = ICONS[branch];
    if (!body) return '';

    var cfg = (ONM.CONFIG && ONM.CONFIG.zodiacIcons) || {};
    var label = opts.label ? ' role="img" aria-label="' + opts.label + '"' : ' aria-hidden="true"';

    if (cfg.custom) {
      var url = (cfg.path || '') + encodeURIComponent(branch) + (cfg.ext || '.png');
      var box = opts.size ? 'width:' + opts.size + 'px;height:' + opts.size + 'px;' : '';
      return '<span class="zodiac-img"' + label + ' style="' + box +
        '-webkit-mask-image:url(&quot;' + url + '&quot;);mask-image:url(&quot;' + url + '&quot;)"></span>';
    }

    var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
    return '<svg viewBox="0 0 64 64"' + size + label +
      ' fill="none" stroke="currentColor" stroke-width="' + (opts.stroke || 2.4) +
      '" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  /** 일주 레코드 → 그 일주의 색 (천간 기준) */
  function colorOf(record) {
    return STEM_COLOR[record.stem] || STEM_COLOR['갑'];
  }

  ONM.STEM_COLOR = STEM_COLOR;
  ONM.zodiacIcon = zodiacIcon;
  ONM.zodiacSvg = zodiacIcon;   // 예전 이름도 그대로 동작하게 둔다
  ONM.zodiacColor = colorOf;
  ONM.ZODIAC_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
})(typeof window !== 'undefined' ? window : globalThis);
