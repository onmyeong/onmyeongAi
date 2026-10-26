/*
 * 온명 — 반지 3D 렌더러
 * ------------------------------------------------------------------
 * 밴드는 단면(프로파일)을 한 바퀴 돌려 만든 회전체입니다.
 * 두께 · 높이(폭) · 호수 슬라이더가 실제 mm 치수를 그대로 지오메트리에 넣기 때문에,
 * 화면에서 본 비율이 곧 제작 사양이 됩니다.
 *
 * three.js는 assets/vendor/three 에 함께 담아 두어 외부 망 없이도 동작합니다.
 * 그래도 WebGL을 못 쓰는 기기가 있으므로, 실패하면 studio-ui.js가 2D 미리보기로 전환합니다.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ONM = window.ONMYEONG;
const R = ONM.rings;
const CONFIG = ONM.CONFIG;
const studio = ONM.studio;
const spec = studio.spec;
const $ = (id) => document.getElementById(id);

/* ─────────────────── 단면(프로파일) ─────────────────── */
const PROFILE_STEPS = 26;

/** v(폭 방향 위치)에서의 바깥 표면 두께 */
function outerAt(profile, v, t, w) {
  const k = Math.abs(2 * v / w); // 0 = 가운데, 1 = 가장자리
  switch (profile) {
    case 'flat':   return t * (k > 0.9 ? 1 - (k - 0.9) * 1.4 : 1);
    case 'round':  return t * (0.62 + 0.38 * Math.cos(Math.PI * v / w));
    case 'dshape': return t * (0.78 + 0.22 * Math.cos(Math.PI * v / w));
    case 'knife':  return t * (0.36 + 0.64 * (1 - k));
    case 'step':   return t * (k < 0.5 ? 1 : k < 0.58 ? 1 - (k - 0.5) * 4.5 : 0.64);
    case 'wave':   return t * (0.7 + 0.3 * Math.cos(Math.PI * v / w));
    case 'facet':  return t * (1 - 0.3 * k * k);
    // 인장(시그넷) — 윗면이 평평한 판. 가장자리만 살짝 떨어뜨려 각을 죽입니다.
    case 'signet': return t * (k > 0.86 ? 1 - (k - 0.86) * 2.6 : 1);
    /* 두 줄 — 가운데를 깊게 파 두 가닥이 나란히 가는 것처럼 보이게 합니다.
     * 실제로 구멍을 뚫는 게 아니라 바닥을 얇게 남겨 두는 방식이라,
     * 반지가 통으로 이어져 힘을 받습니다. */
    case 'twin': {
      const g = 0.3;                                   // 가운데 골의 반폭 (폭 대비)
      const dip = k < g ? 1 - (k / g) * (k / g) : 0;
      const edge = k > 0.9 ? 1 - (k - 0.9) * 1.6 : 1;
      return t * (1 - 0.78 * dip) * edge;
    }
    /* 우묵 — 둥근 밴드 한가운데를 넓고 얕게 파 낸 골.
     * 두 줄(twin)처럼 날카롭게 갈라지지 않고, 어깨에서 골 바닥까지 한 곡선으로
     * 부드럽게 내려앉습니다. 바닥은 두께의 60% 를 남겨 반지가 힘을 받습니다. */
    case 'valley': {
      const G = 0.72;                                          // 골이 닿는 곳 (폭 대비)
      const dip = k < G ? 0.5 + 0.5 * Math.cos(Math.PI * k / G) : 0;   // 가운데 1 → 어깨 0
      const roll = k > 0.8 ? 1 - Math.pow((k - 0.8) / 0.2, 2) * 0.45 : 1;    // 둥근 가장자리
      return t * (roll - 0.52 * dip);
    }
    default:       return t;
  }
}

/** 단면을 닫힌 폴리곤으로: 안쪽 면 → 바깥 면
 * steps 를 올리면 면이 촘촘해집니다 — 가는 골을 새길 때만 씁니다. */
function makeProfile(s, steps) {
  const n = steps || PROFILE_STEPS;
  const t = s.thickness, w = s.width, hw = w / 2;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    pts.push({ u: 0, v: -hw + (w * i) / n, outer: false });
  }
  for (let i = n; i >= 0; i--) {
    const v = -hw + (w * i) / n;
    pts.push({ u: outerAt(s.profile, v, t, w), v, outer: true });
  }
  return pts;
}

/* ─────────────────── 표면 질감 노이즈 ─────────────────── */
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/* amp = 파인 깊이(두께 대비), ring = 둘레 방향 결의 촘촘함, axial = 폭 방향 결의 촘촘함.
 * 표면 가공은 금속을 깎아내는 쪽이므로 항상 안쪽으로만 파고들어,
 * 슬라이더에 적은 두께가 곧 반지의 최대 두께가 됩니다. */
const BUMP = {
  polish:  { amp: 0,     ring: 0,   axial: 0 },
  soft:    { amp: 0.008, ring: 10,  axial: 8 },   // 은은한 무광 — 아주 얕게
  fine:    { amp: 0.014, ring: 16,  axial: 14 },  // 고운 무광 — 촘촘하고 얕게
  diamond: { amp: 0.055, ring: 0,   axial: 0 },   // 다이아 텍스쳐 — 아주 작은 면을 촘촘히 (아래 별도 계산)
  // 사포바는 줄 방향에 따라 결이 달라지므로 아래에서 따로 잡습니다
  sandbar: { amp: 0.016, ring: 1.2, axial: 30 }
};

/* 사포바 — 세로줄이면 폭 방향으로, 가로줄이면 둘레 방향으로 결이 갑니다 */
function bumpFor(s) {
  const b = BUMP[s.texture] || BUMP.polish;
  if (s.texture !== 'sandbar') return b;
  return s.grain === 'horizontal'
    ? { amp: b.amp, ring: 30, axial: 1.2 }
    : { amp: b.amp, ring: 1.2, axial: 30 };
}

/* ─────────────────── 밴드 지오메트리 ─────────────────── */
/* 반지를 한 바퀴 도는 동안 두께가 어떻게 달라지는가.
 *   th = π/2 가 손등 쪽(앞), th = -π/2 가 손바닥 쪽(뒤)입니다.
 *   앞뒤 두께를 다르게 주면 앞은 도톰하고 뒤는 얇은, 실제 수제 반지의 단차가 납니다.
 *   organic 은 왁스를 손으로 깎았을 때 남는 불규칙한 굴곡입니다.
 *   (한 바퀴 돌아와도 이어지도록 cos/sin 을 노이즈 입력으로 씁니다.) */
/* 손으로 다듬은 자국을 각도에 맞춰 부드럽게 읽어 온다.
 * 24 지점 사이를 부드러운 곡선으로 이어, 민 자리와 안 민 자리가 툭 끊기지 않게 한다. */
function sculptOf(s, key) {
  const cache = '_' + key;
  if (!s[cache] || R.sculptWrite(s[cache]) !== (s[key] || '')) {
    s[cache] = R.sculptRead(s[key] || '');
  }
  return s[cache];
}

function readAt(arr, th) {
  if (!arr) return 0;
  const n = arr.length;
  // th = π/2 가 손등 쪽(위). 그 자리를 0번 지점으로 둔다.
  const u = ((th - Math.PI / 2) / (Math.PI * 2) * n % n + n) % n;
  const i = Math.floor(u), f = u - i;
  const a = arr[i % n], b = arr[(i + 1) % n];
  const w = f * f * (3 - 2 * f);
  return a + (b - a) * w;
}

/* ── 도안 새기기 ──
 * 둘레 48칸 × 폭 8칸 격자에 "얼마나 깊게 팠는지"를 담아 두고,
 * 정점마다 그 사이를 부드럽게 이어 읽습니다.
 * 두께 자국(24지점)과 달리 폭 방향으로도 나뉘어 있어,
 * 반지 윗면 한쪽에만 선을 그어 새길 수 있습니다. */
function engraveOf(s) {
  if (!s._engrave || R.engraveWrite(s._engrave) !== (s.engrave || '')) {
    s._engrave = R.engraveRead(s.engrave || '');
  }
  return s._engrave;
}

/* 살 붙이기 · 깎기도 같은 격자에 담습니다 (-1 깎음 ~ 1 붙임).
 * 예전에는 둘레 24지점에만 담아 폭 전체가 한꺼번에 오르내렸는데,
 * 이제는 짚은 자리만 — 윗면 한쪽 가장자리만 도톰하게 붙일 수도 있습니다. */
function reliefOf(s) {
  if (!s._relief || R.reliefWrite(s._relief) !== (s.relief || '')) {
    s._relief = R.reliefRead(s.relief || '');
  }
  return s._relief;
}

const EX = R.ENGRAVE_X, EY = R.ENGRAVE_Y;
const smooth = (x) => x * x * (3 - 2 * x);

/* 살은 도안처럼 가장자리가 또렷할 필요가 없고, 오히려 매끈하게 부풀어야 합니다.
 * 칸 사이를 smoothstep 으로 이으면 칸마다 계단이 져 보여서,
 * 이웃 네 칸을 함께 보는 곡선(Catmull-Rom)으로 잇습니다. */
function cr(p0, p1, p2, p3, t) {
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}
function reliefAt(g, th, vN) {
  const x = ((th - Math.PI / 2) / (Math.PI * 2) * EX % EX + EX) % EX;
  const y = Math.max(0, Math.min(EY - 1, (vN + 0.5) * (EY - 1)));
  const x0 = Math.floor(x), y0 = Math.min(EY - 2, Math.floor(y));
  const fx = x - x0, fy = y - y0;
  const row = (yy) => {
    const r = Math.max(0, Math.min(EY - 1, yy)) * EX;
    return cr(g[r + (x0 - 1 + EX) % EX], g[r + x0 % EX], g[r + (x0 + 1) % EX], g[r + (x0 + 2) % EX], fx);
  };
  return cr(row(y0 - 1), row(y0), row(y0 + 1), row(y0 + 2), fy);
}

/** g = 격자(정점마다 다시 읽지 않도록 밖에서 한 번만 풀어서 넘깁니다),
 * th = 둘레 각도, vN = 폭 방향 위치(-0.5 ~ 0.5). 돌아오는 값은 0~1 깊이 */
function engraveAt(g, th, vN) {
  // 둘레는 한 바퀴 이어지고(감싸기), 폭은 양끝에서 멈춥니다
  const x = ((th - Math.PI / 2) / (Math.PI * 2) * EX % EX + EX) % EX;
  const y = Math.max(0, Math.min(EY - 1, (vN + 0.5) * (EY - 1)));
  const x0 = Math.floor(x), y0 = Math.min(EY - 2, Math.floor(y));
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const i0 = x0 % EX, i1 = (x0 + 1) % EX;
  const a = g[y0 * EX + i0], b = g[y0 * EX + i1];
  const c = g[(y0 + 1) * EX + i0], d = g[(y0 + 1) * EX + i1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/* ── 별 조각 ──
 * 조각칼로 별을 새기는 마감입니다. 가운데에서 여덟 갈래가 뻗어 나가고,
 * 긴 네 갈래와 짧은 네 갈래가 번갈아 놓입니다.
 * 골은 가운데가 가장 깊고 끝으로 갈수록 얕아지는 V자라, 빛을 받으면 반짝입니다.
 *
 * th = 둘레 각도, vN = 폭 방향 위치(-0.5~0.5), outerR = 그 자리의 바깥 반지름(mm).
 * 각도를 호 길이(mm)로 바꿔서 재기 때문에, 호수가 커져도 별 크기는 그대로입니다. */
function starCutAt(stars, s, th, vN, outerR) {
  let best = 0;
  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    let d = th - st.rad;
    if (d > Math.PI) d -= Math.PI * 2;
    else if (d < -Math.PI) d += Math.PI * 2;
    const dx = d * outerR;            // 둘레 방향 거리 (mm)
    const dy = vN * s.width;          // 폭 방향 거리 (mm)
    const reach = st.size * 0.55;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;

    const r = Math.hypot(dx, dy);
    const phi = Math.atan2(dy, dx);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      // 긴 갈래와 짧은 갈래가 번갈아 — 사진 속 별처럼 십자가 길게 섭니다
      const L = (k % 2 === 0) ? st.size * 0.5 : st.size * 0.24;
      const along = r * Math.cos(phi - a);
      if (along < 0 || along > L) continue;
      const perp = Math.abs(r * Math.sin(phi - a));
      const t = along / L;
      // 짧은 갈래는 밑동도 그만큼 가늘어야 별이 지저분해지지 않습니다
      const halfW = st.size * 0.11 * (L / (st.size * 0.5)) * (1 - t * 0.92);
      if (halfW < 0.004 || perp > halfW) continue;
      const v = (1 - perp / halfW) * (1 - t * 0.6);
      if (v > best) best = v;
    }
    // 가운데는 조각칼 끝을 세워 콕 찍은 점 — 여기서 빛이 가장 세게 튑니다
    const eye = st.size * 0.07;
    if (r < eye) {
      const k = r / eye;
      const v = 1 - k * k * 0.4;
      if (v > best) best = v;
    }
  }
  return best;
}

function sculptAt(s, th) { return readAt(sculptOf(s, 'sculpt'), th); }
function sculptWidthAt(s, th) { return readAt(sculptOf(s, 'sculptW'), th); }
/** 부분 무광 — 0이면 그대로, 1에 가까울수록 무광으로 칠해진 자리 */
function matteAt(s, th) { return Math.max(0, readAt(sculptOf(s, 'matte'), th)); }
/* 부분 무광 — 짚은 자리만 (둘레 48 × 폭 8 격자, 0~1). 예전 'matte' 는 둘레만 담아 폭 전체가 칠해졌습니다 */
function matteMapOf(s) {
  if (!s._matteMap || R.reliefWrite(s._matteMap) !== (s.matteMap || '')) {
    s._matteMap = R.reliefRead(s.matteMap || '');
  }
  return s._matteMap;
}

function thicknessAt(s, th) {
  const front = s.thickness;
  const back = (s.backThickness != null && s.backThickness > 0) ? s.backThickness : front;
  const mix = 0.5 + 0.5 * Math.sin(th);          // 뒤 0 → 앞 1
  let t = back + (front - back) * mix;

  // 손으로 민 만큼 그 자리만 두꺼워지거나 얇아집니다 (최대 ±55%)
  t *= 1 + 0.55 * sculptAt(s, th);

  const org = Number(s.organic) || 0;
  if (org > 0) {
    // 서로 다른 두 주기를 겹쳐 손으로 깎은 듯한 결을 만듭니다
    const a = valueNoise(Math.cos(th) * 1.7 + 11, Math.sin(th) * 1.7 + 5);
    const b = valueNoise(Math.cos(th) * 3.3 + 41, Math.sin(th) * 3.3 + 23);
    t *= 1 + org * 0.42 * ((a - 0.5) * 1.3 + (b - 0.5) * 0.7);
  }
  return Math.max(0.6, t);
}

/* 폭도 함께 흔들려야 왁스카빙처럼 보입니다 (두께만 흔들면 튜브가 울퉁불퉁한 느낌) */
function widthScaleAt(s, th) {
  let k = 1;
  const org = Number(s.organic) || 0;
  if (org > 0) {
    const n = valueNoise(Math.cos(th) * 2.1 + 61, Math.sin(th) * 2.1 + 37);
    k *= 1 + org * 0.26 * (n - 0.5) * 2;
  }
  // 손으로 넓히거나 좁힌 만큼 (최대 ±50%)
  k *= 1 + 0.5 * sculptWidthAt(s, th);
  return Math.max(0.25, k);
}

