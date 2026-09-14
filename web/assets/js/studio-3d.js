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
  polish:   { amp: 0,     ring: 0,   axial: 0 },
  matte:    { amp: 0.008, ring: 10,  axial: 8 },
  brushed:  { amp: 0.012, ring: 1.2, axial: 26 },
  hammered: { amp: 0.10,  ring: 4,   axial: 2.2 },
  sand:     { amp: 0.028, ring: 14,  axial: 12 },
  stone:    { amp: 0.16,  ring: 2.5, axial: 1.8 }
};

/* ─────────────────── 밴드 지오메트리 ─────────────────── */
function buildBand(s, model) {
  const innerR = R.sizeToInnerDiameter(s.size) / 2;
  const t = s.thickness;
  const SEG = 320;
  const profile = makeProfile(s);
  const P = profile.length;
  const bump = BUMP[s.texture] || BUMP.polish;

  const taper = model ? model.taper : 0;
  const wave = model ? model.wave : 0;
  const twist = model ? model.twist : 0;
  const facets = (s.profile === 'facet' && model) ? model.facets : 0;

  const pos = new Float32Array((SEG + 1) * P * 3);
  const uv = new Float32Array((SEG + 1) * P * 2);
  const rot = new Array(P);
  let n = 0, m = 0;

  // 비틀림은 한 바퀴 돌았을 때 단면이 제자리로 돌아와야 이음매가 생기지 않는다.
  // 그래서 "몇 바퀴 비틀지"를 정수로 맞춘다.
  const turns = Math.round(twist * 4);

  for (let i = 0; i <= SEG; i++) {
    const th = (i / SEG) * Math.PI * 2;
    const wScale = 1 - taper * (0.5 - 0.5 * Math.sin(th));
    // 웨이브는 안쪽으로만 들어가므로 최대 두께는 그대로 유지된다
    const uScale = 1 - wave * 0.3 * (0.5 + 0.5 * Math.sin(3 * th));
    const tw = turns * th;
    const ct = Math.cos(tw), st = Math.sin(tw);

    // 안쪽 면은 건드리지 않아 반지 구멍(호수)이 정확히 유지되고,
    // 바깥 면만 비틀린 뒤 최대 반경이 두께를 넘지 않도록 되돌린다.
    let uMax = 0;
    for (let j = 0; j < P; j++) {
      const p = profile[j];
      if (!p.outer) { rot[j] = { u: 0, v: p.v * wScale, outer: false }; continue; }
      const cu = p.u - t / 2, cv = p.v * wScale;
      rot[j] = { u: cu * ct - cv * st + t / 2, v: cu * st + cv * ct, outer: true };
      if (rot[j].u > uMax) uMax = rot[j].u;
    }
    const shrink = uMax > t ? t / uMax : 1;

    let facetR = 1;
    if (facets > 0) {
      const seg = (Math.PI * 2) / facets;
      const delta = (((th % seg) + seg) % seg) - seg / 2;
      facetR = 1 / Math.cos(delta);
    }

    for (let j = 0; j < P; j++) {
      const p = rot[j];
      let radius = innerR;
      if (p.outer) {
        let u = Math.max(0, p.u * shrink) * uScale;
        // 각진 면(패싯)은 모서리가 가장 두꺼워지므로, 모서리가 정확히 두께에 닿게 맞춘다
        if (facets > 0) u *= facetR * Math.cos(Math.PI / facets);
        radius += u;
        if (bump.amp > 0) {
          // 둘레 방향으로 주기적인 노이즈 — 한 바퀴 돌아와도 결이 어긋나지 않는다
          const nz = valueNoise(Math.cos(th) * bump.ring + 31, Math.sin(th) * bump.ring + p.v * bump.axial);
          radius -= nz * bump.amp * Math.max(t, 1.2);
        }
        if (radius < innerR) radius = innerR;
      }
      pos[n++] = radius * Math.cos(th);
      pos[n++] = radius * Math.sin(th);
      pos[n++] = p.v;
      uv[m++] = i / SEG;
      uv[m++] = j / (P - 1);
    }
  }

  const idx = [];
  for (let i = 0; i < SEG; i++) {
    for (let j = 0; j < P; j++) {
      const a = i * P + j;
      const b = i * P + ((j + 1) % P);
      const c = (i + 1) * P + j;
      const d = (i + 1) * P + ((j + 1) % P);
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ─────────────────── 재질 ─────────────────── */
/* 거친 마감일수록 반사를 줄여야 질감이 보입니다.
 * 반사를 그대로 두면 표면이 하얗게 날아가 결이 사라집니다. */
const FINISH = {
  polish:   { roughness: 0.07, env: 1.30, tone: 1.00 },
  brushed:  { roughness: 0.26, env: 1.00, tone: 0.94 },
  matte:    { roughness: 0.42, env: 0.74, tone: 0.84 },
  hammered: { roughness: 0.15, env: 1.20, tone: 0.98 },
  sand:     { roughness: 0.50, env: 0.66, tone: 0.78 },
  stone:    { roughness: 0.60, env: 0.56, tone: 0.70 }
};

function metalMaterial(s) {
  const metal = CONFIG.price.metals[s.metal] || CONFIG.price.metals['silver925'];
  const f = FINISH[s.texture] || FINISH.polish;
  // 거친 마감은 반사를 줄이는 것만으로는 하얗게 떠 보여서, 바탕색도 함께 눌러 준다
  const color = new THREE.Color(metal.color).multiplyScalar(f.tone);
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

function stoneMaterial(name) {
  const c = new THREE.Color(ONM.STONE_COLOR[name] || '#7a8b9c');
  const clear = CLEAR_STONES.indexOf(name) !== -1;
  return new THREE.MeshPhysicalMaterial({
    color: c,
    metalness: 0,
    roughness: 0.05,
    transmission: clear ? 0.35 : 0,
    thickness: clear ? 1.4 : 0,
    ior: 1.72,
    envMapIntensity: 1.1,
    clearcoat: 1,
    clearcoatRoughness: 0.03
  });
}

/* ─────────────────── 원석 · 세팅 ─────────────────── */
function buildStone(s, group) {
  if (!s.stone || s.setting === 'none') return;
  const innerR = R.sizeToInnerDiameter(s.size) / 2;
  const topR = innerR + s.thickness;
  // 알 크기는 반지 폭과 두께 안에서 자연스럽게 앉을 만큼으로 잡는다
  const size = Math.max(1.1, Math.min(s.width * 0.62, s.thickness * 1.9, 3.6));
  const mat = stoneMaterial(s.stone);
  const metalMat = metalMaterial(s);

  if (s.setting === 'prong') {
    // 발에 물린 원석은 밴드 위로 솟기 때문에, 베젤보다 한 치수 작게 잡아야 균형이 맞는다
    const gemR = size * 0.8;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(gemR, 0), mat);
    gem.position.set(0, topR + gemR * 0.42, 0);
    gem.scale.y = 1.15;
    group.add(gem);
    // 발(프롱)은 원석 허리를 아래에서 물어주는 높이까지만 올라온다
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const prong = new THREE.Mesh(
        new THREE.CylinderGeometry(gemR * 0.19, gemR * 0.23, gemR * 1.0, 12), metalMat);
      prong.position.set(Math.cos(a) * gemR * 0.72, topR + gemR * 0.2, Math.sin(a) * gemR * 0.72);
      group.add(prong);
    }
  } else if (s.setting === 'inlay') {
    group.add(new THREE.Mesh(
      new THREE.TorusGeometry(innerR + s.thickness * 0.72, Math.max(0.12, s.width * 0.12), 12, 140), mat));
  } else if (s.setting === 'flush') {
    // 표면과 거의 같은 높이로 묻는 세팅 — 낮고 완만한 돔
    const gem = new THREE.Mesh(new THREE.SphereGeometry(size * 0.8, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    gem.scale.y = 0.34;
    gem.position.set(0, topR - size * 0.04, 0);
    group.add(gem);
  } else { // bezel — 금속 테두리가 카보숑 원석을 감싼다
    const gem = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    gem.scale.y = 0.62;
    gem.position.set(0, topR - size * 0.08, 0);
    group.add(gem);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 1.12, size * 1.12, size * 0.55, 40, 1, true), metalMat);
    rim.position.set(0, topR - size * 0.12, 0);
    group.add(rim);
  }
}

/* ─────────────────── 촬영용 환경 ───────────────────
 * 금속은 결국 "주변에 무엇이 비치는가"로 보입니다.
 * 밝은 흰 방을 비추면 은반지가 하얗게 날아가 버리므로,
 * 실제 주얼리 촬영처럼 어두운 박스 안에 조명판 몇 개를 세워 둡니다. */
function studioEnvironment() {
  const env = new THREE.Scene();

  // 은은 주변을 그대로 비추므로, 사방을 중간 톤으로 두어야
  // 밝은 크림 배경 위에서도 반지 몸통이 또렷하게 보인다.
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(80, 80, 80),
    new THREE.MeshBasicMaterial({ color: 0x6d675d, side: THREE.BackSide })
  );
  env.add(box);

  const panel = (w, h, color, gain, pos, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain) })
    );
    m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    env.add(m);
  };

  panel(40, 18, 0xffffff, 6.5, [0, 32, 6], [Math.PI / 2, 0, 0]);        // 위쪽 메인 조명
  panel(22, 34, 0xfff3e2, 3.2, [-34, 4, 6], [0, Math.PI / 2, 0]);       // 왼쪽 따뜻한 보조광
  panel(16, 30, 0xe4edf6, 2.0, [34, -2, -6], [0, -Math.PI / 2, 0]);     // 오른쪽 차가운 보조광
  panel(30, 14, 0xfff8ec, 1.8, [0, -30, 2], [-Math.PI / 2, 0, 0]);      // 바닥 반사판 (따뜻한 바운스)
  panel(26, 20, 0xffffff, 1.1, [0, 2, -34], [0, 0, 0]);                 // 뒤쪽 분리광

  return env;
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
  scene.environment = pmrem.fromScene(studioEnvironment(), 0.03).texture;

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

function rebuild() {
  if (ringGroup) {
    scene.remove(ringGroup);
    ringGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
  const model = R.getModel(spec.modelId);
  ringGroup = new THREE.Group();
  ringGroup.add(new THREE.Mesh(buildBand(spec, model), metalMaterial(spec)));
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
  studio.onChange(rebuild);
  $('preview-2d').classList.add('is-hidden');
} catch (err) {
  console.warn('[온명] 3D 미리보기를 사용할 수 없어 2D로 표시합니다:', err);
  studio.ready3d = false;
  stage.classList.add('is-hidden');
}
