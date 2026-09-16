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
    default:       return t;
  }
}

/** 단면을 닫힌 폴리곤으로: 안쪽 면 → 바깥 면 */
function makeProfile(s) {
  const t = s.thickness, w = s.width, hw = w / 2;
  const pts = [];
  for (let i = 0; i <= PROFILE_STEPS; i++) {
    pts.push({ u: 0, v: -hw + (w * i) / PROFILE_STEPS, outer: false });
  }
  for (let i = PROFILE_STEPS; i >= 0; i--) {
    const v = -hw + (w * i) / PROFILE_STEPS;
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
  diamond: { amp: 0.12,  ring: 3.5, axial: 2.0 }, // 다이아 텍스쳐 — 깊게 깎아 면을 만든다
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
function sculptAt(s, th) {
  const arr = s._sculpt;
  if (!arr) return 0;
  const n = arr.length;
  // th = π/2 가 손등 쪽(위). 그 자리를 0번 지점으로 둔다.
  const u = ((th - Math.PI / 2) / (Math.PI * 2) * n % n + n) % n;
  const i = Math.floor(u), f = u - i;
  const a = arr[i % n], b = arr[(i + 1) % n];
  const w = f * f * (3 - 2 * f);
  return a + (b - a) * w;
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
  const org = Number(s.organic) || 0;
  if (org <= 0) return 1;
  const n = valueNoise(Math.cos(th) * 2.1 + 61, Math.sin(th) * 2.1 + 37);
  return 1 + org * 0.26 * (n - 0.5) * 2;
}

const MIN_WALL = 0.28;   // mm — 이보다 얇아지면 면이 겹쳐 뚫린 것처럼 보입니다

function buildBand(s, model) {
  const innerR = R.sizeToInnerDiameter(s.size) / 2;
  const t = s.thickness;
  const SEG = 320;
  const profile = makeProfile(s);
  const P = profile.length;
  const bump = bumpFor(s);

  const taper = model ? model.taper : 0;
  const wave = model ? model.wave : 0;
  const twist = model ? model.twist : 0;
  const facets = (s.profile === 'facet' && model) ? model.facets : 0;

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
    const tRatio = tAt / t;
    const wScale = (1 - taper * (0.5 - 0.5 * Math.sin(th))) * widthScaleAt(s, th);
    // 웨이브는 안쪽으로만 들어가므로 최대 두께는 그대로 유지된다
    const uScale = (1 - wave * 0.3 * (0.5 + 0.5 * Math.sin(3 * th))) * tRatio;

    for (let j = 0; j < P; j++) {
      const p = profile[j];
      rot[j] = { u: p.u, v: p.v * wScale, outer: p.outer };
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
      if (p.outer) {
        let u = p.u * uScale;
        // 각진 면(패싯)은 모서리가 가장 두꺼워지므로, 모서리가 정확히 두께에 닿게 맞춘다
        if (facets > 0) u *= facetR * Math.cos(Math.PI / facets);
        if (grooves > 0) {
          const spiral = Math.sin(grooves * th + p.v * groovePitch);
          const cut = grooveDepth * t * (0.5 + 0.5 * spiral);
          u -= cut;
          carved += cut;
        }
        if (u < 0) u = 0;
        radius += u;
        if (bump.amp > 0) {
          let nz;
          if (s.texture === 'diamond') {
            /* 다이아 텍스쳐는 날을 비스듬히 대고 깎아 내므로 골이 대각선으로 흐릅니다.
             * 한 바퀴에 정수 개가 들어가도록 두어 돌아와도 무늬가 어긋나지 않습니다. */
            const RIDGES = 11;          // 한 바퀴에 들어가는 골의 수
            const SLANT = 2.6;          // 클수록 더 비스듬하게 눕습니다
            const phase = RIDGES * th + SLANT * p.v;
            const saw = Math.abs(((phase / Math.PI) % 2) - 1);   // 0~1 삼각파 = 날카로운 골
            const jitter = valueNoise(Math.cos(th) * 3 + 31, Math.sin(th) * 3 + p.v * 1.4);
            nz = saw * 0.74 + jitter * 0.26;                     // 손으로 깎은 만큼 흔들림도 섞는다
          } else {
            // 둘레 방향으로 주기적인 노이즈 — 한 바퀴 돌아와도 결이 어긋나지 않는다
            nz = valueNoise(Math.cos(th) * bump.ring + 31, Math.sin(th) * bump.ring + p.v * bump.axial);
          }
          const cut = nz * bump.amp * Math.max(t, 1.2);
          radius -= cut;
          carved += cut;
        }
        // 벽이 0이 되면 안쪽 면과 바깥 면이 겹쳐 반지가 뚫려 보입니다.
        if (radius < innerR + MIN_WALL) radius = innerR + MIN_WALL;
      }
      depth[d++] = carved;
      pos[n++] = radius * Math.cos(th);
      pos[n++] = radius * Math.sin(th);
      pos[n++] = p.v;
      uv[m++] = i / SEG;
      uv[m++] = j / (P - 1);
    }
  }

  const idx = [];
  for (let i = 0; i < SEG; i++) {
    const i2 = (i + 1) % SEG;          // 마지막 줄은 첫 줄로 돌아온다
    for (let j = 0; j < P; j++) {
      const j2 = (j + 1) % P;
      const a = i * P + j;
      const b = i * P + j2;
      const c = i2 * P + j;
      const d = i2 * P + j2;
      idx.push(a, c, b, b, c, d);
    }
  }

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

  for (let i = 0; i < depth.length; i++) {
    /* 솟은 면만 다시 갈아 내므로, 위쪽 3할 정도만 은색으로 남고
     * 그 아래는 빠르게 검어집니다. 매끈한 디자인은 전체가 은은하게 가라앉습니다. */
    const t = maxCarve > 0.01
      ? Math.min(1, Math.max(0, depth[i] / maxCarve))
      : 0.7;
    const k = smooth(Math.min(1, Math.max(0, (t - 0.28) / 0.42))) * 0.95;
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
  const thr = maxCarve * 0.42;          // 이보다 얕은 곳은 수지가 고이지 않습니다

  const fill = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const r = Math.hypot(x, y);
    const k = r > 1e-6 ? (r + depth[i]) / r : 1;
    fill[i * 3] = x * k;
    fill[i * 3 + 1] = y * k;
    fill[i * 3 + 2] = pos.getZ(i);
  }

  /* 부분만 채우면 반지 한쪽 구간에만 색이 들어갑니다.
   * 손등 쪽(위)을 가운데로 두고 그 둘레만 덮습니다. */
  const cov = CONFIG.epoxy.coverage[spec.epoxyCoverage || 'part'] || { ratio: 1 };
  const half = Math.PI * Math.min(1, cov.ratio);     // 위쪽 기준 좌우로 덮는 각도
  function inArc(i) {
    if (cov.ratio >= 1) return true;
    const x = pos.getX(i), y = pos.getY(i);
    const ang = Math.atan2(y, x);                    // 위쪽(+Y)이 π/2
    let d = Math.abs(ang - Math.PI / 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d <= half;
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

/* ─────────────────── 재질 ─────────────────── */
/* 거친 마감일수록 반사를 줄여야 질감이 보입니다.
 * 반사를 그대로 두면 표면이 하얗게 날아가 결이 사라집니다. */
const FINISH = {
  polish:  { roughness: 0.07, env: 1.30, tone: 1.00 },
  diamond: { roughness: 0.14, env: 1.24, tone: 0.98 },
  sandbar: { roughness: 0.30, env: 0.96, tone: 0.92 },
  fine:    { roughness: 0.46, env: 0.70, tone: 0.86 },
  soft:    { roughness: 0.36, env: 0.82, tone: 0.90 }
};

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
const CLEAR_STONES = ['아쿠아마린', '시트린', '가넷', '루비', '화이트 쿼츠', '플루오라이트', '페리도트'];

function stoneMaterial(spec) {
  const c = new THREE.Color(R.stoneColorOf(spec) || '#7a8b9c');
  // 모이사나이트는 무색 투명, 천연석은 대부분 불투명한 캐보션
  const clear = spec.stoneType === 'moissanite' || CLEAR_STONES.indexOf(spec.stone) !== -1;
  return new THREE.MeshPhysicalMaterial({
    color: c,
    metalness: 0,
    roughness: 0.05,
    transmission: clear ? (spec.stoneType === 'moissanite' ? 0.55 : 0.35) : 0,
    thickness: clear ? 1.4 : 0,
    iridescence: spec.stoneType === 'moissanite' ? 0.25 : 0,
    ior: 1.72,
    envMapIntensity: 1.1,
    clearcoat: 1,
    clearcoatRoughness: 0.03
  });
}

/* ─────────────────── 원석 · 세팅 ─────────────────── */
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
      const oval0 = s.stoneShape === 'oval';
      const ov0 = CONFIG.stones.natural.ovalMm;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(gemR, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      dome.scale.set(oval0 ? (ov0.w / 2) / gemR : 1, 0.72, oval0 ? (ov0.h / 2) / gemR : 1);
      dome.position.set(0, girdle - gemR * 0.1, 0);
      group.add(dome);

      const seatDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(gemR * 0.96, gemR * 0.9, gemR * 0.5 + up * 2, 36), metalMat);
      seatDisc.scale.set(oval0 ? (ov0.w / 2) / gemR : 1, 1, oval0 ? (ov0.h / 2) / gemR : 1);
      seatDisc.position.set(0, girdle - gemR * 0.36 - up, 0);
      group.add(seatDisc);
    } else {
      const pavilion = new THREE.Mesh(new THREE.ConeGeometry(gemR, gemR * 1.2, 8), mat);
      pavilion.position.set(0, girdle - gemR * 0.6, 0);
      pavilion.rotation.x = Math.PI;               // 뾰족한 쪽이 아래로
      group.add(pavilion);

      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(gemR * 0.58, gemR, gemR * 0.44, 8), mat);
      crown.position.set(0, girdle + gemR * 0.22, 0);
      group.add(crown);
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
    const wellR = gemR * 1.34;
    const wellDepth = gemR * 0.7;

    // 우물 벽 — 위가 넓고 아래가 좁은 깔때기
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(wellR, gemR * 0.92, wellDepth + up * 2, 40, 1, true), metalMat);
    well.position.set(0, topR - wellDepth / 2 + lift - up, 0);
    well.material = metalMat.clone();
    well.material.side = THREE.DoubleSide;
    group.add(well);

    // 알 — 우물 안에 앉아 윗면만 살짝 보입니다
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(gemR, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    gem.scale.y = 0.42;
    gem.position.set(0, topR - wellDepth * 0.42 + lift, 0);
    group.add(gem);

  } else {
    /* 캐보션을 올리는 방식 두 가지.
     *   bezel  테두리 금속이 돌 허리를 한 바퀴 감싸 누릅니다.
     *   seat   자리를 파고 돌을 심어 접착으로 고정합니다 — 테두리 없이 가장 낮게 앉습니다.
     * 오벌은 6×8mm 한 규격이라 실제 비율(3:4)로 눌러 그립니다. */
    const oval = s.stoneShape === 'oval';
    const ov = CONFIG.stones.natural.ovalMm;
    const sx = oval ? (ov.w / 2) / size : 1;      // 폭 6mm
    const sz = oval ? (ov.h / 2) / size : 1;      // 길이 8mm
    const seat = s.setting === 'seat';

    const gem = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat);
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

  addEventListener('resize', () => {
    if (!stage.clientWidth) return;
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
  });

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
const SCULPT_BRUSH = 2.6;      // 몇 지점까지 번지는가
const SCULPT_GAIN = 0.010;     // 1px 끌 때 얼마나 밀리는가

let sculptOn = false;
let sculpting = null;

function ensureSculpt() {
  if (!spec._sculpt) spec._sculpt = R.sculptRead(spec.sculpt || '');
  return spec._sculpt;
}

/** 화면 좌표 → 반지 위 각도. 반지 평면(회전 적용)과 광선을 만나게 해서 구한다. */
const _ray = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _hit = new THREE.Vector3();
const _normal = new THREE.Vector3();

function angleAtPointer(ev) {
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
    return Math.atan2(local.y, local.x);      // 위쪽(+Y)이 π/2
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
  return Math.atan2(local2.y, local2.x);
}

function sculptPush(angle, amount) {
  const arr = ensureSculpt();
  const n = arr.length;
  // 위쪽(π/2)을 0번으로 맞춘다 — sculptAt 과 같은 규칙
  const center = ((angle - Math.PI / 2) / (Math.PI * 2) * n % n + n) % n;
  for (let i = 0; i < n; i++) {
    let d = Math.abs(i - center);
    if (d > n / 2) d = n - d;                // 한 바퀴이므로 가까운 쪽으로
    if (d > SCULPT_BRUSH) continue;
    const w = Math.cos((d / SCULPT_BRUSH) * Math.PI / 2);   // 가운데가 가장 세게
    arr[i] = Math.max(-1, Math.min(1, arr[i] + amount * w * w));
  }
  spec.sculpt = R.sculptWrite(arr);
}

function bindSculpt() {
  const el = renderer.domElement;

  el.addEventListener('pointerdown', (ev) => {
    if (!sculptOn || ev.button !== 0) return;
    const a = angleAtPointer(ev);
    if (a === null) return;
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    sculpting = { angle: a, y: ev.clientY, moved: false };
  });

  el.addEventListener('pointermove', (ev) => {
    if (!sculpting) return;
    const dy = sculpting.y - ev.clientY;       // 위로 끌면 두껍게
    if (Math.abs(dy) < 1) return;
    sculpting.y = ev.clientY;
    sculpting.moved = true;
    // 끄는 동안 현재 가리키는 자리를 따라가면 붓처럼 칠할 수 있다
    const a = angleAtPointer(ev);
    sculptPush(a === null ? sculpting.angle : a, dy * SCULPT_GAIN);
    studio.changed();
  });

  const finish = (ev) => {
    if (!sculpting) return;
    try { el.releasePointerCapture(ev.pointerId); } catch (e) {}
    sculpting = null;
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', finish);
}

/** 다듬기 모드를 켜고 끈다. 켜면 화면 돌리기는 잠깐 멈춘다. */
function setSculptMode(on) {
  sculptOn = !!on;
  controls.enableRotate = !sculptOn;
  controls.autoRotate = sculptOn ? false : controls.autoRotate;
  renderer.domElement.style.cursor = sculptOn ? 'ns-resize' : '';
  return sculptOn;
}

function rebuild() {
  if (ringGroup) {
    scene.remove(ringGroup);
    ringGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
  const model = R.getModel(spec.modelId);
  // 주소에서 들어온 자국은 처음 한 번 숫자로 풀어 둡니다
  if (!spec._sculpt || R.sculptWrite(spec._sculpt) !== (spec.sculpt || '')) {
    spec._sculpt = R.sculptRead(spec.sculpt || '');
  }
  ringGroup = new THREE.Group();
  const bandGeo = buildBand(spec, model);
  const bandMat = metalMaterial(spec);
  if (paintOxidize(bandGeo, spec)) bandMat.vertexColors = true;
  ringGroup.add(new THREE.Mesh(bandGeo, bandMat));
  // 홈에 고여 굳은 수지를 따로 덮는다 (금속에 스며드는 것이 아니다)
  const resin = buildEpoxyFill(bandGeo, spec);
  if (resin) ringGroup.add(resin);

  buildStone(spec, ringGroup);
  ringGroup.rotation.x = -0.12;
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
  studio.clearSculpt = () => {
    spec._sculpt = null;
    spec.sculpt = '';
    studio.changed();
  };
  studio.onChange(rebuild);
  $('preview-2d').classList.add('is-hidden');
} catch (err) {
  console.warn('[온명] 3D 미리보기를 사용할 수 없어 2D로 표시합니다:', err);
  studio.ready3d = false;
  stage.classList.add('is-hidden');
}