const WAVE_PICKED = 0.4;     // 옆모양을 웨이브로 고른 디자인의 물결 깊이 (두께 대비)
const WAVE_N = 6;            // 한 바퀴에 들어가는 물결 수
const FACETS_PICKED = 8;     // 옆모양을 패싯으로 고른 디자인의 면 수
const MIN_WALL = 0.28;   // mm — 이보다 얇아지면 면이 겹쳐 뚫린 것처럼 보입니다

/* 내경 굴림 — 안쪽 면의 양 가장자리를 둥글게 깎아 끼고 뺄 때 걸리지 않게 합니다.
 * 안쪽 한가운데는 그대로 두므로 호수(안지름)는 변하지 않고, 가장자리로 갈수록
 * 바깥으로 물러납니다. 단면에서 보면 안쪽이 완만한 활처럼 볼록해집니다.
 *   comfort 0 = 평평한 안쪽(굴림 없음) · 1 = 가장 깊게
 * 깊이는 그 자리 두께의 최대 40%, 1.0mm 를 넘지 않습니다. */
function comfortDepth(s, tLocal) {
  const c = Math.max(0, Math.min(1, Number(s.comfort) || 0));
  return c > 0 ? Math.min(1.0, 0.4 * tLocal) * c : 0;
}
function comfortRel(s, vRel, tLocal) {        // vRel: -0.5 ~ 0.5 (폭 대비)
  const d = comfortDepth(s, tLocal);
  if (!d) return 0;
  const k = Math.min(1, Math.abs(vRel) * 2);  // 0 = 가운데, 1 = 가장자리
  return d * k * k;                            // 활 모양 — 가장자리에서 가장 깊게
}

/* ─────────────────── 인장(시그넷) ───────────────────
 * 인장 반지는 한 바퀴 내내 같은 굵기가 아닙니다.
 * 뒤쪽은 가는 밴드로 얇게 지나가다가 손등 쪽에서만 어깨가 부풀어 오르고,
 * 맨 위는 원호를 따라가지 않는 "평평한 판"이 됩니다. 도장을 찍는 면이니까요.
 *
 * swell : 0 = 그냥 밴드, 1 = 판 한가운데
 */
function signetSwell(th, size) {
  // 손등 쪽(π/2)에서 얼마나 떨어져 있는가
  let d = Math.abs(th - Math.PI / 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  const reach = (Math.PI / 180) * 78 * Math.max(0.5, size);   // 판과 어깨가 차지하는 범위
  if (d >= reach) return 0;
  const t = 1 - d / reach;
  return t * t * (3 - 2 * t);        // 어깨가 부드럽게 솟아오르도록
}
const ENGRAVE_DEPTH = 0.3;  // 도안을 가장 깊게 팠을 때의 깊이 (두께 대비)
const STAR_DEPTH = 0.3;   // 별 조각 한가운데의 깊이 (두께 대비)
const EPOXY_HALF = 0.075;  // 홈 하나의 폭(반지 폭 대비 절반값) — 실물처럼 가늘게
const EPOXY_DEPTH = 0.2;   // 홈 깊이 (두께 대비)

/** 색을 채우는 구간인가 — 부분이면 손등 쪽 일부만 */
function epoxyArc(s, th) {
  const cov = CONFIG.epoxy.coverage[s.epoxyCoverage || 'part'];
  const ratio = cov ? cov.ratio : 1;
  if (ratio >= 1) return true;
  let d = Math.abs(th - Math.PI / 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d <= Math.PI * ratio;
}

function buildBand(s, model) {
  const innerR = R.sizeToInnerDiameter(s.size) / 2;
  const t = s.thickness;
  /* 도안 · 별 조각 · 다이아 텍스쳐는 자국이 아주 잘아서, 면이 성기면 계단처럼 보입니다.
   * 그럴 때만 면을 촘촘하게 잡습니다 (평소에는 가볍게 돌아갑니다). */
  const sparkle = s.texture === 'diamond';
  /* 밴드 무늬 — 디자인마다 정해진 겉면 무늬입니다 (나이테 · 꼰줄 · 구슬 · 돌담 · 물길). */
  const bandKind = (model && model.band) || '';
  const bandAmt = model && model.bandAmt != null ? model.bandAmt : 1;
  /* 어깨 장식 — 원석 양옆에만 들어가고 뒤로 갈수록 사라지는 무늬입니다.
   * 밴드를 한 바퀴 도는 무늬(band)와 달리 앞쪽에만 놓입니다. */
  const shoulder = (model && model.shoulder) || '';
  // 결이 잔 무늬는 줄이 성기면 계단처럼 끊겨 보입니다
  const bandDense = bandKind === 'bark' || bandKind === 'block' || bandKind === 'rope' || bandKind === 'hammer' ||
    (model && (model.shoulder === 'tick' || model.band === 'stud'));
  const fine = !!s.engrave || !!s.stars || sparkle || !!bandKind || !!(model && model.shoulder);
  const SEG = (sparkle || bandDense) ? 720 : fine ? 560 : 320;
  const profile = makeProfile(s, sparkle ? 54 : fine ? 46 : PROFILE_STEPS);
  const P = profile.length;
  const bump = bumpFor(s);

  // 도안 격자는 한 번만 풀어 둡니다 (정점마다 다시 풀면 눈에 띄게 느려집니다)
  const engGrid = s.engrave ? engraveOf(s) : null;
  const reliefGrid = s.relief ? reliefOf(s) : null;
  // 폭 — 가장자리마다 따로 밀어낸 자국 (a = +폭 쪽, b = -폭 쪽)
  const edgeA = s.sculptWa ? sculptOf(s, 'sculptWa') : null;
  const edgeB = s.sculptWb ? sculptOf(s, 'sculptWb') : null;
  // 별 조각은 각도를 라디안으로 미리 바꿔 둡니다 (0도 = 손등 쪽 한가운데)
  const stars = R.starList(s).map((st) => ({
    rad: Math.PI / 2 + (Number(st.angle) || 0) * Math.PI / 180,
    size: st.size
  }));
  const isSignet = s.profile === 'signet';
  const plateSize = Math.max(0.5, Math.min(1.5, Number(s.plateSize) || 1));
  // 판 바깥면이 놓일 높이 — 이 높이에 평평하게 맞춥니다
  const plateY = innerR + t * 1.5;

  const taper = model ? model.taper : 0;
  /* 물결(웨이브) — 둘레를 돌며 두께가 오르내려 옆에서 보면 윗선이 물결칩니다.
   * 물결이 없는 디자인(수선 등)에서 옆모양을 '웨이브'로 고르면 아무 변화가 없어
   * 둥근 면과 구분이 안 됐습니다. 그래서 고른 경우에는 눈에 보일 만큼 물결을 줍니다.
   * (원래 웨이브인 디자인은 디자인에 정해진 물결 그대로) */
  const wave = model ? model.wave : 0;
  const pickedWave = s.profile === 'wave' && model && model.profile !== 'wave';
  // 넓은 면을 비스듬히 쓸어 깎은 디자인 (그 디자인만 가집니다)
  const sweep = model ? (model.sweep || 0) : 0;
  /* 무늬는 한 바퀴에 "정수 개"가 들어가야 이음매에서 어긋나지 않습니다.
   * 그래서 둘레 길이를 재어 두고 간격으로 나눠 개수를 정합니다. */
  const CIRC = Math.PI * 2 * (innerR + t);
  const barkN  = Math.max(16, Math.round(CIRC / 0.8));    // 세로 결 한 줄 간격 0.8mm
  const ropeN  = Math.max(8,  Math.round(CIRC / 1.9));    // 꼬인 가닥 하나 1.9mm
  const beadN  = Math.max(6,  Math.round(CIRC / Math.max(2.2, s.width * 0.95)));
  // 돌담 한 덩이 (mm). 디자인이 크게 두드린 면을 원하면 blockCell 로 키웁니다
  const BCELL  = (model && model.blockCell) || 1.4;
  const blockN = Math.max(8,  Math.round(CIRC / BCELL));
  const rippleN = 3;                                      // 물길이 한 바퀴에 굽이치는 횟수
  const ropeSlant = (Math.PI * 2) / Math.max(1.6, s.width) * 1.15;
  /* 다이아 텍스쳐의 잔 면 — 한 바퀴에 정수 개가 들어가야 이음매에서 무늬가 어긋나지 않습니다 */
  const CELL = 0.5;                                  // 면 하나의 크기 (mm)
  const cellsAround = Math.max(24, Math.round(Math.PI * 2 * (innerR + t) / CELL));
  const twist = model ? model.twist : 0;
  /* 패싯 — 둘레를 평평한 면 여러 장으로 깎은 모양. 면 수가 없는 디자인에서 고르면 8면으로 깎습니다
   * (예전에는 면 수가 0이라 둥근 면과 똑같아 보였습니다) */
  const facets = (s.profile === 'facet' && model) ? (model.facets || FACETS_PICKED) : 0;
  // 원래 패싯인 디자인은 디자인에 정해진 모양 그대로, 다른 디자인에서 고른 패싯만 평평한 면으로
  const planarFacets = facets > 0 && model && model.profile !== 'facet';

  /* 한 바퀴를 SEG 줄로 나눕니다. 예전에는 마지막에 첫 줄과 똑같은 줄을 하나 더 두었는데,
   * 그러면 이음매에서 법선이 끊겨 그 자리만 검게 뜨거나 면이 비어 보였습니다.
   * 이제는 마지막 줄이 첫 줄을 그대로 가리키게 해서 완전히 닫힌 고리로 만듭니다. */
  const pos = new Float32Array(SEG * P * 3);
  const uv = new Float32Array(SEG * P * 2);
  // 정점마다 "표면에서 얼마나 파였는지"(0=표면, 1=가장 깊은 곳).
  // 홈에 색을 채우는 마감을 그릴 때 이 값을 씁니다.
  const depth = new Float32Array(SEG * P);
  const rot = new Array(P);
  let n = 0, m = 0, d = 0;

  /* 비틀림은 단면을 통째로 돌리는 대신 바깥면을 따라 도는 "나선 홈"으로 표현한다.
   * 단면을 돌리면 밴드가 스스로를 파고들어 면이 깨지고 명암이 뒤집힌다.
   * 홈은 바깥면을 안쪽으로 깎기만 하므로 반지가 언제나 온전한 고체로 남는다.
   * 홈 개수를 정수로 두어 한 바퀴 돌아와도 무늬가 어긋나지 않는다. */
  const grooves = twist > 0 ? Math.max(2, Math.round(twist * 5)) : 0;
  const grooveDepth = twist * 0.34;
  const groovePitch = 1.1;   // 폭 방향으로 기울어진 정도 — 클수록 비스듬해진다

  for (let i = 0; i < SEG; i++) {
    const th = (i / SEG) * Math.PI * 2;
    // 앞뒤 두께 차이와 손으로 깎은 굴곡을 여기서 함께 반영합니다
    const tAt = thicknessAt(s, th);
    let tRatio = tAt / t;
    let wScale = (1 - taper * (0.5 - 0.5 * Math.sin(th))) * widthScaleAt(s, th);

    /* 인장이면 손등 쪽만 어깨가 부풀어 판이 됩니다.
     * 뒤쪽은 가늘게 지나가므로 낀 느낌이 가볍습니다. */
    const swell = isSignet ? signetSwell(th, plateSize) : 0;
    if (swell > 0) {
      wScale *= 1 + 0.95 * swell * plateSize;   // 판이 옆으로 넓어지고
      tRatio *= 1 + 0.5 * swell;                // 두께도 같이 오릅니다
    }

    // 웨이브는 안쪽으로만 들어가므로 최대 두께는 그대로 유지된다
    let uScale = (1 - wave * 0.3 * (0.5 + 0.5 * Math.sin(3 * th))) * tRatio;
    // 고른 웨이브 — 한 바퀴에 여섯 번 잔물결이 오르내립니다 (바깥으로 솟지 않고 안쪽으로만 내려앉습니다)
    if (pickedWave) uScale *= 1 - WAVE_PICKED * (0.5 + 0.5 * Math.sin(WAVE_N * th));

    /* 물길 — 밴드가 옆으로 굽이치며 돌아갑니다.
     * 폭을 늘였다 줄이는 게 아니라 단면을 통째로 옆으로 밀어야 띠가 뱀처럼 흐릅니다. */
    let vOff = 0;
    if (bandKind === 'wavy') {
      vOff = 0.26 * bandAmt * s.width * Math.sin(rippleN * th);
    } else if (bandKind === 'chevron') {
      /* V자 — 손등 쪽으로 오면서 띠가 한쪽으로 비껴 나가 앞에서 한 점으로 꺾입니다.
       * 곡선이 아니라 직선으로 밀어야 꼭짓점이 또렷하게 섭니다. */
      let d = th - Math.PI / 2;
      if (d > Math.PI) d -= Math.PI * 2;
      else if (d < -Math.PI) d += Math.PI * 2;
      const reach = Math.PI * 0.45;
      const k2 = Math.max(0, 1 - Math.abs(d) / reach);
      vOff = -0.5 * bandAmt * s.width * k2;
    }
    /* 한쪽 가장자리만 넓히거나 좁히면 그쪽 절반만 늘고 줄어듭니다 (최대 ±50%).
     * 가운데 선은 그대로라 반대쪽은 손대지 않은 모양 그대로 남습니다. */
    const ea = edgeA ? readAt(edgeA, th) : 0;
    const eb = edgeB ? readAt(edgeB, th) : 0;
    for (let j = 0; j < P; j++) {
      const p = profile[j];
      const e = p.v >= 0 ? ea : eb;
      const k = e ? Math.max(0.25, 1 + 0.5 * e) : 1;
      rot[j] = { u: p.u, v: p.v * wScale * k + vOff, outer: p.outer };
    }

    let facetR = 1;
    if (facets > 0) {
      const seg = (Math.PI * 2) / facets;
      const delta = (((th % seg) + seg) % seg) - seg / 2;
      facetR = 1 / Math.cos(delta);
    }

    for (let j = 0; j < P; j++) {
      const p = rot[j];
      let radius = innerR;
      let carved = 0;                     // 이 정점이 파인 정도 (mm)
      // 내경 굴림 — 이 폭 자리에서 안쪽 면이 물러난 만큼
      const rel = comfortRel(s, profile[j].v / Math.max(0.001, s.width), tAt);
      if (!p.outer) radius += rel;
      if (p.outer) {
        let u = p.u * uScale;
        // 각진 면(패싯)은 모서리가 가장 두꺼워지므로, 모서리가 정확히 두께에 닿게 맞춘다
        if (facets > 0 && planarFacets) {
          /* 고른 패싯 — 바깥 면을 진짜 평평한 판 여러 장으로 깎습니다.
           * 모서리는 원래 두께 그대로, 면 가운데로 갈수록 평평하게 물러납니다 (벽은 남깁니다). */
          const outer = (innerR + u) * Math.cos(Math.PI / facets) * facetR;
          u = Math.max(Math.min(u, MIN_WALL + 0.25), outer - innerR);
        } else if (facets > 0) u *= facetR * Math.cos(Math.PI / facets);
        // 살 붙이기 · 깎기 — 짚은 자리만 도톰해지거나 얇아집니다 (최대 ±55%)
        if (reliefGrid) {
          const r = Math.max(-1, Math.min(1, reliefAt(reliefGrid, th, profile[j].v / Math.max(0.001, s.width))));
          if (Math.abs(r) > 0.002) u *= 1 + 0.55 * r;
        }
        /* 색을 채울 홈 — 폭 방향으로 좁게 파인 줄입니다.
         * 실물은 넓은 면에 색을 바르는 게 아니라 가는 홈을 파고 그 안에 수지를 채웁니다. */
        if (s.epoxy && epoxyArc(s, th)) {
          const lines = Math.max(1, Math.min(3, Number(s.epoxyLines) || 1));
          const halfW = p.v / Math.max(0.001, s.width);   // -0.5 ~ 0.5
          for (let L = 0; L < lines; L++) {
            const at = lines === 1 ? 0 : -0.22 + (0.44 * L) / (lines - 1);
            const d = Math.abs(halfW - at);
            if (d < EPOXY_HALF) {
              const cut = EPOXY_DEPTH * Math.max(t, 1.2) * (1 - (d / EPOXY_HALF) * 0.15);
              u -= cut;
              carved += cut;
            }
          }
        }
        /* 손으로 그린 도안 — 그 자리만 파고 들어갑니다.
         * 파인 깊이는 아래 유화·에폭시가 그대로 읽어 가므로,
         * 새긴 선에 색을 채우거나 까맣게 남길 수 있습니다. */
        if (engGrid) {
          const e = engraveAt(engGrid, th, profile[j].v / Math.max(0.001, s.width));
          if (e > 0.002) {
            const cut = e * ENGRAVE_DEPTH * Math.max(t, 1.2);
            u -= cut;
            carved += cut;
          }
        }
        /* 별 조각 — 새긴 골이 깊어 유화를 하면 까맣게 남고,
         * 광을 내면 골의 면이 빛을 튕겨 반짝입니다. */
        if (stars.length) {
          const sv = starCutAt(stars, s, th, profile[j].v / Math.max(0.001, s.width), innerR + u);
          if (sv > 0.002) {
            const cut = sv * STAR_DEPTH * Math.max(t, 1.2);
            u -= cut;
            carved += cut;
          }
        }
        if (grooves > 0) {
          const spiral = Math.sin(grooves * th + p.v * groovePitch);
          const cut = grooveDepth * t * (0.5 + 0.5 * spiral);
          u -= cut;
          carved += cut;
        }
        if (u < 0) u = 0;
        radius += u;
        /* 넓은 면을 한 방향으로 쓸어 깎은 자국.
         * 날을 비스듬히 뉘어 밀기 때문에 면이 대각선으로 길게 눕습니다.
         * 한 바퀴에 정수 개가 들어가도록 두어 돌아와도 무늬가 어긋나지 않습니다. */
        if (sweep > 0) {
          // 한 바퀴에 들어가는 면의 수 / 기울기. 리본처럼 크게 접힌 디자인은 면을 줄이고 더 눕힙니다
          const RIDGES = (model && model.sweepN) || 11;
          const SLANT = (model && model.sweepSlant) || 2.6;
          const phase = RIDGES * th + SLANT * p.v;
          /* 기본은 대칭 삼각파(양쪽 경사가 같은 능선).
           * 'fold' 는 한쪽은 길게 눕고 한쪽은 가파르게 떨어지는 톱니라,
           * 띠가 앞 장 위로 겹쳐 접힌 것처럼 보입니다 (리본 · 댕기). */
          let saw;
          if (model && model.sweepShape === 'fold') {
            const f = ((phase / (Math.PI * 2)) % 1 + 1) % 1;      // 0 → 1 로 오르다 뚝 떨어짐
            saw = f < 0.82 ? f / 0.82 : (1 - f) / 0.18;
          } else {
            saw = Math.abs(((phase / Math.PI) % 2) - 1);         // 0~1 삼각파 = 또렷한 모서리
          }
          const jitter = valueNoise(Math.cos(th) * 3 + 31, Math.sin(th) * 3 + p.v * 1.4);
          const cut = (saw * 0.74 + jitter * 0.26) * 0.12 * sweep * Math.max(t, 1.2);
          radius -= cut;
          carved += cut;
        }
        /* 디자인마다 정해진 겉면 무늬.
         * 모두 "바깥에서 안쪽으로 깎는" 방식이라 반지는 언제나 온전한 고체로 남고,
         * 파인 깊이(carved)를 유화·에폭시가 그대로 읽어 골을 어둡게 눌러 줍니다. */
        if (bandKind && bandKind !== 'wavy') {
          const pv = profile[j].v;
          const kv = Math.min(1, Math.abs(2 * pv / Math.max(0.001, s.width)));
          const depthScale = Math.max(t, 1.2) * bandAmt;
          let cut = 0;
          if (bandKind === 'bark') {
            /* 나이테 — 조각칼로 세로 결을 촘촘히 쳐 낸 자국.
             * 골마다 깊이를 조금씩 달리 두어 기계로 판 것처럼 보이지 않게 합니다. */
            const ax = (th / (Math.PI * 2)) * barkN;
            const ix = Math.floor(ax);
            const fx = ax - ix;
            const wx = ((ix % barkN) + barkN) % barkN;
            const vary = 0.5 + 0.5 * hash(wx * 1.7 + 3, 7);
            const tri = Math.abs(fx * 2 - 1);            // 0 = 골 한가운데
            cut = Math.pow(1 - tri, 2.2) * 0.11 * vary * depthScale;
          } else if (bandKind === 'rope') {
            /* 꼰줄 — 가닥이 비스듬히 감겨 올라갑니다. 가닥 사이가 깊게 패입니다. */
            const phase = ropeN * th + ropeSlant * pv;
            const c = Math.cos(phase);
            cut = Math.pow(0.5 - 0.5 * c, 1.3) * 0.24 * depthScale;
          } else if (bandKind === 'bead') {
            /* 구슬 — 동그란 알을 줄줄이 이어 붙인 밴드.
             * 알과 알 사이가 잘록해지도록 이음매만 깊게 깎아 냅니다. */
            const ax = (th / (Math.PI * 2)) * beadN;
            const fx = ax - Math.floor(ax);
            const along = Math.sin(Math.PI * fx);        // 0 = 이음매, 1 = 알 한가운데
            const across = Math.sqrt(Math.max(0, 1 - kv * kv));
            const swellB = Math.min(1, 0.2 + 0.8 * along) * (0.35 + 0.65 * across);
            cut = (1 - swellB) * 0.3 * depthScale;
          } else if (bandKind === 'stud') {
            /* 피라미드 — 네모난 뿔이 줄줄이 섭니다.
             * 칸 한가운데가 가장 높고 네 모서리로 갈수록 깎여 내려갑니다. */
            const STUD = 2.2;                                   // 뿔 하나 크기 (mm)
            const nAround = Math.max(8, Math.round(CIRC / STUD));
            const ax = (th / (Math.PI * 2)) * nAround;
            const fx = ax - Math.floor(ax);
            const rows = Math.max(1, Math.round(s.width / STUD));
            const ay = (pv / Math.max(0.001, s.width) + 0.5) * rows;
            const fy = ay - Math.floor(ay);
            const edge = Math.max(Math.abs(fx - 0.5), Math.abs(fy - 0.5)) * 2;
            cut = edge * 0.34 * depthScale;
          } else if (bandKind === 'block') {
            /* 돌담 — 망치로 두드려 면을 툭툭 끊어 낸 자국.
             * 덩이마다 기울기와 높이가 달라 모서리가 제각각 빛을 받습니다. */
            const ay = pv / BCELL;
            const iy = Math.floor(ay);
            const fy = ay - iy;
            const rowOff = hash(iy * 5.1 + 2, 13);
            const ax = (th / (Math.PI * 2)) * blockN + rowOff;
            const ix = Math.floor(ax);
            const fx = ax - ix;
            const wx = ((ix % blockN) + blockN) % blockN;
            const gx = (hash(wx * 1.9 + 7, iy * 2.7 + 3) * 2 - 1);
            const gy = (hash(wx * 3.3 + 13, iy * 1.1 + 23) * 2 - 1);
            const lift = hash(wx + 29, iy + 11);
            let nz = 0.5 + 0.55 * (gx * (fx - 0.5) + gy * (fy - 0.5)) + 0.35 * (lift - 0.5);
            nz = Math.max(0, Math.min(1, nz));
            cut = nz * 0.2 * depthScale;
          } else if (bandKind === 'hammer') {
            /* 망치 면 — 둘레 위에 점을 흩어 두고, 점마다 "평평한 면" 하나를 댑니다.
             * 면들 중 가장 낮은 것이 겉면이 되므로(min), 이웃한 두 면은 절벽이 아니라
             * 또렷한 능선으로 만납니다. 보석을 깎은 면처럼 경계가 곧고 끊김이 없습니다.
             *
             * 면 하나의 높이 = 점에서 멀어질수록 오르는 이차식 + 면마다 다른 기울기.
             * 이차식이 반지 둘레의 굽음을 상쇄해 면이 평평하게 펴지고,
             * 기울기가 달라 면마다 빛을 받는 방향이 제각각이 됩니다.
             * 둘레 칸 수를 정수로 두어 한 바퀴 돌아와도 이음매가 맞습니다. */
            const HC = (model && model.hammerCell) || 3.0;           // 면 하나 크기 (mm)
            const nA = Math.max(6, Math.round(CIRC / HC));
            const rowsH = Math.max(1, Math.round(s.width / HC));
            const cw = CIRC / nA, ch = s.width / rowsH;
            const R0 = innerR + t;
            const kx = 2.4 / R0, ky = 2.4 / R0;                      // 면이 펴지는 정도
            const x = (th / (Math.PI * 2)) * CIRC;                   // 둘레 위 거리 (mm)
            const y = pv + s.width / 2;                              // 폭 위 거리 (mm)
            const cx = Math.floor(x / cw), cy = Math.floor(y / ch);
            let qmin = 1e9;
            for (let ox = -1; ox <= 1; ox++) {
              for (let oy = -1; oy <= 1; oy++) {
                const gxI = cx + ox, gyI = cy + oy;
                if (gyI < -1 || gyI > rowsH) continue;
                const wx = ((gxI % nA) + nA) % nA;                   // 둘레는 돌아서 이어집니다
                const seed = wx * 31 + gyI * 7;
                const px = (gxI + 0.2 + 0.6 * hash(wx * 2.3 + 1, gyI * 3.7 + 5)) * cw;
                const py = (gyI + 0.2 + 0.6 * hash(wx * 4.1 + 9, gyI * 1.3 + 2)) * ch;
                const dx = x - px, dy = y - py;
                const tilx = (hash(seed + 3, 11) * 2 - 1) * 0.14;
                const tily = (hash(seed + 7, 19) * 2 - 1) * 0.14;
                const off = hash(seed + 13, 5) * 0.05;
                const q = 0.5 * kx * dx * dx + 0.5 * ky * dy * dy + tilx * dx + tily * dy + off;
                if (q < qmin) qmin = q;
              }
            }
            // 면 한가운데가 가장 깊고, 능선은 원래 겉면에 닿습니다
            const DEEP = 0.5 * kx * Math.pow(cw * 0.55, 2) + 0.5 * ky * Math.pow(ch * 0.55, 2);
            cut = Math.max(0, DEEP - qmin) * bandAmt;
            cut = Math.min(cut, 0.42 * Math.max(t, 1.2));            // 너무 깊이 파이지 않게
          }
          if (cut > 0) { radius -= cut; carved += cut; }
        }
        /* 어깨 장식 — 원석이 앉는 앞쪽 양옆에만 새깁니다.
         * 원석 바로 옆에서 시작해 손바닥 쪽으로 가며 서서히 사라지므로,
         * 밴드를 한 바퀴 두르는 무늬와 달리 앞모습에서만 보입니다. */
        if (shoulder) {
          let dth = th - Math.PI / 2;
          if (dth > Math.PI) dth -= Math.PI * 2;
          else if (dth < -Math.PI) dth += Math.PI * 2;
          const d = Math.abs(dth);
          /* 원석 자리(0.34rad 안쪽)는 비워 두고, 어깨만 쓰다가 옆구리에서 사라집니다.
           * 실물은 장식이 원석 바로 옆 좁은 구간에만 있고 뒤는 민자입니다. */
          const IN = 0.34, OUT = 1.16;
          const rise = smooth(Math.min(1, Math.max(0, (d - IN) / 0.14)));
          const fall = 1 - smooth(Math.min(1, Math.max(0, (d - (OUT - 0.3)) / 0.3)));
          const sh = rise * fall;
          if (sh > 0.01) {
            const pv2 = profile[j].v;
            const kv2 = Math.min(1, Math.abs(2 * pv2 / Math.max(0.001, s.width)));
            const scale = Math.max(t, 1.2) * sh;
            let cut2 = 0;
            if (shoulder === 'tick') {
              /* 굵은 홈 넷 — 어깨 길이를 넷으로 나눠 고르게 놓습니다.
               * 둘레 길이로 개수를 잡으면 호수가 커질수록 촘촘해져 실물과 달라집니다. */
              const TICKS = 4;
              const seg = (d - IN) / (OUT - IN);
              const ax = seg * TICKS;
              const tri = Math.abs((ax - Math.floor(ax)) * 2 - 1);
              cut2 = Math.pow(1 - tri, 1.6) * 0.13 * scale;
            } else if (shoulder === 'line') {
              // 가로 줄 — 밴드를 따라 길게 두 줄
              [0.42, 0.78].forEach(function (at) {
                const dd = Math.abs(kv2 - at);
                if (dd < 0.1) cut2 = Math.max(cut2, (1 - dd / 0.1) * 0.15 * scale);
              });
            } else if (shoulder === 'notch') {
              // 각진 홈 — 원석 옆에 V 자로 한 줄
              const dd = Math.abs(d - 0.62);
              if (dd < 0.12) cut2 = (1 - dd / 0.12) * 0.22 * scale;
            } else if (shoulder === 'split') {
              // 갈라짐 — 어깨 가운데가 두 갈래로 나뉩니다
              const g = 0.3;
              if (kv2 < g) cut2 = (1 - (kv2 / g) * (kv2 / g)) * 0.46 * scale;
            }
            if (cut2 > 0) { radius -= cut2; carved += cut2; }
          }
        }
        if (bump.amp > 0) {
          let nz;
          if (sparkle) {
            /* 다이아 텍스쳐 — 아주 작은 면을 촘촘히 깎아 냅니다.
             * 칸마다 기울기가 달라서 칸과 칸 사이가 각이 지고, 그 각들이 빛을 잘게 튕깁니다.
             * (서리가 앉은 것처럼 보이는 이유입니다.) */
            const ay = p.v / CELL;
            const iy = Math.floor(ay);
            const fy = ay - iy;
            /* 줄마다 시작점을 어긋나게 둡니다 — 바둑판처럼 줄이 맞으면 손으로 깎은 것처럼 안 보입니다.
             * (한 바퀴 칸 수가 정수라 이렇게 밀어도 이음매는 그대로 이어집니다.) */
            const rowOff = hash(iy * 7.3 + 3, 19);
            const ax = (th / (Math.PI * 2)) * cellsAround + rowOff;
            const ix = Math.floor(ax);
            const fx = ax - ix;
            const wx = ((ix % cellsAround) + cellsAround) % cellsAround;   // 이음매에서 같은 칸을 가리키도록
            const gx = (hash(wx * 1.7 + 5, iy * 2.3 + 11) * 2 - 1) * (0.6 + hash(wx + 3, iy + 5) * 0.8);
            const gy = (hash(wx * 3.1 + 17, iy * 1.3 + 29) * 2 - 1) * (0.6 + hash(wx + 13, iy + 2) * 0.8);
            const lift = hash(wx + 41, iy + 7);                  // 칸마다 깊이도 다르게
            nz = 0.5 + 0.38 * (gx * (fx - 0.5) + gy * (fy - 0.5)) + 0.3 * (lift - 0.5);
            nz = Math.max(0, Math.min(1, nz));
          } else {
            // 둘레 방향으로 주기적인 노이즈 — 한 바퀴 돌아와도 결이 어긋나지 않는다
            nz = valueNoise(Math.cos(th) * bump.ring + 31, Math.sin(th) * bump.ring + p.v * bump.axial);
          }
          const cut = nz * bump.amp * Math.max(t, 1.2);
          radius -= cut;
          carved += cut;
        }
        /* 판은 원호를 따라 휘지 않고 한 평면 위에 평평하게 놓입니다.
         * 각도 th 에서 그 평면까지의 거리는 plateY / sin(th) 입니다. */
        if (swell > 0.02) {
          const sn = Math.sin(th);
          if (sn > 0.28) {
            const flatR = plateY / sn;
            const k = swell * 0.9;
            radius = radius * (1 - k) + Math.min(flatR, radius * 1.9) * k;
          }
        }

        // 벽이 0이 되면 안쪽 면과 바깥 면이 겹쳐 반지가 뚫려 보입니다.
        // 내경을 굴린 만큼 안쪽 면이 바깥으로 나와 있으므로 그 위로 벽을 남깁니다.
        if (radius < innerR + rel + MIN_WALL) radius = innerR + rel + MIN_WALL;
      }
      depth[d++] = carved;
      pos[n++] = radius * Math.cos(th);
      pos[n++] = radius * Math.sin(th);
      pos[n++] = p.v;
      uv[m++] = i / SEG;
      uv[m++] = j / (P - 1);
    }
  }

  /* 부분 무광을 칠한 자리는 다른 재질로 그려야 하므로,
   * 면을 "그대로"와 "무광" 두 무리로 나눠 담고 그룹으로 표시해 둡니다. */
  const plain = [], matte = [];
  const hasMatte = !!s.matte;
  const mapG = s.matteMap ? matteMapOf(s) : null;
  for (let i = 0; i < SEG; i++) {
    const i2 = (i + 1) % SEG;          // 마지막 줄은 첫 줄로 돌아온다
    const thm = ((i + 0.5) / SEG) * Math.PI * 2;
    const ring = (hasMatte && matteAt(s, thm) > 0.34) ? matte : plain;
    for (let j = 0; j < P; j++) {
      const j2 = (j + 1) % P;
      let box = ring;
      // 짚은 자리 무광은 바깥 면(옆면 포함)에서 그 폭 자리만 — 손가락 닿는 안쪽은 그대로
      if (mapG && box === plain && (profile[j].outer || profile[j2].outer)) {
        const vN = (profile[j].v + profile[j2].v) / 2 / Math.max(0.001, s.width);
        if (engraveAt(mapG, thm, vN) > 0.34) box = matte;
      }
      const a = i * P + j;
      const b = i * P + j2;
      const c = i2 * P + j;
      const d = i2 * P + j2;
      /* 감는 방향이 뒤집혀 있으면 바깥 면의 법선이 안쪽을 향해
       * 그 면이 통째로 잘려 나가고, 각도에 따라 반지가 뚫려 보입니다.
       * 단면을 도는 방향(S)과 둘레를 도는 방향(T)의 외적이 바깥을 향하도록 감습니다. */
      box.push(a, b, c, b, d, c);
    }
  }
  const idx = plain.concat(matte);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // 가장 깊게 파인 곳을 1로 두고 0~1로 정규화해 둔다
  let maxCarve = 0;
  for (let i = 0; i < depth.length; i++) if (depth[i] > maxCarve) maxCarve = depth[i];
  geo.userData.depth = depth;
  geo.userData.maxCarve = maxCarve;
  // 0번 무리 = 원래 마감, 1번 무리 = 손으로 칠한 부분 무광
  geo.addGroup(0, plain.length, 0);
  if (matte.length) geo.addGroup(plain.length, matte.length, 1);
  geo.userData.hasMatte = matte.length > 0;
  return geo;
}

/* 유화 — 파인 곳만 어둡게.
 * 정점마다 "얼마나 파였는지"를 이미 들고 있으므로, 그 값으로 정점 색을 눌러 줍니다.
 * 높은 면은 1(그대로), 가장 깊은 골은 거의 검게. */
function paintOxidize(geo, spec) {
  if (!spec.oxidize) return false;
  const maxCarve = geo.userData.maxCarve || 0;
  const depth = geo.userData.depth;
  if (!depth) return false;

  const dark = new THREE.Color(CONFIG.oxidize.color).multiplyScalar(0.35);
  const colors = new Float32Array(depth.length * 3);
  const smooth = function (x) { return x * x * (3 - 2 * x); };

  /* 골이 얼마나 깊게 파였느냐에 따라 유화가 앉는 모습이 다릅니다.
   * 깊게 판 자리는 솟은 면만 다시 갈아 내므로 검은 골과 은색 마루가 또렷이 갈리고,
   * 겉면을 살짝 눌러 둔 정도(무광·사포)는 골이 머리카락 굵기라 갈릴 것이 없어
   * 표면 전체가 고르게 가라앉습니다. 이 둘을 섞지 않으면 얕은 텍스처가
   * 흑백 얼룩처럼 튀어 보입니다. */
  const deep = Math.min(1, maxCarve / 0.35);   // 0.35mm 넘게 파였을 때부터 또렷이 갈립니다
  for (let i = 0; i < depth.length; i++) {
    const t = maxCarve > 0.01
      ? Math.min(1, Math.max(0, depth[i] / maxCarve))
      : 0.7;
    let k = smooth(Math.min(1, Math.max(0, (t - 0.28) / 0.42))) * 0.95;
    k = k * deep + 0.58 * (1 - deep);
    colors[i * 3]     = 1 - k + dark.r * k;
    colors[i * 3 + 1] = 1 - k + dark.g * k;
    colors[i * 3 + 2] = 1 - k + dark.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return true;
}

/* 홈에 색을 채우는 마감(에폭시).
 * 금속에 색이 스며드는 것이 아니라, 파인 홈 안에 수지가 고여 굳는 것입니다.
 * 그래서 색과 금속의 경계가 또렷하고, 표면과 같은 높이로 깎아 내므로 단차가 없습니다.
 *
 * 만드는 방법 — 홈이 일정 깊이 이상인 자리만 골라,
 * 그 자리의 "파기 전 표면 높이"에 딱 맞춘 뚜껑을 따로 만들어 덮습니다.
 * (파임은 반지 중심에서 바깥으로 곧게 들어가므로, 반지름만 되돌리면 정확히 원래 면입니다.)
 */
function buildEpoxyFill(bandGeo, spec) {
  const epoxy = spec.epoxy && CONFIG.epoxy.colors[spec.epoxy];
  const maxCarve = bandGeo.userData.maxCarve || 0;
  if (!epoxy || !epoxy.color || maxCarve < 0.02) return null;

  const depth = bandGeo.userData.depth;
  const pos = bandGeo.attributes.position;
  const idx = bandGeo.getIndex();
  // 색 채움 홈은 다른 가공보다 깊게 파므로, 그 깊이에 가까운 자리만 고릅니다
  const thr = maxCarve * 0.62;

  const fill = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const r = Math.hypot(x, y);
    const k = r > 1e-6 ? (r + depth[i]) / r : 1;
    fill[i * 3] = x * k;
    fill[i * 3 + 1] = y * k;
    fill[i * 3 + 2] = pos.getZ(i);
  }

  function inArc(i) {
    return epoxyArc(spec, Math.atan2(pos.getY(i), pos.getX(i)));
  }

  const keep = [];
  for (let f = 0; f < idx.count; f += 3) {
    const a = idx.getX(f), b = idx.getX(f + 1), c = idx.getX(f + 2);
    if (depth[a] > thr && depth[b] > thr && depth[c] > thr &&
        inArc(a) && inArc(b) && inArc(c)) keep.push(a, b, c);
  }
  if (keep.length < 3) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(fill, 3));
  geo.setIndex(keep);
  geo.computeVertexNormals();

  // 수지는 금속이 아니라 유리질에 가깝습니다 — 반사는 겉면에서만 납니다
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(epoxy.color),
    metalness: 0,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 0.7
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  return mesh;
}

/* ─────────────────── 검정 브러쉬로 그린 그림 ───────────────────
 * 파는 것이 아니라 겉면에 칠하는 층입니다.
 * 반지 겉면을 펼친 그림판에 선을 그려서, 그 그림을 표면에 그대로 입힙니다.
 *
 * 밴드의 uv 는 x = 둘레(0~1, 0이 +X 방향), y = 단면을 한 바퀴 돈 위치입니다.
 * 바깥 면은 y = 0.5(폭 +쪽) ~ 1.0(폭 -쪽) 구간을 씁니다.
 * 손등 쪽 한가운데(각도 0도)는 둘레로 치면 1/4 지점입니다.
 */
const DRAW_W = 2048;

function drawTexture(s) {
  const strokes = R.drawStrokes(s);
  if (!strokes.length) return null;

  const innerR = R.sizeToInnerDiameter(s.size) / 2;
  const circ = Math.PI * 2 * (innerR + s.thickness);     // 겉둘레 (mm)
  const pxPerMm = DRAW_W / circ;
  // 가로세로 배율을 같게 맞춰야 붓이 동그랗게 찍히고 글씨도 안 눌립니다
  const H = Math.max(64, Math.min(1024, Math.round(2 * s.width * pxPerMm)));
  /* 위아래로 흰 여백을 둡니다.
   * 안쪽 면은 그림판 밖을 가리키는데, 가장자리 색이 그대로 늘어나 붙기 때문입니다.
   * 여백이 희면 안쪽 면에는 아무것도 묻지 않습니다. */
  const PAD = Math.max(4, Math.round(H * 0.1));
  const T = H + PAD * 2;

  const cv = document.createElement('canvas');
  cv.width = DRAW_W; cv.height = T;
  const x = cv.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, DRAW_W, T);
  x.save();
  x.beginPath();
  x.rect(0, PAD, DRAW_W, H);
  x.clip();                     // 반지 폭 밖으로는 칠이 넘어가지 않습니다
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.strokeStyle = '#080808';
  x.fillStyle = '#080808';

  for (const st of strokes) {
    const lw = Math.max(1.5, st.width * pxPerMm);
    x.lineWidth = lw;
    // 이음매를 넘어가는 선이 화면을 가로지르지 않도록, 앞 점에서 가까운 쪽으로 이어 둡니다
    const xs = [], ys = [];
    let prev = null;
    for (const p of st.pts) {
      let ux = (((0.25 + p.deg / 360) % 1) + 1) % 1 * DRAW_W;
      if (prev !== null) {
        while (ux - prev > DRAW_W / 2) ux -= DRAW_W;
        while (prev - ux > DRAW_W / 2) ux += DRAW_W;
      }
      prev = ux;
      xs.push(ux);
      // 폭 방향: 여백 안쪽이 반지 폭입니다
      ys.push(PAD + (0.5 + p.v) * H);
    }

    for (const off of [-DRAW_W, 0, DRAW_W]) {
      if (xs.length === 1) {
        x.beginPath();
        x.arc(xs[0] + off, ys[0], lw / 2, 0, Math.PI * 2);
        x.fill();
        continue;
      }
      x.beginPath();
      for (let i = 0; i < xs.length; i++) {
        if (i === 0) x.moveTo(xs[i] + off, ys[i]);
        else x.lineTo(xs[i] + off, ys[i]);
      }
      x.stroke();
    }
  }

  x.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  /* 그림판은 바깥 면(uv.y 0.5~1)에만 놓입니다. 그 구간에 그림판의 여백 안쪽이 딱 맞게 오도록 옮깁니다. */
  tex.repeat.set(1, (2 * H) / T);
  tex.offset.set(0, 1 - (PAD + 2 * H) / T);
  return tex;
}

/** 재질에 그림 층을 입힙니다 — 칠한 자리는 검고, 금속기가 빠져 잉크처럼 보입니다 */
function applyDraw(mat, tex) {
  if (!tex) return;
  mat.map = tex;
  mat.metalnessMap = tex;     // 칠한 자리는 금속이 아니라 칠한 면이 됩니다
  mat.needsUpdate = true;
}

/* ─────────────────── 재질 ─────────────────── */
/* 거친 마감일수록 반사를 줄여야 질감이 보입니다.
 * 반사를 그대로 두면 표면이 하얗게 날아가 결이 사라집니다. */
const FINISH = {
  polish:  { roughness: 0.07, env: 1.30, tone: 1.00 },
  diamond: { roughness: 0.17, env: 1.20, tone: 0.97 },
  sandbar: { roughness: 0.30, env: 0.96, tone: 0.92 },
  fine:    { roughness: 0.46, env: 0.70, tone: 0.86 },
  soft:    { roughness: 0.36, env: 0.82, tone: 0.90 }
};

/** 부분 무광으로 칠한 자리에 쓸 재질 — 같은 색, 반사만 죽인다 */
function matteMaterial(s) {
  const m = metalMaterial(s);
  m.roughness = Math.min(0.85, Math.max(0.5, m.roughness + 0.42));
  m.envMapIntensity = m.envMapIntensity * 0.55;
  m.clearcoat = 0;
  return m;
}

function metalMaterial(s) {
  const f = FINISH[s.texture] || FINISH.polish;
  /* 유화는 반지 전체를 까맣게 만드는 것이 아닙니다.
   * 전체를 태운 뒤 솟은 면만 다시 갈아 내므로, 골은 까맣게 남고 높은 면은 은색으로 돌아옵니다.
   * 그래서 색은 그대로 두고, 아래 paintOxidize 가 파인 깊이만큼만 어둡게 칠합니다. */
  const base = new THREE.Color(R.metalColor(s));
  const color = base.multiplyScalar(f.tone);
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1,
    roughness: f.roughness,
    envMapIntensity: f.env,
    clearcoat: s.texture === 'polish' ? 0.35 : 0,
    clearcoatRoughness: 0.08
  });
}

/* 온명이 쓰는 원석은 대부분 불투명한 카보숑입니다.
 * 투명 재질로 처리하면 작은 알에서 뒤쪽 금속이 비쳐 색이 사라지므로,
 * 맑은 보석 몇 가지만 살짝 투명하게 둡니다. */
/* ─────────────────── 원석 재질 ───────────────────
 * 천연석은 돌마다 생김새가 다릅니다. 색 하나로 칠하면 플라스틱 구슬처럼 보여서,
 * 돌마다 "어떤 성질의 돌인가(kind)"와 "속에 어떤 무늬가 있는가(pattern)"를 적어 두고
 * 그에 맞게 그립니다.
 *   opaque       빛이 거의 안 통하는 돌 — 표면 광택과 무늬가 주인공 (터쿼이즈, 라피스 …)
 *   translucent  빛이 살짝 스미는 돌 — 속이 뿌옇게 밝습니다 (칼세도니, 아게이트 …)
 *   clear        투명한 돌 — 속으로 빛이 들어가 색이 깊어집니다 (시트린, 가넷 …)
 *   labradorite  보는 각도에 따라 푸른빛 · 금빛이 번쩍입니다
 *   moonstone    안쪽에서 푸르스름한 빛이 떠오릅니다
 *   opal         여러 색이 조각조각 비칩니다
 *   pearl        진주 광택 */
const STONE_LOOK = {
  '우나카이트':            { kind: 'opaque', pattern: 'mottle', c2: '#c98476' },
  '블랙 루틸 쿼츠':        { kind: 'clear', pattern: 'needles', base: '#eef0f2', c2: '#141416' },
  '스노우플레이크 옵시디언': { kind: 'opaque', pattern: 'flakes', base: '#202024', c2: '#e2e2de' },
  '라브라도라이트':        { kind: 'labradorite', pattern: 'streaks', base: '#4d5b64', c2: '#2e383f' },
  '아이올라이트':          { kind: 'clear', ior: 1.54 },
  '라리마':               { kind: 'opaque', pattern: 'web', c2: '#eef8fa' },
  '시트린':               { kind: 'clear', ior: 1.55 },
  '터쿼이즈':             { kind: 'opaque', pattern: 'matrix', c2: '#5e4c38' },
  '오팔':                 { kind: 'opal', pattern: 'fire' },
  '모스아게이트':          { kind: 'translucent', pattern: 'moss', base: '#dfe5d9', c2: '#3c6a33' },
  '블루레이스 아게이트':    { kind: 'translucent', pattern: 'bands', c2: '#f2f6fb' },
  '문스톤':               { kind: 'moonstone' },
  '플루오라이트':          { kind: 'clear', pattern: 'bands', c2: '#a48fd0', ior: 1.43 },
  '로즈 칼세도니':         { kind: 'translucent', pattern: 'cloud', c2: '#f3d3d5' },
  '화이트 쿼츠':           { kind: 'translucent', pattern: 'cloud', c2: '#ffffff' },
  '가넷':                 { kind: 'clear', ior: 1.76 },
  '루비':                 { kind: 'clear', ior: 1.76 },
  '커넬리언':             { kind: 'translucent', pattern: 'bands', c2: '#e39058' },
  '핑크 토르말린':         { kind: 'clear', ior: 1.62 },
  '스모키 쿼츠':           { kind: 'clear', ior: 1.55 },
  '핑크 진주':             { kind: 'pearl' },
  '아쿠아마린':            { kind: 'clear', ior: 1.57 },
  '라피스라쥴리':          { kind: 'opaque', pattern: 'pyrite', c2: '#d9b45c' },
  '카이나이트':            { kind: 'translucent', pattern: 'streaks', c2: '#9db3dd' },
  '블랙 오닉스':           { kind: 'opaque' },
  '에퍼타이트':            { kind: 'translucent', pattern: 'cloud', c2: '#8fd0cb' },
  '페리도트':             { kind: 'clear', ior: 1.67 }
};

function lookOf(name) {
  const n = (ONM.stoneName ? ONM.stoneName(name) : name) || '';
  return STONE_LOOK[n] || { kind: 'opaque' };
}

/* 돌 속 무늬 — 위에서 내려다본 평면(지름 = 그림 한 장)에 그려 알 위에 덮습니다.
 * 같은 돌은 같은 무늬가 나오도록 이름으로 씨앗을 정합니다. */
const _patternCache = {};
function stonePattern(name, look, baseHex) {
  const key = name + '|' + baseHex;
  if (_patternCache[key]) return _patternCache[key];
  const N = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const c2 = look.c2 || '#ffffff';
  g.fillStyle = baseHex;
  g.fillRect(0, 0, N, N);
  const blob = (x, y, r, color, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  };
  const wander = (x, y, steps, len, color, w, a) => {
    g.strokeStyle = color; g.lineWidth = w; g.globalAlpha = a; g.lineCap = 'round';
    let ang = rnd() * Math.PI * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < steps; i++) { ang += (rnd() - 0.5) * 1.1; x += Math.cos(ang) * len; y += Math.sin(ang) * len; g.lineTo(x, y); }
    g.stroke(); g.globalAlpha = 1;
  };
  switch (look.pattern) {
    case 'mottle':      // 우나카이트 — 초록 바탕에 분홍 장석이 얼룩덜룩
      for (let i = 0; i < 26; i++) blob(rnd() * N, rnd() * N, 14 + rnd() * 34, c2, 0.55 + rnd() * 0.35);
      for (let i = 0; i < 30; i++) blob(rnd() * N, rnd() * N, 6 + rnd() * 14, '#5f7445', 0.35);
      break;
    case 'needles':     // 블랙 루틸 — 맑은 수정 속에 검은 바늘
      for (let i = 0; i < 26; i++) {
        const x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI, L = 30 + rnd() * 110;
        g.strokeStyle = c2; g.globalAlpha = 0.55 + rnd() * 0.4; g.lineWidth = 0.8 + rnd() * 1.6;
        g.beginPath(); g.moveTo(x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2);
        g.lineTo(x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2); g.stroke();
      }
      g.globalAlpha = 1;
      break;
    case 'flakes':      // 스노우플레이크 옵시디언 — 검은 바탕에 흰 눈꽃
      for (let i = 0; i < 16; i++) {
        const x = rnd() * N, y = rnd() * N, r = 8 + rnd() * 16;
        blob(x, y, r, c2, 0.75);
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + rnd(); blob(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.45, c2, 0.5); }
      }
      break;
    case 'web':         // 라리마 — 하늘색 바탕에 흰 물결 그물
      for (let i = 0; i < 34; i++) wander(rnd() * N, rnd() * N, 14, 9, c2, 2 + rnd() * 5, 0.45);
      break;
    case 'matrix':      // 터쿼이즈 — 갈색 모암 줄기가 거미줄처럼
      for (let i = 0; i < 22; i++) wander(rnd() * N, rnd() * N, 10, 10, c2, 0.8 + rnd() * 1.4, 0.7);
      for (let i = 0; i < 10; i++) blob(rnd() * N, rnd() * N, 20 + rnd() * 30, '#7fd3d0', 0.25);
      break;
    case 'moss':        // 모스 아게이트 — 맑은 바탕에 이끼 같은 초록 덩굴
      for (let i = 0; i < 18; i++) {
        const x = rnd() * N, y = rnd() * N;
        for (let k = 0; k < 9; k++) blob(x + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 50, 4 + rnd() * 12, c2, 0.5);
      }
      break;
    case 'bands': {     // 아게이트 · 커넬리언 · 플루오라이트 — 결이 겹겹이
      const cx = N * (0.3 + rnd() * 0.4), cy = N * (0.3 + rnd() * 0.4);
      for (let r = N; r > 4; r -= 7 + rnd() * 10) {
        g.strokeStyle = c2; g.globalAlpha = 0.25 + rnd() * 0.35; g.lineWidth = 2 + rnd() * 5;
        g.beginPath(); g.ellipse(cx, cy, r, r * (0.6 + rnd() * 0.3), rnd() * 0.4, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'streaks':     // 라브라도라이트 · 카이나이트 — 한 방향으로 결이 진 줄무늬
      for (let i = 0; i < 40; i++) {
        const y = rnd() * N;
        g.strokeStyle = c2; g.globalAlpha = 0.2 + rnd() * 0.4; g.lineWidth = 2 + rnd() * 8;
        g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(N * 0.3, y + (rnd() - 0.5) * 30, N * 0.7, y + (rnd() - 0.5) * 30, N, y + (rnd() - 0.5) * 20); g.stroke();
      }
      g.globalAlpha = 1;
      break;
    case 'pyrite':      // 라피스 — 짙은 남색에 금빛 황철석 점, 흰 방해석 줄
      for (let i = 0; i < 8; i++) wander(rnd() * N, rnd() * N, 6, 12, '#d8dfe8', 2 + rnd() * 3, 0.35);
      for (let i = 0; i < 70; i++) blob(rnd() * N, rnd() * N, 1.2 + rnd() * 3.2, c2, 0.95);
      break;
    case 'cloud':       // 칼세도니 · 수정 — 속이 구름처럼 뿌옇게
      for (let i = 0; i < 24; i++) blob(rnd() * N, rnd() * N, 20 + rnd() * 50, c2, 0.25);
      break;
    case 'fire': {      // 오팔 — 여러 색 조각이 겹쳐 비칩니다
      const fire = ['#7fd6c2', '#f2a6c8', '#a3c9ff', '#ffe08a', '#b6f0a0'];
      for (let i = 0; i < 40; i++) blob(rnd() * N, rnd() * N, 10 + rnd() * 26, fire[i % fire.length], 0.45);
      break;
    }
    default:
      // 무늬가 없는 돌도 아주 엷은 결은 있습니다 — 완전히 고른 색은 인조석처럼 보여서
      for (let i = 0; i < 14; i++) blob(rnd() * N, rnd() * N, 30 + rnd() * 50, '#ffffff', 0.06);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  _patternCache[key] = tex;
  return tex;
}

/** 위에서 내려다본 평면으로 무늬를 덮습니다 (구 그대로 감으면 꼭대기에서 무늬가 오므라듭니다) */
function planarUV(geo, r) {
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / (2 * r) + 0.5;
    uv[i * 2 + 1] = p.getZ(i) / (2 * r) + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/* 면을 낸 알(모이사나이트 · 큐빅) — 라운드 브릴리언트 컷.
 * 테이블(윗면) · 크라운 · 거들(허리) · 파빌리온(아래 원뿔)을 16면으로 깎고,
 * 면마다 빛이 따로 튀도록 평평하게(flat) 그립니다. 비율은 실제 브릴리언트에 맞췄습니다
 * (테이블 지름 57% · 크라운 높이 16% · 파빌리온 깊이 43%). */
/* 면을 낸 보석이 반짝이는 건 면마다 주변의 밝은 점과 어두운 곳이 번갈아 비치기 때문입니다.
 * 금속용 환경(부드러운 그라데이션)을 그대로 쓰면 면이 다 비슷하게 비쳐 밋밋한 원판처럼 보여서,
 * 보석에만 어두운 바탕에 밝은 점이 흩뿌려진 환경을 따로 비춥니다 (보석 촬영 조명과 같은 원리). */
let gemEnv = null;
function sparkleEnvTexture() {
  const W = 512, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3a3d44'); bg.addColorStop(0.5, '#15161a'); bg.addColorStop(1, '#2a2b30');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  let sd = 7;
  const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const spot = (x, y, r, col, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  // 위쪽 넓은 조명판 몇 개 + 흩뿌린 작은 반짝임 + 무지갯빛 조금 (모이사나이트의 불꽃)
  for (let i = 0; i < 6; i++) spot(rnd() * W, rnd() * H * 0.45, 26 + rnd() * 30, '#ffffff', 0.9);
  for (let i = 0; i < 90; i++) spot(rnd() * W, rnd() * H, 2 + rnd() * 7, '#ffffff', 0.7 + rnd() * 0.3);
  const fire = ['#ff6a5a', '#ffd36a', '#7cf0a0', '#6ab8ff', '#c88bff'];
  for (let i = 0; i < 24; i++) spot(rnd() * W, rnd() * H, 3 + rnd() * 6, fire[i % fire.length], 0.75);
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* 브릴리언트 컷을 위에서 보면 테이블 너머로 아래 면들이 되비쳐 여덟 갈래 별 무늬가 보입니다.
 * 화면의 투과 계산은 알 속에서 빛이 여러 번 꺾이는 것까지는 못 그리므로, 그 무늬를 그림으로 얹습니다. */
let _brilliantMap = null;
function brilliantPattern() {
  if (_brilliantMap) return _brilliantMap;
  const N = 256, c = N / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  g.fillStyle = '#e9ecf1'; g.fillRect(0, 0, N, N);
  // 16갈래 — 밝고 어두운 쐐기가 번갈아
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
    g.fillStyle = i % 2 ? '#ffffff' : '#9aa1ad';
    g.beginPath(); g.moveTo(c, c); g.arc(c, c, c, a0, a1); g.closePath(); g.fill();
  }
  // 여덟 갈래 화살 — 가운데에서 뻗는 어두운 연 모양
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
    const tip = c * 0.62, side = c * 0.2;
    g.fillStyle = 'rgba(70,76,88,0.75)';
    g.beginPath();
    g.moveTo(c, c);
    g.lineTo(c + Math.cos(a - 0.22) * side * 1.6, c + Math.sin(a - 0.22) * side * 1.6);
    g.lineTo(c + Math.cos(a) * tip, c + Math.sin(a) * tip);
    g.lineTo(c + Math.cos(a + 0.22) * side * 1.6, c + Math.sin(a + 0.22) * side * 1.6);
    g.closePath(); g.fill();
  }
  // 가운데 작은 팔각 테이블 반사 + 무지갯빛 조각 몇 개
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineTo(c + Math.cos(a) * c * 0.16, c + Math.sin(a) * c * 0.16); }
  g.closePath(); g.fill();
  const fire = ['#ff7a6a', '#ffd76a', '#86f0a6', '#78c0ff', '#cf96ff'];
  for (let i = 0; i < 10; i++) {
    const a = i * 2.39, r = c * (0.25 + (i % 4) * 0.15);
    g.fillStyle = fire[i % fire.length]; g.globalAlpha = 0.55;
    g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 4 + (i % 3) * 2, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  _brilliantMap = tex;
  return tex;
}

function brilliantGeometry(r) {
  const pts = [
    new THREE.Vector2(0.0001, -0.86 * r),       // 큘렛 (아래 뾰족한 끝)
    new THREE.Vector2(r, -0.02 * r),            // 거들 아래
    new THREE.Vector2(r, 0.02 * r),             // 거들 위
    new THREE.Vector2(0.78 * r, 0.2 * r),       // 크라운 중간 (스타 · 베젤 면)
    new THREE.Vector2(0.57 * r, 0.32 * r),      // 테이블 가장자리
    new THREE.Vector2(0.0001, 0.32 * r)         // 테이블 가운데
  ];
  return planarUV(new THREE.LatheGeometry(pts, 16), r);
}

function facetedMaterial(spec) {
  const moissanite = spec.stoneType === 'moissanite';
  const hex = moissanite ? '#ffffff' : (R.stoneColorOf(spec) || '#ffffff');
  const c = new THREE.Color(hex);
  const dark = c.getHSL({}).l < 0.2;                 // 오닉스처럼 아주 짙은 큐빅은 빛을 못 통과시킵니다
  /* 작은 알은 실제로도 속을 들여다보기보다 면에 비친 빛으로 반짝여 보입니다.
   * 그래서 투과는 약하게, 면 반사를 강하게 둡니다 (색 있는 큐빅은 그 색이 반사에 묻어납니다). */
  return new THREE.MeshPhysicalMaterial({
    color: moissanite ? 0xffffff : c,
    map: dark ? null : brilliantPattern(),
    metalness: dark ? 0.1 : (moissanite ? 0.55 : 0.4),
    roughness: 0,
    flatShading: true,
    envMap: gemEnv || null,
    envMapIntensity: moissanite ? 3.2 : 2.4,
    transmission: dark ? 0 : 0.35,
    thickness: R.stoneMm(spec) * 0.6,
    ior: moissanite ? 2.65 : 2.15,
    dispersion: moissanite ? 1.2 : 0.4,             // 빛이 무지개로 갈라지는 정도 (모이사나이트가 가장 강함)
    attenuationColor: c,
    attenuationDistance: moissanite ? 100 : R.stoneMm(spec) * 0.5,
    iridescence: moissanite ? 0.35 : 0.1,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0
  });
}

function stoneMaterial(spec) {
  if (spec.stoneType !== 'natural') return facetedMaterial(spec);
  const name = spec.stone || '';
  const look = lookOf(name);
  const base = look.base || R.stoneColorOf(spec) || '#7a8b9c';
  const c = new THREE.Color(base);
  const map = stonePattern(name, look, base);
  const mm = R.stoneMm(spec);
  /* 작은 알을 투명하게 두면 뒤쪽 금속이 비쳐 새까맣게 죽습니다.
   * 3mm 미만은 실제로도 거의 불투명하게 보이므로 투과를 줄입니다. */
  const small = mm < 3;
  const common = { map: map, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.15 };
  switch (look.kind) {
    case 'clear':
      return new THREE.MeshPhysicalMaterial(Object.assign(common, {
        color: new THREE.Color(0xffffff).lerp(c, 0.45),
        roughness: 0.02,
        transmission: small ? 0.3 : 0.9,
        thickness: mm * 0.5,
        ior: look.ior || 1.55,
        attenuationColor: c,
        attenuationDistance: mm * 1.4,
        // 투명한 돌은 바닥의 금속 받침이 거울처럼 빛을 되돌려 속이 밝게 떠오릅니다
        emissive: c, emissiveIntensity: 0.12,
        specularIntensity: 1,
        envMapIntensity: 1.5
      }));
    case 'translucent':
      return new THREE.MeshPhysicalMaterial(Object.assign(common, {
        color: 0xffffff,
        roughness: 0.16,
        transmission: small ? 0.12 : 0.38,
        thickness: mm * 0.8,
        ior: 1.54,
        attenuationColor: c,
        attenuationDistance: mm * 0.6,
        sheen: 0.4, sheenColor: c, sheenRoughness: 0.6
      }));
    case 'labradorite':
      return new THREE.MeshPhysicalMaterial(Object.assign(common, {
        color: 0xffffff,
        roughness: 0.14,
        iridescence: 1,
        iridescenceIOR: 1.9,
        iridescenceThicknessRange: [260, 820]
      }));
    case 'moonstone':
      return new THREE.MeshPhysicalMaterial(Object.assign(common, {
        color: 0xf2f4fa,
        roughness: 0.2,
        transmission: small ? 0.15 : 0.5,
        thickness: mm * 0.8,
        ior: 1.52,
        sheen: 1, sheenColor: new THREE.Color('#9cc3ff'), sheenRoughness: 0.35
      }));
    case 'opal':
      return new THREE.MeshPhysicalMaterial(Object.assign(common, {
        color: 0xffffff,
        roughness: 0.12,
        transmission: small ? 0.1 : 0.25,
        thickness: mm * 0.6,
        iridescence: 0.9,
        iridescenceThicknessRange: [300, 1100]
      }));
    case 'pearl':
      return new THREE.MeshPhysicalMaterial(Object.assign(common, {
        color: 0xffffff,
        roughness: 0.32,
        clearcoat: 0.6, clearcoatRoughness: 0.2,
        sheen: 1, sheenColor: new THREE.Color('#ffd9e2'), sheenRoughness: 0.3,
        iridescence: 0.35
      }));
    default:          // opaque — 표면을 곱게 갈아 낸 광택
      return new THREE.MeshPhysicalMaterial(Object.assign(common, {
        color: 0xffffff,
        roughness: 0.1,
        specularIntensity: 0.8
      }));
  }
}

/* ─────────────────── 원석 · 세팅 ─────────────────── */
/** 원석을 반지 둘레 여러 자리에 앉힌다 */
function buildStones(s, group) {
  if (!s.stoneType || s.stoneType === 'none' || s.setting === 'none') return;
  // 0도가 손등 쪽 한가운데. 손으로 찍어 놓은 자리가 있으면 그대로,
  // 없으면 개수대로 둘레에 고르게 나눠 앉힙니다.
  R.stoneAngles(s).forEach((deg) => {
    const holder = new THREE.Group();
    buildStone(s, holder);
    holder.rotation.z = (Number(deg) || 0) * Math.PI / 180;
    group.add(holder);
  });
}

function buildStone(s, group) {
  if (!s.stoneType || s.stoneType === 'none' || s.setting === 'none') return;
  const innerR = R.sizeToInnerDiameter(s.size) / 2;
  const topR = innerR + s.thickness;
  // 고른 원석의 실제 지름(mm)을 그대로 쓴다 — 화면 비율이 곧 제작 사양
  const size = R.stoneMm(s) / 2;
  const mat = stoneMaterial(s);
  const metalMat = metalMaterial(s);
  // 손님이 직접 올리고 내리는 값(mm). 0 이면 그 물림 방식의 기본 높이입니다.
  const lift = Number(s.stoneHeight) || 0;
  const up = Math.max(0, lift);        // 올린 만큼 받침을 길게 늘여 밴드에 붙여 둔다

  if (s.setting === 'prong') {
    /* 발에 물린 원석은 밴드 위로 솟으므로 베젤보다 한 치수 작게 잡는다.
     * 천연석은 각을 내지 않은 캐보션이라 둥근 돔으로,
     * 모이사나이트·큐빅은 면을 낸 알이라 파빌리온+크라운으로 그린다. */
    const gemR = size * 0.76;
    // 발로 물어도 너무 솟지 않게 낮게 앉힙니다
    const girdle = topR + gemR * 0.12 + lift;   // 원석의 가장 넓은 허리 높이
    const cab = s.stoneType === 'natural';

    if (cab) {
      const acr0 = s.stoneShape === 'ovalH';
      const oval0 = s.stoneShape === 'oval' || acr0;
      const ov0 = CONFIG.stones.natural.ovalMm;
      const ax0 = oval0 ? ((acr0 ? ov0.h : ov0.w) / 2) / gemR : 1;
      const az0 = oval0 ? ((acr0 ? ov0.w : ov0.h) / 2) / gemR : 1;
      const dome = new THREE.Mesh(
        planarUV(new THREE.SphereGeometry(gemR, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), gemR), mat);
      dome.scale.set(ax0, 0.72, az0);
      dome.position.set(0, girdle - gemR * 0.1, 0);
      group.add(dome);

      const seatDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(gemR * 0.96, gemR * 0.9, gemR * 0.5 + up * 2, 36), metalMat);
      seatDisc.scale.set(ax0, 1, az0);
      seatDisc.position.set(0, girdle - gemR * 0.36 - up, 0);
      group.add(seatDisc);
    } else {
      const gem = new THREE.Mesh(brilliantGeometry(gemR), mat);
      gem.position.set(0, girdle, 0);
      group.add(gem);
    }

    // 발(프롱)은 원석 허리를 아래에서 물어주는 높이까지만 올라온다
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const prong = new THREE.Mesh(
        new THREE.CylinderGeometry(gemR * 0.17, gemR * 0.21, gemR * 1.15 + up * 2, 12), metalMat);
      prong.position.set(Math.cos(a) * gemR * 0.9, girdle - gemR * 0.2 - up, Math.sin(a) * gemR * 0.9);
      group.add(prong);
    }
  } else if (s.setting === 'flush') {
    /* 매립(우물) 세팅 — 표면에 우물을 파고 알을 그 안에 앉힌 뒤
     * 둘레 금속을 알 쪽으로 밀어 덮습니다. 알 윗면이 반지 표면과 거의 같은 높이라
     * 손에 걸리지 않습니다. 그래서 여기서는
     *   (1) 살짝 꺼진 우물 벽  (2) 그 안에 앉은 낮은 알  두 가지를 그립니다. */
    const gemR = size / 2 > 0 ? size : 0.5;
    const wellR = gemR * 1.3;
    const wellDepth = gemR * 0.55;

    /* 우물 벽 — 위가 넓고 아래가 좁은 깔때기.
     * 바닥을 막아 두지 않으면 안이 그대로 비쳐 구멍을 뚫어 놓은 것처럼 보입니다. */
    // 위는 열어 두어야 알이 보이고, 아래는 막아야 구멍처럼 비치지 않습니다
    const wellMat = metalMat.clone();
    wellMat.side = THREE.DoubleSide;
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(wellR, gemR * 0.88, wellDepth + up * 2, 40, 1, true), wellMat);
    well.position.set(0, topR - wellDepth / 2 + lift - up, 0);
    group.add(well);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(gemR * 0.9, 40), metalMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, topR - wellDepth + lift - up * 2, 0);
    group.add(floor);

    /* 알 — 우물 안에 앉되 윗면이 반지 면과 거의 같은 높이에 오게.
     * 너무 내리면 알은 안 보이고 우물만 남아 구멍처럼 읽힙니다. */
    // 면을 낸 알을 우물에 앉힙니다 — 테이블(윗면)이 반지 면과 거의 같은 높이
    const gem = new THREE.Mesh(brilliantGeometry(gemR * 0.92), mat);
    gem.position.set(0, topR + lift - gemR * 0.92 * 0.32 + gemR * 0.04, 0);
    group.add(gem);

  } else {
    /* 캐보션을 올리는 방식 두 가지.
     *   bezel  테두리 금속이 돌 허리를 한 바퀴 감싸 누릅니다.
     *   seat   자리를 파고 돌을 심어 접착으로 고정합니다 — 테두리 없이 가장 낮게 앉습니다.
     * 오벌은 6×8mm 한 규격이라 실제 비율(3:4)로 눌러 그립니다. */
    /* 오벌은 눕히는 방향이 두 가지입니다.
     *   세로 : 긴 쪽(8mm)이 손가락을 따라 — 반지 폭 방향(z)
     *   가로 : 긴 쪽(8mm)이 반지 둘레를 따라 — 접선 방향(x) */
    const ov = CONFIG.stones.natural.ovalMm;
    const across = s.stoneShape === 'ovalH';
    const oval = s.stoneShape === 'oval' || across;
    const sx = oval ? ((across ? ov.h : ov.w) / 2) / size : 1;
    const sz = oval ? ((across ? ov.w : ov.h) / 2) / size : 1;
    const seat = s.setting === 'seat';

    const gem = new THREE.Mesh(planarUV(new THREE.SphereGeometry(size, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), size), mat);
    gem.scale.set(sx, seat ? 0.5 : 0.62, sz);
    // 심기는 자리를 파고 앉히므로 베젤보다 확실히 낮습니다
    gem.position.set(0, topR - size * (seat ? 0.42 : 0.16) + lift, 0);
    group.add(gem);

    if (seat) {
      // 돌이 앉을 자리 — 얕게 파낸 홈의 벽만 살짝 보입니다
      const well = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 1.04, size * 0.94, size * 0.34 + up * 2, 40, 1, true), metalMat.clone());
      well.material.side = THREE.DoubleSide;
      well.scale.set(sx, 1, sz);
      well.position.set(0, topR - size * 0.34 + lift - up, 0);
      group.add(well);
    } else {
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 1.12, size * 1.12, size * 0.55 + up * 2, 40, 1, true), metalMat.clone());
      rim.material.side = THREE.DoubleSide;
      rim.scale.set(sx, 1, sz);
      rim.position.set(0, topR - size * 0.2 + lift - up, 0);
      group.add(rim);
    }
  }
}

/* ─────────────────── 촬영용 환경 ───────────────────
 * 금속은 주변을 그대로 비춥니다.
 * 조명판을 네모로 띄워 두면 그 모서리가 반지 표면에 검고 흰 띠로 그대로 찍힙니다.
 * (실제 촬영장에서 소프트박스에 천을 씌우는 이유와 같습니다.)
 * 그래서 사방을 하나의 부드러운 그라데이션으로 만들고, 빛도 가장자리가
 * 흐릿한 덩어리로만 얹습니다. 이렇게 하면 반사가 띠 없이 매끄럽게 흐릅니다. */
function softBlob(x, cx, cy, rx, ry, color, alpha) {
  const r = Math.max(rx, ry);
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.save();
  x.globalAlpha = alpha;
  x.globalCompositeOperation = 'lighter';
  x.translate(cx, cy); x.scale(1, ry / rx); x.translate(-cx, -cy);
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.restore();
}

function studioEnvTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');

  // 위는 환하고 아래로 갈수록 차분해지는 하늘 — 반지 위아래 명암을 만들어 줍니다
  /* 위는 환하고 아래로 갈수록 어두워지는 하늘.
   * 은이 은처럼 보이려면 이 명암 차이가 충분히 커야 합니다.
   * 차이가 작으면 흰 플라스틱처럼 납작해 보입니다. */
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.00, '#ffffff');
  g.addColorStop(0.24, '#f2ece1');
  g.addColorStop(0.46, '#a9a297');
  g.addColorStop(0.62, '#5d5852');
  g.addColorStop(0.82, '#35322e');
  g.addColorStop(1.00, '#26241f');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);

  // 가장자리가 흐릿한 빛덩어리 — 모서리가 없으니 띠도 생기지 않습니다
  softBlob(x, 300, 100, 340, 160, '#ffffff', 0.9);
  softBlob(x, 790, 170, 250, 130, '#fff3e2', 0.5);
  softBlob(x, 540, 470, 420, 90, '#fff8ec', 0.3);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ─────────────────── 씬 ─────────────────── */
// 정면에서 보면 원석이 테두리에 가려 납작해 보이므로, 반지가 가장 잘 보이는
// 3/4 각도를 기본 시점으로 둡니다. (더블클릭하면 이 각도로 돌아옵니다)
const DEFAULT_CAM = new THREE.Vector3(30, 18, 46);
const stage = $('stage');
let renderer, scene, camera, controls, ringGroup;

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  stage.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = studioEnvTexture();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  // 보석만 비추는 반짝이 환경 — 아래 sparkleEnvTexture 참고
  const sparkle = sparkleEnvTexture();
  gemEnv = pmrem.fromEquirectangular(sparkle).texture;
  sparkle.dispose();

  camera = new THREE.PerspectiveCamera(34, stage.clientWidth / stage.clientHeight, 1, 500);
  camera.position.copy(DEFAULT_CAM);

  // 금속은 환경맵 반사가 주인공이다. 직사광이 세면 거친 마감이 하얗게 떠 버리므로
  // 형태를 잡아줄 만큼만 남긴다.
  const key = new THREE.DirectionalLight(0xfff2d8, 0.9);
  key.position.set(18, 26, 30);
  const rim = new THREE.DirectionalLight(0x9fc3ff, 0.5);
  rim.position.set(-24, -10, -20);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.06));

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 26;
  controls.maxDistance = 140;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;

  renderer.domElement.addEventListener('dblclick', () => {
    camera.position.copy(DEFAULT_CAM);
    controls.target.set(0, 0, 0);
  });

  /* 미리보기 칸 크기가 바뀌면 (창 크기, 또는 따라오는 작은 화면으로 바뀔 때) 그림도 맞춥니다 */
  const fit = () => {
    if (!stage.clientWidth || !stage.clientHeight) return;
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
  };
  addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);

  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();
}

/* ─────────────────── 손으로 다듬기 ───────────────────
 * 반지 위에서 마우스를 끌면 그 자리가 두꺼워지고, 반대로 끌면 얇아집니다.
 * 24 지점을 손으로 미는 셈이고, 붓처럼 옆까지 조금씩 번지게 해서
 * 실제로 왁스를 손가락으로 밀어낸 것처럼 이어집니다.
 */
let sculptOn = false;
/* 반지를 바퀴처럼 제 축으로 돌려 둔 각도. 다듬을 자리를 위로 가져오는 데 씁니다.
 * 반지를 다시 그려도 그대로 유지합니다 (보는 방향일 뿐 사양은 바뀌지 않습니다). */
let viewTurn = 0;
// 지금 화면을 짚고 있는 손가락(포인터)들 — 두 손가락이 닿으면 붓질 대신 돌리기로 넘깁니다
const activePointers = new Set();
// 붓질을 시작할 때의 다듬기 값 — 두 번째 손가락이 닿으면 이걸로 되돌립니다
const STROKE_KEYS = ['sculpt', 'sculptW', 'relief', 'sculptWa', 'sculptWb', 'matte', 'matteMap', 'engrave', 'draw', 'stars', 'stoneAt'];
let strokeBefore = null;
let sculpting = null;

/* 도구 — 무엇을 밀고 있는지에 따라 손대는 자국이 달라집니다.
 *   add/carve 살 붙이기 · 깎기 : 짚은 자리만 도톰하게 / 얇게 (relief 격자)
 *   wide   폭      : 짚은 쪽 가장자리만 — 위로 끌면 넓게, 아래로 끌면 좁게
 *   chisel 각 세우기: 좁은 붓으로 깊게 깎아 각을 냅니다 (파기만 합니다)
 *   matte  부분무광 : 그 자리만 무광으로 칠합니다 (아래로 끌면 지웁니다)
 * 어느 도구도 스스로 대칭을 만들지 않습니다 — 대칭은 '좌우 대칭'을 켰을 때만.
 * brush = 몇 지점까지 번지는가(relief 는 mm 반지름), gain = 1px 끌 때 얼마나 밀리는가 */
const TOOLS = {
  /* 살 붙이기 / 살 깎기 — 예전 '두께' 한 도구가 위·아래로 끄는 방향에 따라 둘 다 했는데,
   * 버튼에 드러나지 않아 깎기만 되는 줄 알기 쉬웠습니다. 둘로 나눠 어느 쪽으로 끌든
   * 한 가지만 하게 했습니다. (왁스를 덧붙여 도톰하게 / 깎아 내 얇게) */
  add:    { relief: true, brushMm: 1.7, gain: 0.012, label: '살 붙이기', addOnly: true },
  carve:  { relief: true, brushMm: 1.7, gain: 0.012, label: '살 깎기', carveOnly: true },
  push:   { relief: true, brushMm: 1.7, gain: 0.012, label: '두께' },   // 예전 도구 (버튼 없음)
  wide:   { edge: true, brush: 2.6, gain: 0.010, label: '폭' },
  chisel: { relief: true, brushMm: 0.8, gain: 0.030, label: '각 세우기', carveOnly: true },
  // 부분 무광 — 짚은 자리만 칠합니다 (어느 쪽으로 끌든 칠하고, 지우기는 따로)
  matte:   { mapKey: 'matteMap', brushMm: 1.5, gain: 0.05, label: '부분 무광', addOnly: true },
  unmatte: { mapKey: 'matteMap', brushMm: 1.8, gain: 0.08, label: '무광 지우기', carveOnly: true },
  // 아래 둘은 격자 위에 그립니다 — 끄는 방향이 아니라 지나간 자리가 그대로 무늬가 됩니다
  engrave: { grid: true, brush: 1.3, label: '도안 새기기' },
  erase:   { grid: true, brush: 1.7,  label: '도안 지우기', wipe: true },
  // 아래 둘은 짚는 도구입니다 — 짚은 자리에 놓이고, 놓인 것을 다시 짚으면 빠집니다
  stone:   { click: true, label: '알 놓기' },
  star:    { click: true, label: '별 조각', star: true },
  // 그리기는 파지 않습니다 — 겉면에 검게 칠하는 층입니다
  draw:    { paint: true, label: '그리기' },
  unpaint: { click: true, label: '그린 선 지우기', wipeDraw: true }
};
const sculptState = { tool: 'add', size: 1, mirror: false };

function ensureSculpt(key) {
  return sculptOf(spec, key);
}

/** 화면 좌표 → 반지 위 각도. 반지 평면(회전 적용)과 광선을 만나게 해서 구한다. */
const _ray = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _hit = new THREE.Vector3();
const _normal = new THREE.Vector3();

/** 화면 좌표 → { angle: 둘레 각도, v: 폭 방향 위치(-0.5~0.5) }.
 * 반지를 정확히 짚지 못했으면 v 는 null 입니다 (도안은 정확히 짚어야 그립니다). */
function pointAtPointer(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const ndc = new THREE.Vector2(
    ((ev.clientX - rect.left) / rect.width) * 2 - 1,
    -((ev.clientY - rect.top) / rect.height) * 2 + 1
  );
  _ray.setFromCamera(ndc, camera);

  // 반지를 정확히 짚었으면 그 점을 쓴다
  const hits = _ray.intersectObjects(ringGroup.children, true);
  if (hits.length) {
    const local = ringGroup.worldToLocal(hits[0].point.clone());
    // 폭 방향은 z. 반지 폭으로 나눠 -0.5 ~ 0.5 로 맞춥니다.
    const v = Math.max(-0.5, Math.min(0.5, local.z / Math.max(0.001, spec.width)));
    return { angle: Math.atan2(local.y, local.x), v };   // 위쪽(+Y)이 π/2
  }

  /* 조금 빗나가게 짚었어도 다듬을 수 있어야 합니다.
   * 반지가 놓인 평면까지 광선을 늘려 그 자리의 각도를 씁니다. */
  ringGroup.updateMatrixWorld();
  _normal.set(0, 0, 1).applyQuaternion(ringGroup.quaternion).normalize();
  _plane.setFromNormalAndCoplanarPoint(_normal, ringGroup.position);
  if (!_ray.ray.intersectPlane(_plane, _hit)) return null;
  const local2 = ringGroup.worldToLocal(_hit.clone());
  if (!isFinite(local2.x) || !isFinite(local2.y)) return null;
  if (local2.x === 0 && local2.y === 0) return null;
  return { angle: Math.atan2(local2.y, local2.x), v: null };
}

function angleAtPointer(ev) {
  const pt = pointAtPointer(ev);
  return pt ? pt.angle : null;
}

function dab(arr, n, center, radius, amount, carveOnly, addOnly) {
  for (let i = 0; i < n; i++) {
    let d = Math.abs(i - center);
    if (d > n / 2) d = n - d;                // 한 바퀴이므로 가까운 쪽으로
    if (d > radius) continue;
    const w = Math.cos((d / radius) * Math.PI / 2);         // 가운데가 가장 세게
    let v = arr[i] + amount * w * w;
    if (carveOnly) v = Math.min(arr[i], v);                 // 깎기 전용 도구는 파기만 합니다
    if (addOnly) v = Math.max(arr[i], v);                   // 붙이기 전용 도구는 붙이기만 합니다
    arr[i] = Math.max(-1, Math.min(1, v));
  }
}

function sculptPush(angle, drag, key) {
  const tool = TOOLS[sculptState.tool] || TOOLS.push;
  key = key || tool.key;
  const arr = ensureSculpt(key);
  const n = arr.length;
  const radius = Math.max(0.8, tool.brush * sculptState.size);
  // 깎기 · 붙이기 전용 도구는 어느 쪽으로 끌든 한 방향으로만 밉니다
  const amount = tool.carveOnly ? -Math.abs(drag) * tool.gain
    : tool.addOnly ? Math.abs(drag) * tool.gain
    : drag * tool.gain;

  // 위쪽(π/2)을 0번으로 맞춘다 — readAt 과 같은 규칙
  const center = ((angle - Math.PI / 2) / (Math.PI * 2) * n % n + n) % n;
  dab(arr, n, center, radius, amount, tool.carveOnly, tool.addOnly);

  // 대칭을 켜면 손등 쪽 중심선을 기준으로 반대편도 똑같이 손봅니다
  if (sculptState.mirror) {
    const mirrored = ((n - center) % n + n) % n;
    if (Math.abs(mirrored - center) > 0.01) dab(arr, n, mirrored, radius, amount, tool.carveOnly, tool.addOnly);
  }
  spec[key] = R.sculptWrite(arr);
}

/** 살 붙이기 · 깎기 — 짚은 자리(둘레 각도 + 폭 위치) 둘레만 오르내립니다.
 * 붓 크기를 mm 로 잡아 두어, 호수나 폭이 달라도 손에 닿는 크기가 같습니다. */
function reliefPush(angle, vN, drag) {
  const tool = TOOLS[sculptState.tool] || TOOLS.push;
  // 같은 격자 붓으로 부분 무광도 칠합니다 (무광은 0~1, 살은 -1~1)
  const key = tool.mapKey || 'relief';
  const g = key === 'matteMap' ? matteMapOf(spec) : reliefOf(spec);
  const lo = key === 'matteMap' ? 0 : -1;
  const outerR = R.sizeToInnerDiameter(spec.size) / 2 + spec.thickness;
  const cellX = (Math.PI * 2 * outerR) / EX;                    // 둘레 한 칸 (mm)
  const cellY = Math.max(0.2, spec.width) / (EY - 1);           // 폭 한 칸 (mm)
  const r = (tool.brushMm || 1.7) * sculptState.size;
  const rx = Math.max(0.8, r / cellX);
  const ry = Math.max(0.8, r / cellY);
  const amount = tool.carveOnly ? -Math.abs(drag) * tool.gain
    : tool.addOnly ? Math.abs(drag) * tool.gain
    : drag * tool.gain;
  const cx = ((angle - Math.PI / 2) / (Math.PI * 2) * EX % EX + EX) % EX;
  const cy = (vN + 0.5) * (EY - 1);

  const dabAt = (centerX) => {
    for (let y = 0; y < EY; y++) {
      const dy = (y - cy) / ry;
      if (Math.abs(dy) >= 1) continue;
      for (let x = 0; x < EX; x++) {
        let dx = Math.abs(x - centerX);
        if (dx > EX / 2) dx = EX - dx;
        dx /= rx;
        const d = Math.hypot(dx, dy);
        if (d >= 1) continue;
        const w = Math.cos(d * Math.PI / 2);                    // 가운데가 가장 세게
        const i = y * EX + x;
        let v = g[i] + amount * w * w;
        if (tool.carveOnly) v = Math.min(g[i], v);
        if (tool.addOnly) v = Math.max(g[i], v);
        g[i] = Math.max(lo, Math.min(1, v));
      }
    }
  };
  dabAt(cx);
  // 대칭을 켜면 손등 쪽 가운데를 기준으로 둘레 반대편에도 (같은 폭 자리에) 똑같이
  if (sculptState.mirror) {
    const mirrored = ((EX - cx) % EX + EX) % EX;
    if (Math.abs(mirrored - cx) > 0.01) dabAt(mirrored);
  }
  spec[key] = R.reliefWrite(g);
}

/** 화면에 보이는 쪽 가장자리 — 반지를 정확히 짚지 못했을 때 폭 도구가 고를 쪽 */
function facingEdge() {
  if (!ringGroup) return 'a';
  ringGroup.updateMatrixWorld();
  return ringGroup.worldToLocal(camera.position.clone()).z >= 0 ? 'a' : 'b';
}

/** 도안 격자에 한 번 찍기. vN = 폭 방향 위치(-0.5~0.5)
 * 조각칼은 손이 빨리 지나가든 천천히 지나가든 같은 깊이로 팝니다.
 * 그래서 깊이를 더해 쌓지 않고 "그 깊이까지 판다"로 둡니다 — 선이 고르게 이어집니다. */
function engravePaint(angle, vN, wipe) {
  if (!spec._engrave || R.engraveWrite(spec._engrave) !== (spec.engrave || '')) {
    spec._engrave = R.engraveRead(spec.engrave || '');
  }
  const g = spec._engrave;
  const rx = Math.max(0.7, (TOOLS[sculptState.tool].brush || 1.2) * sculptState.size);
  const ry = rx * 0.8;
  const cx = ((angle - Math.PI / 2) / (Math.PI * 2) * EX % EX + EX) % EX;
  const cy = (vN + 0.5) * (EY - 1);

  const dab = (centerX) => {
    for (let y = 0; y < EY; y++) {
      const dy = (y - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      for (let x = 0; x < EX; x++) {
        let dx = Math.abs(x - centerX);
        if (dx > EX / 2) dx = EX - dx;         // 둘레는 한 바퀴 이어집니다
        dx /= rx;
        const d = Math.hypot(dx, dy);
        if (d > 1) continue;
        const i = y * EX + x;
        /* 조각칼 자국은 바닥이 평평하고 가장자리만 비스듬합니다.
         * 가운데는 제 깊이로 파이고 가장자리로 가며 얕아지게 둡니다. */
        const cut = Math.min(1, (1 - d) * 1.8);
        // 지우개는 파 놓은 만큼 메우고, 조각칼은 그 깊이까지만 팝니다
        g[i] = wipe ? Math.max(0, g[i] - cut) : Math.max(g[i], cut);
      }
    }
  };
  dab(cx);
  // 대칭을 켜면 손등 쪽 가운데를 기준으로 반대편에도 똑같이 새깁니다
  if (sculptState.mirror) {
    const mirrored = ((EX - cx) % EX + EX) % EX;
    if (Math.abs(mirrored - cx) > 0.01) dab(mirrored);
  }
  spec.engrave = R.engraveWrite(g);
}

/** -180 ~ 180 도로 접기 */
function fold(deg) {
  let d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/* ── 검정 브러쉬 ──
 * 끄는 동안 지나간 자리를 점으로 담아 두었다가, 그 선을 표면에 그립니다.
 * 반지를 다시 만들 필요가 없으므로 그림판만 새로 칠해 바로 보여 줍니다. */
let drawing = null;       // { before: 지금까지 그린 선들, pts: 지금 긋고 있는 선 }

function drawRepaint() {
  if (!ringGroup) return;
  const tex = drawTexture(spec);
  ringGroup.traverse((o) => {
    if (!o.userData || !o.userData.band) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (m.map && m.map.isCanvasTexture) m.map.dispose();
      m.map = tex || null;
      m.metalnessMap = tex || null;
      m.needsUpdate = true;
    });
  });
}

function drawPush(pt) {
  if (!drawing) return;
  const deg = fold((pt.angle - Math.PI / 2) * 180 / Math.PI);
  const last = drawing.pts[drawing.pts.length - 1];
  // 너무 촘촘한 점은 버립니다 (주소가 길어지기만 합니다)
  if (last && Math.abs(fold(last.deg - deg)) < 0.4 && Math.abs(last.v - pt.v) < 0.012) return;
  drawing.pts.push({ deg: deg, v: pt.v });
  spec.draw = R.drawWrite(drawing.before.concat([{
    width: Math.max(0.3, Math.min(3, Number(spec.drawSize) || 0.8)),
    pts: drawing.pts
  }]));
  drawRepaint();
}

/** 짚은 선을 통째로 지웁니다 */
function drawErase(pt) {
  const strokes = R.drawStrokes(spec);
  if (!strokes.length) return false;
  const outerR = R.sizeToInnerDiameter(spec.size) / 2 + spec.thickness;
  const deg = fold((pt.angle - Math.PI / 2) * 180 / Math.PI);
  const vN = pt.v === null ? 0 : pt.v;
  for (let i = strokes.length - 1; i >= 0; i--) {
    const st = strokes[i];
    const near = st.pts.some((p) => {
      const dx = fold(p.deg - deg) * Math.PI / 180 * outerR;
      const dy = (p.v - vN) * spec.width;
      return Math.hypot(dx, dy) <= Math.max(0.9, st.width * 1.2);
    });
    if (near) {
      strokes.splice(i, 1);
      spec.draw = R.drawWrite(strokes);
      return true;
    }
  }
  return false;
}

/** 짚은 자리에 별을 새기거나, 이미 새긴 별을 지웁니다 */
function starToggle(angle) {
  const deg = Math.round(fold((angle - Math.PI / 2) * 180 / Math.PI));
  const list = R.starList(spec);
  for (let i = 0; i < list.length; i++) {
    // 이미 새긴 별을 짚으면 지웁니다 (별 크기만큼을 짚은 범위로 봅니다)
    if (Math.abs(fold(list[i].angle - deg)) < Math.max(10, list[i].size * 4)) {
      list.splice(i, 1);
      spec.stars = R.starWrite(list);
      return true;
    }
  }
  if (list.length >= 8) return false;
  list.push({ angle: deg, size: Number(spec.starSize) || 3 });
  spec.stars = R.starWrite(list);
  return true;
}

/** 짚은 자리에 알을 놓거나, 이미 놓인 알을 뺍니다 */
function stoneToggle(angle) {
  const deg = Math.round(fold((angle - Math.PI / 2) * 180 / Math.PI));
  const list = R.stoneAngles(spec).slice();
  let hit = -1;
  for (let i = 0; i < list.length; i++) {
    if (Math.abs(fold(list[i] - deg)) < 15) { hit = i; break; }
  }
  if (hit >= 0) {
    if (list.length <= 1) return false;        // 마지막 한 알은 남겨 둡니다
    list.splice(hit, 1);
  } else {
    if (list.length >= 8) return false;
    list.push(deg);
  }
  spec.stoneAt = list.map((v) => Math.round(v)).join(',');
  spec.stoneCount = list.length;
  return true;
}

function bindSculpt() {
  const el = renderer.domElement;

  // 손가락 수는 다듬기 여부와 상관없이 셉니다 (pointerup 이 화면 밖에서 나도 빠지게)
  el.addEventListener('pointerdown', (ev) => {
    activePointers.add(ev.pointerId);
    /* 두 번째 손가락이 닿았다 = 돌리거나 확대하려는 것.
     * 첫 손가락이 그새 그어 버린 자국은 지우고 붓질을 끝냅니다. */
    if (activePointers.size > 1 && sculpting) {
      if (strokeBefore) {
        STROKE_KEYS.forEach((k) => { spec[k] = strokeBefore[k]; delete spec['_' + k]; });
        studio.changed();
      }
      sculpting = null;
      drawing = null;
      strokeBefore = null;
      if (studio.holdHistory) studio.holdHistory(false);
    }
  }, true);
  const dropPointer = (ev) => { activePointers.delete(ev.pointerId); };
  el.addEventListener('pointerup', dropPointer, true);
  el.addEventListener('pointercancel', dropPointer, true);
  el.addEventListener('pointerleave', dropPointer, true);

  el.addEventListener('pointerdown', (ev) => {
    if (!sculptOn || ev.button !== 0) return;
    if (activePointers.size > 1) return;           // 두 손가락은 돌리기 · 확대
    const pt = pointAtPointer(ev);
    if (!pt) return;
    const tool = TOOLS[sculptState.tool] || TOOLS.push;
    ev.preventDefault();

    // 알 놓기 · 별 조각 · 그린 선 지우기는 끌지 않고 한 번 짚는 도구입니다
    if (tool.click) {
      const done = tool.wipeDraw ? drawErase(pt)
        : tool.star ? starToggle(pt.angle) : stoneToggle(pt.angle);
      if (done) studio.changed();
      return;
    }

    // 그리기 — 반지를 정확히 짚었을 때만 선이 시작됩니다
    if (tool.paint) {
      if (pt.v === null) return;
      el.setPointerCapture(ev.pointerId);
      drawing = { before: R.drawStrokes(spec), pts: [] };
      strokeBefore = {};
      STROKE_KEYS.forEach((k) => { strokeBefore[k] = spec[k]; });
      if (studio.holdHistory) studio.holdHistory(true);
      sculpting = { paint: true, angle: pt.angle, x: ev.clientX, y: ev.clientY };
      drawPush(pt);
      return;
    }
    el.setPointerCapture(ev.pointerId);
    strokeBefore = {};
    STROKE_KEYS.forEach((k) => { strokeBefore[k] = spec[k]; });
    if (studio.holdHistory) studio.holdHistory(true);  // 한 번 그은 것이 되돌리기 한 칸이 되도록
    sculpting = { angle: pt.angle, v: pt.v, x: ev.clientX, y: ev.clientY, moved: false };
    /* 폭은 짚은 쪽 가장자리 하나만 움직입니다. 한 번 긋는 동안은 그쪽으로 고정해야
     * 가운데를 지나도 반대쪽이 따라 움직이지 않습니다. */
    if (tool.edge) {
      const side = pt.v !== null && Math.abs(pt.v) > 0.04 ? (pt.v >= 0 ? 'a' : 'b') : facingEdge();
      sculpting.edgeKey = side === 'a' ? 'sculptWa' : 'sculptWb';
    }
    // 도안은 짚은 그 자리부터 바로 새겨집니다
    if (tool.grid && pt.v !== null) {
      engravePaint(pt.angle, pt.v, tool.wipe);
      studio.changed();
    }
  });

  el.addEventListener('pointermove', (ev) => {
    if (!sculpting) return;
    const tool = TOOLS[sculptState.tool] || TOOLS.push;

    if (tool.paint) {
      if (Math.abs(ev.clientX - sculpting.x) < 1 && Math.abs(ev.clientY - sculpting.y) < 1) return;
      sculpting.x = ev.clientX; sculpting.y = ev.clientY;
      const pt = pointAtPointer(ev);
      if (!pt || pt.v === null) return;           // 반지를 벗어나면 잠시 끊깁니다
      drawPush(pt);
      return;
    }

    /* 도안은 "지나간 자리"가 그대로 무늬가 됩니다.
     * 위아래로 끌 필요 없이, 옆으로 그어도 선이 이어져야 하니까요. */
    if (tool.grid) {
      if (Math.abs(ev.clientX - sculpting.x) < 1 && Math.abs(ev.clientY - sculpting.y) < 1) return;
      sculpting.x = ev.clientX; sculpting.y = ev.clientY;
      const pt = pointAtPointer(ev);
      if (!pt || pt.v === null) return;          // 반지를 벗어난 자리는 건너뜁니다
      sculpting.moved = true;
      engravePaint(pt.angle, pt.v, tool.wipe);
      studio.changed();
      return;
    }

    const dy = sculpting.y - ev.clientY;       // 위로 끌면 두껍게
    /* 한 방향 도구(붙이기 · 깎기 · 각 세우기)는 위아래가 아니라 끈 거리만큼 밉니다.
     * 그래야 옆으로 붓질하듯 그어도 그 자리가 계속 붙고 깎입니다. */
    const oneWay = tool.addOnly || tool.carveOnly;
    const step = oneWay ? Math.hypot(ev.clientX - sculpting.x, dy) : dy;
    if (Math.abs(step) < 1) return;
    sculpting.y = ev.clientY;
    sculpting.x = ev.clientX;
    sculpting.moved = true;
    // 끄는 동안 현재 가리키는 자리를 따라가면 붓처럼 칠할 수 있다
    const cur = pointAtPointer(ev);
    const at = cur ? cur.angle : sculpting.angle;
    if (at === null || at === undefined) return;   // 아직 자리를 못 잡았으면 건너뜁니다
    sculpting.angle = at;
    // 반지 밖으로 살짝 빗나가면 마지막으로 짚었던 폭 자리를 그대로 씁니다
    if (cur && cur.v !== null) sculpting.v = cur.v;
    // 끈 거리(px)만 넘기면 도구가 알아서 제 세기로 밀어 냅니다
    if (tool.relief || tool.mapKey) reliefPush(at, sculpting.v === null ? 0 : sculpting.v, step);
    else sculptPush(at, step, sculpting.edgeKey);
    studio.changed();
  });

  const finish = (ev) => {
    if (!sculpting) return;
    try { el.releasePointerCapture(ev.pointerId); } catch (e) {}
    const wasPaint = sculpting.paint;
    sculpting = null;
    drawing = null;
    strokeBefore = null;
    // 다 긋고 나서 한 번만 사양표·주문서에 알립니다
    if (wasPaint) studio.changed();
    if (studio.holdHistory) studio.holdHistory(false);
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', finish);
}

function cursorForTool() {
  const tool = TOOLS[sculptState.tool] || TOOLS.push;
  return (tool.grid || tool.paint || tool.mapKey) ? 'crosshair' : tool.click ? 'pointer' : 'ns-resize';
}

/** 다듬기 모드를 켜고 끈다.
 * 예전에는 켜는 동안 화면 돌리기를 통째로 막아서, 반지 반대편을 손보려면 다듬기를
 * 껐다 켜야 했습니다. 이제 왼쪽 버튼(한 손가락)은 다듬기, 오른쪽 버튼(두 손가락)은
 * 돌리기로 나눠 다듬는 중에도 반지를 돌려 볼 수 있습니다. 자동 회전만 멈춥니다. */
function setSculptMode(on) {
  sculptOn = !!on;
  controls.enableRotate = true;
  controls.mouseButtons = sculptOn
    ? { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
    : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = sculptOn
    ? { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }
    : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.autoRotate = sculptOn ? false : controls.autoRotate;
  renderer.domElement.style.cursor = sculptOn ? cursorForTool() : '';
  return sculptOn;
}

function rebuild() {
  if (ringGroup) {
    scene.remove(ringGroup);
    ringGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      // 부분 무광을 칠하면 재질이 여러 개짜리 배열이 됩니다
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      mats.forEach((m) => {
        if (m.map && m.map.isCanvasTexture) m.map.dispose();
        m.dispose();
      });
    });
  }
  const model = R.getModel(spec.modelId);
  // 주소에서 들어온 자국은 처음 한 번 숫자로 풀어 둡니다
  sculptOf(spec, 'sculpt'); sculptOf(spec, 'sculptW'); sculptOf(spec, 'matte');
  engraveOf(spec);
  ringGroup = new THREE.Group();
  const bandGeo = buildBand(spec, model);
  const bandMat = metalMaterial(spec);
  if (paintOxidize(bandGeo, spec)) bandMat.vertexColors = true;
  // 검정 브러쉬로 그린 그림을 겉면에 입힙니다
  const drawTex = drawTexture(spec);
  applyDraw(bandMat, drawTex);
  // 부분 무광을 칠했으면 그 무리만 무광 재질로 그립니다
  let band;
  if (bandGeo.userData.hasMatte) {
    const mm = matteMaterial(spec);
    mm.vertexColors = bandMat.vertexColors;
    applyDraw(mm, drawTex);
    band = new THREE.Mesh(bandGeo, [bandMat, mm]);
  } else {
    band = new THREE.Mesh(bandGeo, bandMat);
  }
  band.userData.band = true;   // 그림만 다시 칠할 때 찾아냅니다
  ringGroup.add(band);
  // 홈에 고여 굳은 수지를 따로 덮는다 (금속에 스며드는 것이 아니다)
  const resin = buildEpoxyFill(bandGeo, spec);
  if (resin) ringGroup.add(resin);

  buildStones(spec, ringGroup);
  ringGroup.rotation.x = -0.12;
  ringGroup.rotation.z = viewTurn;
  scene.add(ringGroup);

  // 호수가 커져도 화면 밖으로 나가지 않도록
  const outerD = R.sizeToInnerDiameter(spec.size) + spec.thickness * 2;
  controls.minDistance = outerD * 1.25;
}

/* ─────────────────── 시작 ─────────────────── */
try {
  // 렌더러가 올바른 크기로 잡히려면 화면에 먼저 나타나 있어야 한다
  stage.classList.remove('is-hidden');
  if (!stage.clientWidth || !stage.clientHeight) throw new Error('렌더링 영역 크기를 잡지 못했습니다.');
  initScene();
  rebuild();
  studio.ready3d = true;
  studio.snapshot = () => {
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  };
  studio.toggleSpin = () => {
    controls.autoRotate = !controls.autoRotate;
    return controls.autoRotate;
  };
  bindSculpt();
  studio.setSculptMode = setSculptMode;
  studio.angleAtPointer = angleAtPointer;
  studio.pointAt = pointAtPointer;
  studio.clearSculpt = () => {
    ['sculpt', 'sculptW', 'relief', 'sculptWa', 'sculptWb', 'matte', 'matteMap', 'engrave'].forEach((k) => {
      spec['_' + k] = null;
      spec[k] = '';
    });
    spec.stoneAt = '';
    spec.stars = '';
    spec.draw = '';
    studio.changed();
  };
  studio.sculptState = sculptState;
  // 화면 안을 들여다볼 수 있게 열어 둡니다 (시점 확인 · 검사용)
  studio.view = { camera, controls, scene, group: () => ringGroup };
  studio.setSculptTool = (t) => {
    if (TOOLS[t]) sculptState.tool = t;
    if (sculptOn) renderer.domElement.style.cursor = cursorForTool();
    return sculptState.tool;
  };
  /* 반지를 바퀴처럼 제 축으로 돌립니다 (deg). 다듬을 자리를 위로 가져올 때 씁니다. */
  studio.turnRing = (deg) => {
    viewTurn = (viewTurn + (Number(deg) || 0) * Math.PI / 180) % (Math.PI * 2);
    if (ringGroup) ringGroup.rotation.z = viewTurn;
    return Math.round(viewTurn * 180 / Math.PI);
  };
  studio.setSculptSize = (v) => { sculptState.size = Math.max(0.4, Math.min(2.2, Number(v) || 1)); };
  studio.setSculptMirror = (on) => { sculptState.mirror = !!on; return sculptState.mirror; };
  studio.onChange(rebuild);
  $('preview-2d').classList.add('is-hidden');
} catch (err) {
  console.warn('[온명] 3D 미리보기를 사용할 수 없어 2D로 표시합니다:', err);
  studio.ready3d = false;
  stage.classList.add('is-hidden');
}
