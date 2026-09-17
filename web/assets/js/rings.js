/*
 * 온명 — 반지 디자인 카탈로그 & 추천 엔진
 * ------------------------------------------------------------------
 * 캔바 "딸깍" 문서의 4가지 추천 계열을 뼈대로 삼았습니다.
 *   거친 · 강인한 / 유기적 · 유연한 / 심플한 / 개성있는
 *
 * 리포트가 고정된 한 가지 디자인만 보여주던 것을 바꿔서,
 *  · 일주의 오행 + 행운 키워드 + 캔바 원문(어울리는 반지 디자인)을 함께 읽고
 *  · 20종 모델에 점수를 매겨 상위 디자인을 추천하며
 *  · 무드/금속/두께 취향 필터와 "다시 추천받기"로 매번 다른 조합을 냅니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};
  var CONFIG = ONM.CONFIG;

  /* ────────────────────────── 계열 정의 ────────────────────────── */

  var FAMILIES = {
    rugged: {
      key: 'rugged', label: '거친 · 강인한',
      desc: '각진 실루엣과 깊이 있는 텍스처로 단단한 중심을 드러내는 계열입니다.'
    },
    organic: {
      key: 'organic', label: '유기적 · 유연한',
      desc: '흐르는 곡선과 자연스러운 표면으로 부드러운 힘을 표현하는 계열입니다.'
    },
    minimal: {
      key: 'minimal', label: '심플한',
      desc: '군더더기 없는 선과 비율만으로 존재감을 만드는 계열입니다.'
    },
    signature: {
      key: 'signature', label: '개성있는',
      desc: '비대칭과 포인트 디테일로 자신만의 분위기를 드러내는 계열입니다.'
    }
  };

  /* ────────────────────────── 모델 카탈로그 ──────────────────────────
   * profile   : 단면 형태 flat | round | dshape | knife | wave | facet | step
   * texture   : polish(유광) | diamond(다이아 텍스쳐) | sandbar(사포바) | fine(고운 무광) | soft(은은한 무광)
   * setting   : none | bezel(베젤) | prong(프롱) | flush(플러시)
   * width     : [최소, 기본, 최대] mm — 반지의 "높이"(손가락을 감싸는 폭)
   * thickness : [최소, 기본, 최대] mm — 반지의 "두께"
   * elements  : 잘 맞는 오행
   * moods     : 데일리 | 시그니처 | 커플 | 선물
   */
  var MODELS = [
    // ── 거친 · 강인한 ─────────────────────────────────────────────
    { id: 'rugged-baseline', name: '암반', family: 'rugged', profile: 'flat', texture: 'diamond', setting: 'none',
      width: [3, 5, 9], thickness: [1.6, 2.4, 4.0], wave: 0.12, twist: 0, taper: 0, facets: 0,
      elements: ['토', '금'], moods: ['시그니처', '데일리'], basePrice: 121000,
      tags: ['신념', '책임', '인내', '확고함', '안정', '우직'],
      desc: '거친 바위 표면을 그대로 옮긴 듯한 텍스처. 장식을 덜어낸 대신 표면 자체가 존재감이 됩니다.' },
    { id: 'rugged-forge', name: '단조', family: 'rugged', profile: 'step', texture: 'diamond', setting: 'none',
      width: [3.5, 5.5, 10], thickness: [1.8, 2.6, 4.2], wave: 0.2, twist: 0, taper: 0.1, facets: 0,
      elements: ['금', '토'], moods: ['시그니처'], basePrice: 128000,
      tags: ['결단', '강인', '개척', '추진력', '용기', '리더십'],
      desc: '잘게 깎아 낸 면이 층마다 빛을 튕겨 냅니다. 두드릴수록 단단해지는 금속의 성질을 형태로 남겼습니다.' },
    { id: 'rugged-fortress', name: '성곽', family: 'rugged', profile: 'step', texture: 'fine', setting: 'bezel',
      width: [4, 6, 10], thickness: [2.0, 2.8, 4.5], wave: 0, twist: 0, taper: 0, facets: 6,
      elements: ['토', '금'], moods: ['시그니처', '선물'], basePrice: 141000,
      tags: ['원칙', '의리', '책임감', '신의', '버팀목', '강직'],
      desc: '층을 이룬 각진 실루엣에 원석을 낮게 앉힌 구조. 지켜내는 성향을 그대로 담았습니다.' },
    { id: 'rugged-root', name: '뿌리', family: 'rugged', profile: 'wave', texture: 'sandbar', setting: 'none',
      width: [3, 4.5, 8], thickness: [1.6, 2.2, 3.6], wave: 0.35, twist: 0.15, taper: 0.1, facets: 0,
      elements: ['목', '토'], moods: ['데일리', '시그니처'], basePrice: 122000,
      tags: ['성장', '끈기', '꾸준함', '성실', '기반', '축적'],
      desc: '땅을 움켜쥔 뿌리의 결을 새긴 밴드. 시간이 쌓일수록 깊어지는 인상을 목표로 했습니다.' },
    { id: 'rugged-edge', name: '단애', family: 'rugged', profile: 'knife', texture: 'sandbar', setting: 'none',
      width: [2.5, 4, 7], thickness: [1.4, 2.0, 3.4], wave: 0, twist: 0, taper: 0.25, facets: 0,
      elements: ['금'], moods: ['데일리', '시그니처'], basePrice: 116000,
      tags: ['냉철', '분석', '판단', '예리', '집중', '전략'],
      desc: '한쪽으로 날을 세운 나이프 엣지. 곧은 선이 손등 위에서 또렷한 인상을 만듭니다.' },

    // ── 유기적 · 유연한 ────────────────────────────────────────────
    { id: 'organic-stream', name: '유수', family: 'organic', profile: 'round', texture: 'polish', setting: 'none',
      width: [2.5, 4, 7], thickness: [1.2, 1.8, 3.0], wave: 0.3, twist: 0.1, taper: 0.15, facets: 0,
      elements: ['수', '목'], moods: ['데일리', '커플'], basePrice: 109000,
      tags: ['유연함', '지혜', '포용', '흐름', '조화', '통찰'],
      desc: '물결이 지나간 자리처럼 완만하게 흐르는 밴드. 손가락에 편안하게 감기는 착용감이 특징입니다.' },
    { id: 'organic-sprout', name: '새싹', family: 'organic', profile: 'wave', texture: 'soft', setting: 'bezel',
      width: [2.5, 4, 7], thickness: [1.2, 1.8, 3.0], wave: 0.45, twist: 0.2, taper: 0.2, facets: 0,
      elements: ['목', '수'], moods: ['데일리', '선물'], basePrice: 120000,
      tags: ['성장', '가능성', '변화', '기회', '순수', '적응력'],
      desc: '막 돋아난 잎의 곡선을 따라 폭이 변하는 형태. 잎끝이 모이는 자리에 원석 한 알을 앉혔습니다.' },
    { id: 'organic-tide', name: '조수', family: 'organic', profile: 'round', texture: 'diamond', setting: 'none',
      width: [3, 5, 9], thickness: [1.4, 2.2, 3.6], wave: 0.5, twist: 0, taper: 0, facets: 0,
      elements: ['수', '토'], moods: ['시그니처'], basePrice: 125000,
      tags: ['포용', '여유', '평온', '공감', '순환', '깊이'],
      desc: '밀물과 썰물처럼 일렁이는 면을 다이아 텍스쳐로 깎아 냈습니다. 각도에 따라 빛이 다르게 맺힙니다.' },
    { id: 'organic-breeze', name: '연풍', family: 'organic', profile: 'dshape', texture: 'sandbar', setting: 'none',
      width: [2, 3, 5.5], thickness: [1.0, 1.5, 2.6], wave: 0.2, twist: 0.05, taper: 0.1, facets: 0,
      elements: ['목', '화'], moods: ['데일리', '커플'], basePrice: 103000,
      tags: ['다정', '배려', '온기', '섬세', '친화력', '소통'],
      desc: '가늘고 부드러운 D형 밴드. 매일 끼고도 부담 없는 두께로 설계했습니다.' },
    { id: 'organic-embrace', name: '포옹', family: 'organic', profile: 'wave', texture: 'polish', setting: 'bezel',
      width: [3, 4.5, 8], thickness: [1.4, 2.0, 3.2], wave: 0.4, twist: 0.3, taper: 0.15, facets: 0,
      elements: ['토', '수'], moods: ['선물', '커플'], basePrice: 133000,
      tags: ['화합', '사랑', '인연', '신뢰', '조화', '포용'],
      desc: '두 줄기가 서로를 감싸며 만나는 지점에 원석을 앉혔습니다. 관계를 상징하는 구조입니다.' },

    // ── 심플한 ────────────────────────────────────────────────────
    { id: 'minimal-line', name: '정선', family: 'minimal', profile: 'flat', texture: 'polish', setting: 'none',
      width: [1.5, 2.5, 5], thickness: [0.9, 1.4, 2.4], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['금', '수'], moods: ['데일리', '커플'], basePrice: 90000,
      tags: ['절제', '정돈', '완성', '균형', '단정', '품격'],
      desc: '덜어낼 것이 없는 평면 밴드. 비율과 마감만으로 완성도를 증명하는 기본형입니다.' },
    { id: 'minimal-still', name: '정적', family: 'minimal', profile: 'dshape', texture: 'soft', setting: 'none',
      width: [2, 3.5, 6], thickness: [1.1, 1.7, 2.8], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['토', '금'], moods: ['데일리'], basePrice: 96000,
      tags: ['차분', '안정', '신중', '내실', '꾸준함', '집중'],
      desc: '빛을 살짝만 머금는 은은한 무광의 D형 밴드. 조용한 무드가 오래 질리지 않습니다.' },
    { id: 'minimal-depth', name: '심연', family: 'minimal', profile: 'step', texture: 'fine', setting: 'none',
      width: [2.5, 4, 7], thickness: [1.2, 1.9, 3.2], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['수', '금'], moods: ['데일리', '시그니처'], basePrice: 102000,
      tags: ['통찰', '깊이', '지혜', '성찰', '집중', '정밀'],
      desc: '한 단 낮춘 면이 만드는 그림자 선. 장식 없이 두께감만으로 깊이를 만듭니다.' },
    { id: 'minimal-vow', name: '언약', family: 'minimal', profile: 'round', texture: 'polish', setting: 'flush',
      width: [2, 3, 5], thickness: [1.1, 1.6, 2.6], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['금', '토'], moods: ['커플', '선물'], basePrice: 112000,
      tags: ['약속', '신뢰', '신의', '성실', '책임', '지속성'],
      desc: '둥근 밴드에 원석을 표면과 같은 높이로 묻은 형태. 걸림 없이 매일 착용할 수 있습니다.' },
    { id: 'minimal-clarity', name: '청명', family: 'minimal', profile: 'knife', texture: 'polish', setting: 'none',
      width: [1.8, 2.8, 5], thickness: [1.0, 1.5, 2.4], wave: 0, twist: 0, taper: 0.2, facets: 0,
      elements: ['금', '화'], moods: ['데일리', '선물'], basePrice: 99000,
      tags: ['맑음', '완벽', '예리', '정교', '감각', '고결'],
      desc: '가운데로 얇게 선 능선이 빛을 한 줄로 모읍니다. 정교한 세공이 그대로 드러나는 형태입니다.' },

    // ── 개성있는 ──────────────────────────────────────────────────
    { id: 'signature-flare', name: '화염', family: 'signature', profile: 'facet', texture: 'polish', setting: 'prong',
      width: [3, 5, 9], thickness: [1.4, 2.2, 3.6], wave: 0.15, twist: 0.25, taper: 0.2, facets: 12,
      elements: ['화', '목'], moods: ['시그니처'], basePrice: 151000,
      tags: ['열정', '강렬', '개성', '표현', '창조성', '존재감'],
      desc: '불꽃이 솟아오르듯 면이 꺾이는 컷팅. 빛을 여러 방향으로 흩어 강한 인상을 남깁니다.' },
    { id: 'signature-orbit', name: '궤도', family: 'signature', profile: 'round', texture: 'polish', setting: 'bezel',
      width: [3, 4.5, 8], thickness: [1.4, 2.0, 3.4], wave: 0.25, twist: 0.6, taper: 0.1, facets: 0,
      elements: ['수', '금'], moods: ['시그니처', '선물'], basePrice: 146000,
      tags: ['변화', '기회', '수완', '재능', '순발', '자유'],
      desc: '한 바퀴 비틀리며 돌아가는 밴드 위에 원석이 궤도처럼 얹힙니다. 각도마다 다른 얼굴을 보여줍니다.' },
    { id: 'signature-fragment', name: '결정', family: 'signature', profile: 'facet', texture: 'diamond', setting: 'bezel',
      width: [3.5, 5.5, 10], thickness: [1.6, 2.4, 4.0], wave: 0.3, twist: 0, taper: 0, facets: 9,
      elements: ['토', '금'], moods: ['시그니처'], basePrice: 155000,
      tags: ['독창성', '영감', '감각', '전문성', '완성', '독특'],
      desc: '결정이 깨진 단면처럼 불규칙한 면을 이어 붙였습니다. 같은 각도가 두 번 나오지 않는 구조입니다.' },
    { id: 'signature-halo', name: '광배', family: 'signature', profile: 'step', texture: 'fine', setting: 'prong',
      width: [4, 6, 11], thickness: [1.6, 2.4, 4.0], wave: 0, twist: 0, taper: 0, facets: 8,
      elements: ['화', '토'], moods: ['시그니처', '선물'], basePrice: 160000,
      tags: ['명예', '품격', '리더십', '위엄', '포부', '중용'],
      desc: '원석 둘레를 넓은 단이 감싸 빛을 되비춥니다. 손 위에서 가장 먼저 눈에 들어오는 디자인입니다.' },
    { id: 'signature-duet', name: '이중주', family: 'signature', profile: 'wave', texture: 'soft', setting: 'bezel',
      width: [3, 4.5, 8], thickness: [1.4, 2.0, 3.4], wave: 0.55, twist: 0.4, taper: 0.25, facets: 0,
      elements: ['목', '화'], moods: ['커플', '시그니처'], basePrice: 138000,
      tags: ['화합', '교류', '소통', '다재', '인연', '표현력'],
      desc: '굵기가 다른 두 선이 엇갈리며 하나로 만나는 구조. 커플링으로 짝을 맞출 때 특히 잘 어울립니다.' },

    /* ── 온명이 실제로 만들어 온 디자인 ───────────────────────────
     * 사장님이 보내주신 실물 사진을 보고 옮긴 것들입니다. */
    { id: 'onm-pedestal', name: '대좌', family: 'signature', profile: 'step', texture: 'polish', setting: 'prong',
      width: [4.5, 6.5, 9], thickness: [1.8, 2.5, 3.4], wave: 0, twist: 0, taper: 0.06, facets: 0,
      elements: ['금', '토'], moods: ['시그니처', '선물'], basePrice: 152000,
      tags: ['신념', '책임', '확고함', '품격', '중심', '안정'],
      preset: { stoneSize: 6.0, stoneShape: 'round', stoneHeight: -0.2 },
      desc: '넓은 판 가운데를 거울처럼 올리고 양 옆은 무광으로 눌러, 한 줄 광이 손등 위를 지나갑니다. ' +
        '한쪽 어깨를 한 단 낮춰 그 자리에 원석을 발로 물어 올렸습니다.' },

    { id: 'onm-ridge', name: '능선', family: 'rugged', profile: 'facet', texture: 'diamond', setting: 'none',
      width: [3.5, 5.5, 9], thickness: [1.8, 2.6, 4.0], wave: 0.18, twist: 0, taper: 0, facets: 9,
      elements: ['토', '금'], moods: ['커플', '시그니처'], basePrice: 136000,
      tags: ['인내', '우직', '강인', '개척', '자연스러운 질감', '단단함'],
      preset: { oxidize: true, organic: 0.45 },
      desc: '겉면을 불규칙하게 깎아 낸 뒤 유화로 골을 까맣게 눌렀습니다. 솟은 자리만 빛을 받아 ' +
        '산등성이처럼 능선이 드러납니다. 둘이 나란히 끼면 같은 산의 앞뒤가 됩니다.' },

    { id: 'onm-comb', name: '빗살', family: 'minimal', profile: 'round', texture: 'sandbar', setting: 'flush',
      width: [2, 3, 4.5], thickness: [1.2, 1.6, 2.4], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['금', '수'], moods: ['데일리', '커플'], basePrice: 99000,
      tags: ['정제', '정돈', '단정', '섬세', '차분', '꾸준함'],
      preset: { grain: 'vertical', stoneSize: 1.5 },
      desc: '가는 밴드에 세로결을 촘촘히 새겨 빗살무늬처럼 둘렀습니다. 한 자리에만 작은 알을 ' +
        '표면과 같은 높이로 묻어, 매일 껴도 걸리는 데가 없습니다.' },

    { id: 'onm-vine', name: '넝쿨', family: 'organic', profile: 'wave', texture: 'polish', setting: 'seat',
      width: [3, 4.5, 7], thickness: [1.6, 2.2, 3.2], wave: 0.3, twist: 0, taper: 0.08, facets: 0,
      elements: ['목', '수'], moods: ['데일리', '선물'], basePrice: 129000,
      tags: ['유연', '조화', '자연에서 영감', '포용', '섬세', '감성'],
      preset: { organic: 0.55, stoneShape: 'oval', stoneSize: 6.0, stoneHeight: -0.3 },
      desc: '녹아 흐르다 굳은 듯한 밴드가 원석을 넝쿨처럼 감아 옵니다. 길쭉한 오벌 캐보션을 ' +
        '자리를 파고 심어 넣어, 돌이 금속 안에 잠긴 것처럼 앉습니다.' },

    { id: 'onm-signet', name: '인장', family: 'minimal', profile: 'signet', texture: 'polish', setting: 'none',
      width: [2.5, 3.2, 5], thickness: [1.4, 1.8, 2.6], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['토', '금'], moods: ['시그니처', '선물'], basePrice: 134000,
      tags: ['신념', '책임', '확고함', '품격', '중심', '이름'],
      preset: { plateSize: 1 },
      desc: '뒤쪽은 가는 밴드로 가볍게 지나가다가 손등 쪽에서만 어깨가 솟아 평평한 판이 됩니다. ' +
        '그 판에 이름 첫 글자나 문양을 새겨 도장처럼 씁니다.' }
  ];

  /* ────────────────────── 캔바 원문 → 스타일 해석 ────────────────────── */

  var LEXICON = [
    { family: 'organic', words: ['곡선', '부드러', '유려', '물결', '자연스러', '유기적', '흐르', '흐름', '감기는', '볼륨'] },
    { family: 'rugged', words: ['각진', '단단', '강인', '굳건', '묵직', '거친', '깊이 있는 텍스처', '실루엣', '든든', '견고', '구조'] },
    { family: 'minimal', words: ['절제', '심플', '군더더기', '정제', '단정', '깔끔', '비율', '과하지 않', '담백', '정돈', '균형감', '안정적'] },
    { family: 'signature', words: ['개성', '독창', '화려', '강렬', '비정형', '독특', '포인트', '컷팅', '세련된 디테일', '감각적'] }
  ];

  var TEXTURE_HINT = [
    { texture: 'diamond', words: ['해머', '질감', '텍스처', '텍스쳐', '강렬'] },
    { texture: 'soft', words: ['차분', '은은한 질감', '무광'] },
    { texture: 'polish', words: ['광택', '빛', '세련'] },
    { texture: 'fine', words: ['정제', '정돈', '단정'] },
    { texture: 'sandbar', words: ['자연에서 영감', '자연스러운 질감'] }
  ];

  /** 오행 상생: 목→화→토→금→수→목 */
  var SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };

  function countHits(text, words) {
    var n = 0;
    for (var i = 0; i < words.length; i++) if (text.indexOf(words[i]) !== -1) n++;
    return n;
  }

  /** 일주의 "어울리는 반지 디자인" 원문에서 계열 성향을 읽어낸다 */
  function readStyleBias(record) {
    var text = (record.ringNote || '') + ' ' + (record.keywords || '') + ' ' + (record.tagline || '');
    var bias = {}, best = null, bestN = 0;
    LEXICON.forEach(function (l) {
      var n = countHits(text, l.words);
      bias[l.family] = n;
      if (n > bestN) { bestN = n; best = l.family; }
    });
    var texture = null, tn = 0;
    TEXTURE_HINT.forEach(function (t) {
      var n = countHits(text, t.words);
      if (n > tn) { tn = n; texture = t.texture; }
    });
    return { bias: bias, leading: best, texture: texture };
  }

  /* ────────────────────────── 추천 엔진 ────────────────────────── */

  // 재현 가능한 난수 (같은 seed → 같은 결과)
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /**
   * 일주에 맞는 반지 추천
   * @param {Object} record   ONMYEONG.ILJU 레코드
   * @param {Object} opts     { seed, mood, metal, volume('slim'|'normal'|'bold'), limit }
   * @returns {Array} 추천 목록 (점수 내림차순)
   */
  function recommend(record, opts) {
    opts = opts || {};
    var limit = opts.limit || 6;
    var rand = rng(opts.seed || 1);
    var style = readStyleBias(record);
    var dayElem = record.stemInfo.elem;      // 일간 오행 — 나 자신
    var branchElem = record.branchInfo.elem; // 일지 오행 — 나의 바탕
    var luckySet = (record.lucky || []).concat((record.keywords || '').split(/[ㆍ,\/]/));
    luckySet = luckySet.map(function (s) { return String(s).trim(); }).filter(Boolean);
    var taglineSet = (record.tagline || '').split('/').map(function (s) { return s.trim(); });

    var scored = MODELS.map(function (m) {
      var score = 0;
      var reasons = [];

      // 1) 오행 궁합 (최대 34점)
      if (m.elements.indexOf(dayElem) !== -1) {
        score += 22;
        reasons.push('일간 ' + record.stem + '(' + dayElem + ')의 기운과 바로 맞물리는 형태');
      } else if (m.elements.indexOf(SHENG[dayElem]) !== -1) {
        score += 12;
        reasons.push('일간 ' + record.stem + '(' + dayElem + ')이 살려주는 ' + SHENG[dayElem] + '의 결');
      }
      if (m.elements.indexOf(branchElem) !== -1) {
        score += 12;
        reasons.push('일지 ' + record.branch + '(' + branchElem + ')의 바탕을 받쳐주는 구조');
      }

      // 2) 캔바 원문에서 읽은 계열 성향 (최대 26점)
      var b = style.bias[m.family] || 0;
      if (b > 0) {
        score += Math.min(26, 13 * b);
        reasons.push('리포트의 "어울리는 반지 디자인"이 가리키는 ' + FAMILIES[m.family].label + ' 계열');
      }
      if (style.texture && style.texture === m.texture) {
        score += 8;
        reasons.push('원문이 언급한 질감과 같은 마감');
      }

      // 3) 행운 키워드 · 일주 키워드 겹침 (최대 24점)
      var hit = [];
      m.tags.forEach(function (t) {
        for (var i = 0; i < luckySet.length; i++) {
          if (luckySet[i] && (luckySet[i].indexOf(t) !== -1 || t.indexOf(luckySet[i]) !== -1)) {
            if (hit.indexOf(t) === -1) hit.push(t);
            break;
          }
        }
        for (var j = 0; j < taglineSet.length; j++) {
          if (taglineSet[j] && (taglineSet[j].indexOf(t) !== -1 || t.indexOf(taglineSet[j]) !== -1)) {
            if (hit.indexOf(t) === -1) hit.push(t);
            break;
          }
        }
      });
      if (hit.length) {
        score += Math.min(24, hit.length * 9);
        reasons.push('키워드 ' + hit.slice(0, 3).join('ㆍ') + ' 와 이어지는 디자인');
      }

      // 4) 사용자가 고른 무드 (최대 16점)
      if (opts.mood && opts.mood !== 'all') {
        if (m.moods.indexOf(opts.mood) !== -1) score += 16;
        else score -= 10;
      }

      // 5) 두께 취향
      if (opts.volume === 'slim' && m.thickness[1] <= 1.8) score += 8;
      if (opts.volume === 'bold' && m.thickness[1] >= 2.2) score += 8;

      // 6) 같은 일주라도 매번 다른 조합이 나오도록 하는 흔들림 (최대 26점)
      //    "다시 추천받기"를 누를 때마다 seed가 바뀌어 라인업이 달라집니다.
      score += rand() * 26;

      return { model: m, score: score, reasons: reasons };
    });

    scored.sort(function (a, b) { return b.score - a.score; });

    // 한 계열이 전부를 차지하지 않도록 계열당 최대 2개까지만 상위에 배치
    var picked = [], perFamily = {};
    scored.forEach(function (s) {
      if (picked.length >= limit) return;
      var f = s.model.family;
      perFamily[f] = perFamily[f] || 0;
      if (perFamily[f] < 2) { perFamily[f]++; picked.push(s); }
    });
    scored.forEach(function (s) {
      if (picked.length >= limit) return;
      if (picked.indexOf(s) === -1) picked.push(s);
    });

    var top = picked[0] ? picked[0].score : 1;
    return picked.map(function (s, i) {
      return {
        model: s.model,
        family: FAMILIES[s.model.family],
        rank: i + 1,
        fit: Math.max(58, Math.min(99, Math.round(60 + (s.score / top) * 38))),
        reason: s.reasons.slice(0, 2).join(' · ') || '온명이 제안하는 기본 밸런스 디자인',
        spec: defaultSpec(s.model, record, opts)
      };
    });
  }

  /** 모델 + 일주로 스튜디오에 넘길 기본 사양을 만든다 */
  function defaultSpec(model, record, opts) {
    opts = opts || {};
    var w = model.width[1], t = model.thickness[1];
    if (opts.volume === 'slim') { w = (model.width[0] + w) / 2; t = (model.thickness[0] + t) / 2; }
    if (opts.volume === 'bold') { w = (model.width[2] + w) / 2; t = (model.thickness[2] + t) / 2; }
    var stone = (record && record.stones && record.stones[0]) ? record.stones[0][0] : null;

    /* 디자인이 정해 둔 고정 방식에 맞춰 원석 종류를 고릅니다.
     *   테두리로 감싸는 자리 → 일주의 추천 원석(캐보션)
     *   발로 물거나 묻는 자리 → 모이사나이트 2.0mm
     * 천연석 캐보션은 감싸는 방식으로만 물릴 수 있어서 이렇게 나눕니다. */
    var stoneType = 'none';
    if (model.setting === 'flush') stoneType = 'moissanite';
    else if (model.setting && model.setting !== 'none' && stone) stoneType = 'natural';

    var base = {
      modelId: model.id,
      modelName: model.name,
      family: model.family,
      profile: model.profile,
      texture: model.texture,
      // 디자인이 정해 둔 물림 방식을 먼저 쓰고, 그 원석에 안 되는 방식이면 가능한 것으로 바꿉니다
      setting: stoneType === 'none' ? 'none'
        : (settingsFor(stoneType).indexOf(model.setting) !== -1 ? model.setting : settingsFor(stoneType)[0]),
      width: round1(w),
      thickness: round1(t),
      size: 13,
      metal: opts.metal || 'silver925',
      grain: 'vertical',      // 사포바를 골랐을 때 줄 방향
      plateSize: 1,           // 인장 판 크기 (0.5~1.8)
      backThickness: 0,       // 0 = 앞뒤 같은 두께. 값을 주면 손바닥 쪽이 그만큼 얇아집니다
      organic: 0,             // 왁스를 손으로 깎았을 때의 불규칙한 굴곡 (0~1)
      sculpt: '',             // 손으로 민 두께 자국 (아래 SCULPT 참고)
      sculptW: '',            // 손으로 민 폭 자국
      engrave: '',            // 도안 새기기 (둘레 48 × 폭 8 격자)
      stoneAt: '',            // 돌을 놓은 자리들 (도, 쉼표로 구분)
      stars: '',              // 별 조각을 새긴 자리들 ('각도_크기', 쉼표로 구분)
      starSize: 3,            // 새로 놓을 별 조각의 지름 (mm)
      draw: '',               // 검정 브러쉬로 그린 선들 (아래 DRAW 참고)
      drawSize: 0.8,          // 브러쉬 굵기 (mm)
      matte: '',              // 부분 무광으로 칠한 자리
      stoneHeight: 0,         // 돌을 얼마나 올리고 내릴지 (mm)
      stoneAngle: 0,          // 돌을 반지 둘레 어디에 앉힐지 (도). 0 = 손등 쪽 한가운데
      stoneCount: 1,          // 돌 개수. 2개 이상이면 둘레에 고르게 나눠 앉힙니다
      epoxyLines: 1,          // 색을 채울 홈 줄 수 (1~3)
      plating: 'none',
      oxidize: false,         // 유화 — 도금과 같이 못 합니다
      epoxy: '',
      epoxyCoverage: 'part',
      cubicColor: '',         // 컬러큐빅 색 (상담에서 확정)
      wave: model.wave, twist: model.twist, taper: model.taper, facets: model.facets,
      stoneType: stoneType,
      stone: stoneType === 'natural' ? stone : null,
      stoneSize: stoneType === 'none' ? 0 : CONFIG.stones[stoneType].sizes[1].mm,
      stoneShape: 'round',
      engraving: '',
      ilju: record ? record.id : null
    };

    /* 디자인이 "이건 이렇게 만들어야 그 디자인"이라고 정해 둔 값들.
     * (예: 능선은 유화를 해야 골이 살고, 넝쿨은 오벌 알이 기본입니다) */
    if (model.preset) {
      Object.keys(model.preset).forEach(function (k) { base[k] = model.preset[k]; });
      if (base.backThickness && base.backThickness > base.thickness) base.backThickness = base.thickness;
    }
    return base;
  }

  function round1(v) { return Math.round(v * 10) / 10; }

  /* ────────────────────────── 호수 · 가격 ────────────────────────── */

  /** 한국 호수 → 내경 지름(mm). 둘레 = 40.3 + (호수-1) mm 기준 */
  function sizeToInnerDiameter(size) {
    return (40.3 + (Number(size) - 1)) / Math.PI;
  }

  /**
   * 치수가 상담으로 넘겨야 할 만큼 두꺼운지
   * 이 선을 넘으면 은 사용량과 세공 난이도가 확 달라져서 자동 계산이 맞지 않습니다.
   */
  function needsConsult(spec) {
    var lim = CONFIG.price.consultAbove;
    if (!lim) return null;
    if (spec.width > lim.width) {
      return '폭 ' + lim.width + 'mm가 넘는 반지는 자동 계산으로 값이 나오지 않습니다.';
    }
    if (spec.thickness > lim.thickness) {
      return '두께 ' + lim.thickness + 'mm가 넘는 반지는 자동 계산으로 값이 나오지 않습니다.';
    }
    return null;
  }

  /**
   * 예상가 계산 (원). 최종 금액은 상담에서 확정됩니다.
   * 돌려주는 값
   *   unit / total  숫자 (상담으로 넘어가는 경우에는 null)
   *   consult       상담이 필요한 이유 (없으면 null)
   *   pending[]     값을 아직 못 매기는 항목 (예: 컬러큐빅)
   */
  function estimatePrice(spec, quantity) {
    var P = CONFIG.price;
    var model = MODELS.filter(function (m) { return m.id === spec.modelId; })[0];
    if (!model) return null;
    var metal = P.metals[spec.metal] || P.metals['silver925'];
    var qty = Math.max(1, Number(quantity) || 1);

    // 너무 두꺼우면 값을 매기지 않고 상담으로 넘긴다
    var consult = needsConsult(spec);
    if (consult) {
      return {
        unit: null, total: null, quantity: qty,
        consult: consult, pending: [], metalLabel: metal.label
      };
    }

    /* 디자인 기본가는 "그 디자인의 기본 치수까지" 포함한 값입니다.
     * 손님이 기본보다 키운 만큼만 추가 요금이 붙습니다.
     * (그래서 추천 화면에 뜨는 값은 항상 디자인 기본가 그대로입니다.) */
    var baseW = model.width ? model.width[1] : P.baseWidth;
    var baseT = model.thickness ? model.thickness[1] : P.baseThickness;
    var base = model.basePrice;
    var extraW = Math.max(0, spec.width - baseW) * P.perWidthMm;
    var extraT = Math.max(0, spec.thickness - baseT) * P.perThicknessMm;

    /* 원석 값. 물리는 공임은 원석 값에 포함돼 있어 따로 더하지 않습니다.
     * 컬러큐빅은 색과 크기를 상담에서 정하므로 값을 비워 둡니다. */
    var stoneCost = 0, pending = [];
    var kind = CONFIG.stones[spec.stoneType];
    if (kind && kind.sizes) {
      stoneCost = sizePrice(spec.stoneType, spec.stoneSize, spec.stoneShape);
      if (stoneCost == null) { pending.push(kind.label + ' 값'); stoneCost = 0; }
      stoneCost *= stoneAngles(spec).length;                     // 놓은 알 개수만큼
    }
    var setting = P.setting[spec.setting] || 0;

    /* 도금과 유화는 같이 못 하므로 둘 중 하나만 더해집니다 */
    var plating = (CONFIG.plating[spec.plating || 'none'] || {}).price || 0;
    var oxidize = spec.oxidize ? CONFIG.oxidize.price : 0;
    var epoxy = spec.epoxy ? epoxyPrice(spec) : 0;
    var engrave = spec.engraving ? P.engraving : 0;

    var one = (base + extraW + extraT) * metal.mult +
      stoneCost + setting + plating + oxidize + epoxy + engrave;
    var total = one * qty;
    if (qty >= 2) total *= (1 - P.couplePairDiscount);

    return {
      unit: Math.round(one / 1000) * 1000,
      quantity: qty,
      total: Math.round(total / 1000) * 1000,
      consult: null,
      pending: pending,
      metalLabel: metal.label
    };
  }

  /** 예상가를 화면에 그대로 쓸 수 있는 한 줄로 */
  function priceText(price, which) {
    if (!price) return '-';
    if (price.consult) return '상담 후 확정';
    var n = formatKRW(which === 'total' ? price.total : price.unit);
    if (price.pending && price.pending.length) n += ' + ' + price.pending.join(' · ') + ' (상담)';
    return n;
  }

  function formatKRW(n) {
    if (n === null || n === undefined) return '-';
    return n.toLocaleString('ko-KR') + '원';
  }

  /* ────────────────────── 2D 미리보기 (SVG) ────────────────────── */

  /* 화면에 나가는 말은 전문용어 대신 보이는 그대로 씁니다.
   * 뒤의 괄호는 공방에서 쓰는 원래 용어라, 상담할 때 서로 헷갈리지 않습니다. */
  var PROFILE_LABEL = {
    flat:   '납작한 면 (플랫)',
    round:  '둥근 면 (라운드)',
    dshape: '안쪽 평평 · 바깥 둥근 (D형)',
    knife:  '가운데가 솟은 (나이프)',
    wave:   '물결치는 (웨이브)',
    facet:  '각이 진 (패싯)',
    step:   '층이 진 (스텝)',
    signet: '손등 쪽만 부푼 판 (인장)'
  };
  /* 겉면 마감은 실제로 만들 수 있는 다섯 가지만 둡니다. */
  var TEXTURE_LABEL = {
    diamond: '다이아 텍스쳐 — 거칠게 깎아 반짝이는',
    sandbar: '사포바 — 결이 보이는 무광',
    fine:    '고운 무광',
    soft:    '은은한 무광',
    polish:  '유광 — 거울처럼 반짝이는'
  };
  var TEXTURE_DESC = {
    diamond: '날로 잘게 깎아 낸 면이 빛을 여러 갈래로 튕겨 냅니다. 손에 닿는 느낌은 거칠고, 눈에는 가장 반짝입니다.',
    sandbar: '사포로 한 방향으로 갈아 낸 결. 줄 방향을 세로와 가로 중에 고를 수 있습니다.',
    fine:    '아주 곱게 눌러 낸 무광. 잔기스가 잘 안 보이고 차분합니다.',
    soft:    '빛을 살짝 머금는 정도의 옅은 무광. 유광과 무광의 중간쯤입니다.',
    polish:  '거울처럼 비치게 올린 광. 가장 환하지만 잔기스도 가장 잘 보입니다.'
  };
  /* 사포바만 줄 방향을 고릅니다 */
  var GRAIN_LABEL = { vertical: '세로줄', horizontal: '가로줄' };

  /** 겉면 마감을 한 줄로 — 사포바는 줄 방향까지 붙입니다 */
  function textureLabel(spec) {
    var base = TEXTURE_LABEL[spec.texture] || spec.texture;
    if (spec.texture === 'sandbar') {
      return base + ' · ' + (GRAIN_LABEL[spec.grain] || GRAIN_LABEL.vertical);
    }
    return base;
  }
  var SETTING_LABEL = {
    none:  '원석 없이',
    bezel: '테두리로 감싸 누른 (베젤)',
    seat:  '자리를 파고 심어 넣은 (심기)',
    prong: '발로 물어 올린 (프롱)',
    flush: '표면에 묻은 매립 (우물 세팅)'
  };
  var SETTING_DESC = {
    bezel: '돌 둘레를 금속 테두리가 한 바퀴 감싸 눌러 줍니다. 가장 튼튼하고 걸림이 적습니다.',
    seat:  '돌이 앉을 자리를 파낸 뒤 그 홈에 심어 접착으로 고정합니다. 가장 낮게 앉아 손에 안 걸립니다.',
    prong: '발 네 개를 세워 돌 허리를 물어 올립니다. 돌이 높이 떠서 빛을 많이 받습니다.',
    flush: '표면에 우물을 파 돌을 넣고 둘레 금속을 밀어 덮습니다. 윗면이 반지와 거의 같은 높이입니다.'
  };
  var STONE_TYPE_LABEL = {
    none: '원석 없이', moissanite: '모이사나이트', natural: '천연석', cubic: '컬러큐빅'
  };

  /** 도금까지 반영한 실제 금속 색 */
  function metalColor(spec) {
    var plating = CONFIG.plating[spec.plating || 'none'];
    if (plating && spec.plating && spec.plating !== 'none') return plating.color;
    var metal = CONFIG.price.metals[spec.metal] || CONFIG.price.metals['silver925'];
    return metal.color;
  }

  /** 지금 사양의 원석 색 (없으면 null) */
  function stoneColorOf(spec) {
    if (spec.stoneType === 'moissanite') return CONFIG.stones.moissanite.color;
    if (spec.stoneType === 'natural' && spec.stone) return ONM.STONE_COLOR[spec.stone] || '#7a8b9c';
    if (spec.stoneType === 'cubic') {
      return CONFIG.stones.cubic.colors[spec.cubicColor] || CONFIG.stones.cubic.colors['살몬'];
    }
    return null;
  }

  /** 지금 사양의 원석 지름(mm) */
  function stoneMm(spec) {
    var kind = CONFIG.stones[spec.stoneType];
    if (!kind) return 0;
    var mm = Number(spec.stoneSize);
    if (!isNaN(mm) && mm > 0) return mm;
    return kind.mm || (kind.sizes ? kind.sizes[0].mm : 0);
  }

  /** 그 종류·그 크기의 원석 값. 값이 정해지지 않았으면 null (= 상담) */
  function sizePrice(stoneType, mm, shape) {
    var kind = CONFIG.stones[stoneType];
    if (!kind || !kind.sizes) return 0;
    // 오벌 캐보션은 6×8mm 한 규격뿐이라 값도 하나입니다
    if ((shape === 'oval' || shape === 'ovalH') && kind.ovalPrice != null) return kind.ovalPrice;
    var want = Number(mm);
    var pick = kind.sizes.filter(function (z) { return Math.abs(z.mm - want) < 0.01; })[0];
    if (!pick) pick = kind.sizes[Math.min(1, kind.sizes.length - 1)];
    return pick.price == null ? null : pick.price;
  }

  /** 손으로 손댄 흔적이 하나라도 있는가 */
  function hasSculpt(spec) {
    return !!(spec.sculpt || spec.sculptW || spec.matte || spec.engrave ||
      spec.stoneAt || spec.stars || spec.draw);
  }

  /** 색 채움 값 — 부분만 채우는지 한 바퀴 다 두르는지로 갈립니다 */
  function epoxyPrice(spec) {
    if (!spec.epoxy) return 0;
    var cov = CONFIG.epoxy.coverage[spec.epoxyCoverage || 'part'];
    var base = cov ? cov.price : CONFIG.epoxy.price;
    // 줄이 늘면 그만큼 파고 채우는 품이 늘어납니다 (두 줄째부터 절반씩)
    var lines = Math.max(1, Math.min(3, Number(spec.epoxyLines) || 1));
    return Math.round(base * (1 + (lines - 1) * 0.5) / 1000) * 1000;
  }

  /** 그 종류가 고를 수 있는 크기 목록 */
  function sizesFor(stoneType) {
    var kind = CONFIG.stones[stoneType];
    return (kind && kind.sizes) || [];
  }

  /** 이 원석에 쓸 수 있는 고정 방식 (천연석 캐보션은 감싸는 방식만) */
  function settingsFor(stoneType) {
    var kind = CONFIG.stones[stoneType];
    return (kind && kind.settings) || ['none'];
  }

  /** 원석을 사람이 읽는 한 줄로 */
  function stoneLabel(spec) {
    var n = stoneAngles(spec).length;
    if (n > 1) return stoneLabelOne(spec) + ' × ' + n + '개';
    return stoneLabelOne(spec);
  }

  function stoneLabelOne(spec) {
    if (spec.stoneType === 'moissanite') {
      return '모이사나이트 ' + stoneMm(spec).toFixed(1) + 'mm (라운드)';
    }
    if (spec.stoneType === 'natural' && spec.stone) {
      var N = CONFIG.stones.natural;
      if (spec.stoneShape === 'oval' || spec.stoneShape === 'ovalH') {
        var lay = spec.stoneShape === 'ovalH' ? '가로' : '세로';
        var a = spec.stoneShape === 'ovalH' ? N.ovalMm.h : N.ovalMm.w;
        var bq = spec.stoneShape === 'ovalH' ? N.ovalMm.w : N.ovalMm.h;
        return spec.stone + ' ' + a + '×' + bq + 'mm (오벌 캐보션 · ' + lay + ')';
      }
      return spec.stone + ' ' + stoneMm(spec).toFixed(1) + 'mm (라운드 캐보션)';
    }
    if (spec.stoneType === 'cubic') {
      return '컬러큐빅 ' + (spec.cubicColor || '색 상담') + ' ' + stoneMm(spec).toFixed(1) + 'mm';
    }
    return '원석 없이';
  }

  /** 도금과 유화는 같이 못 합니다. 둘 중 하나만 남기고 정리합니다. */
  function normalizeFinish(spec) {
    if (spec.oxidize && spec.plating && spec.plating !== 'none') spec.plating = 'none';
    return spec;
  }

  /**
   * 카드용 2D 미리보기. 실제 비율(호수/폭/두께)을 반영해 그립니다.
   * 3D 스튜디오와 같은 수치를 쓰기 때문에 카드와 스튜디오가 어긋나지 않습니다.
   */
  function ringSvg(spec, opts) {
    opts = opts || {};
    var size = opts.size || 180;
    var baseColor = metalColor(spec);            // 도금까지 반영한 금속 색
    var stoneColor = stoneColorOf(spec);

    var innerD = sizeToInnerDiameter(spec.size || 13);
    var outerD = innerD + spec.thickness * 2;
    var scale = (size * 0.78) / outerD;
    var cx = size / 2, cy = size / 2;
    var rOut = outerD / 2 * scale;
    var rIn = innerD / 2 * scale;
    var uid = 'rg' + Math.random().toString(36).slice(2, 8);

    var parts = [];
    parts.push('<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="100%" role="img" aria-label="' +
      esc(spec.modelName || '반지') + ' 미리보기" xmlns="http://www.w3.org/2000/svg">');
    parts.push('<defs>');
    /* 마감마다 반사가 다른 만큼 전체 톤을 눌러 준다.
     *   유광    가장 환하게
     *   다이아  깎인 면이 빛을 튕겨 유광에 가깝게
     *   사포바  결 때문에 한 단계 차분하게
     *   고운/은은한 무광  가장 눌러서 */
    var TONE = { polish: 1, diamond: 0.97, sandbar: 0.9, fine: 0.84, soft: 0.88 };
    var tone = TONE[spec.texture] || 1;
    parts.push('<linearGradient id="' + uid + 'g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' + shade(baseColor, 1.18 * tone) + '"/>' +
      '<stop offset="45%" stop-color="' + shade(baseColor, tone) + '"/>' +
      '<stop offset="100%" stop-color="' + shade(baseColor, 0.55 * tone) + '"/></linearGradient>');

    // 다이아 텍스쳐만 면이 실제로 파여 있으므로 표면을 흔들어 준다
    var rough = spec.texture === 'diamond';
    if (rough) {
      parts.push('<filter id="' + uid + 'f"><feTurbulence type="fractalNoise" baseFrequency="0.3"' +
        ' numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="1.1"/></filter>');
    }
    // 사포바는 한 방향으로만 결이 갑니다
    if (spec.texture === 'sandbar') {
      var horizontal = spec.grain === 'horizontal';
      parts.push('<pattern id="' + uid + 'p" width="' + (horizontal ? 6 : 2) + '" height="' +
        (horizontal ? 2 : 6) + '" patternUnits="userSpaceOnUse">' +
        '<rect width="' + (horizontal ? 6 : 1) + '" height="' + (horizontal ? 1 : 6) +
        '" fill="#ffffff" fill-opacity="0.12"/></pattern>');
    }
    parts.push('</defs>');

    var bandAttrs = 'fill="none" stroke="url(#' + uid + 'g)" stroke-width="' + (rOut - rIn) + '"';
    var filter = rough ? ' filter="url(#' + uid + 'f)"' : '';

    // 반지는 금속이라 절대 비쳐 보이면 안 된다.
    // 무광을 표현할 때도 투명도를 쓰지 않고 색만 눌러서 그린다.
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((rOut + rIn) / 2) + '" ' + bandAttrs + filter + '/>');

    // 사포바의 결을 밴드 위에 겹쳐 얹는다
    if (spec.texture === 'sandbar') {
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((rOut + rIn) / 2) +
        '" fill="none" stroke="url(#' + uid + 'p)" stroke-width="' + (rOut - rIn) + '"/>');
    }

    // 하이라이트 — 유광일수록 강하게
    var HL = { polish: 0.5, diamond: 0.34, sandbar: 0.2, soft: 0.16, fine: 0.11 };
    var hl = HL[spec.texture] !== undefined ? HL[spec.texture] : 0.14;
    parts.push('<path d="M ' + (cx - rOut * 0.72) + ' ' + (cy - rOut * 0.52) +
      ' A ' + rOut + ' ' + rOut + ' 0 0 1 ' + (cx + rOut * 0.3) + ' ' + (cy - rOut * 0.9) + '" ' +
      'fill="none" stroke="#ffffff" stroke-opacity="' + hl + '" stroke-width="' + Math.max(1.2, (rOut - rIn) * 0.28) + '" stroke-linecap="round"/>');

    // 패싯 / 스텝 표현
    if (spec.profile === 'facet' && spec.facets) {
      for (var i = 0; i < spec.facets; i++) {
        var a = (i / spec.facets) * Math.PI * 2;
        parts.push('<line x1="' + (cx + Math.cos(a) * rIn) + '" y1="' + (cy + Math.sin(a) * rIn) +
          '" x2="' + (cx + Math.cos(a) * rOut) + '" y2="' + (cy + Math.sin(a) * rOut) +
          '" stroke="#000" stroke-opacity="0.18" stroke-width="0.8"/>');
      }
    }
    if (spec.profile === 'step') {
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (rIn + (rOut - rIn) * 0.62) +
        '" fill="none" stroke="#000" stroke-opacity="0.14" stroke-width="0.9"/>');
    }

    // 원석 — 모이사나이트는 각이 살아 있는 라운드 컷, 천연석은 둥근 캐보션
    if (stoneColor) {
      var mm = stoneMm(spec);
      var sr = Math.max(3.4, mm * scale / 2);
      var sy = cy - (rOut + rIn) / 2;
      var rim = shade(baseColor, 0.7);

      if (spec.stoneType === 'moissanite') {
        parts.push('<circle cx="' + cx + '" cy="' + sy + '" r="' + sr +
          '" fill="' + stoneColor + '" stroke="' + rim + '" stroke-width="0.8"/>');
        // 컷 면을 나타내는 방사선과 테이블
        for (var fi = 0; fi < 8; fi++) {
          var fa = (fi / 8) * Math.PI * 2 + Math.PI / 8;
          parts.push('<line x1="' + (cx + Math.cos(fa) * sr * 0.42) + '" y1="' + (sy + Math.sin(fa) * sr * 0.42) +
            '" x2="' + (cx + Math.cos(fa) * sr) + '" y2="' + (sy + Math.sin(fa) * sr) +
            '" stroke="#8fa3b8" stroke-opacity="0.5" stroke-width="0.6"/>');
        }
        parts.push('<circle cx="' + cx + '" cy="' + sy + '" r="' + (sr * 0.42) +
          '" fill="#ffffff" fill-opacity="0.55"/>');
      } else {
        // 캐보션 — 각 없이 매끈하게 부푼 돔
        parts.push('<circle cx="' + cx + '" cy="' + sy + '" r="' + sr +
          '" fill="' + stoneColor + '" stroke="' + rim + '" stroke-width="1.6"/>');
        parts.push('<ellipse cx="' + (cx - sr * 0.28) + '" cy="' + (sy - sr * 0.3) +
          '" rx="' + (sr * 0.3) + '" ry="' + (sr * 0.22) + '" fill="#ffffff" fill-opacity="0.42"/>');
      }

      if (spec.setting === 'prong') {
        for (var pi = 0; pi < 4; pi++) {
          var pa = (pi / 4) * Math.PI * 2 + Math.PI / 4;
          parts.push('<line x1="' + (cx + Math.cos(pa) * sr * 0.72) + '" y1="' + (sy + Math.sin(pa) * sr * 0.72) +
            '" x2="' + (cx + Math.cos(pa) * sr * 1.14) + '" y2="' + (sy + Math.sin(pa) * sr * 1.14) +
            '" stroke="' + shade(baseColor, 0.85) + '" stroke-width="1.6" stroke-linecap="round"/>');
        }
      }
    }

    // 밝은 크림 배경에서도 반지 윤곽이 또렷하게 보이도록 가는 외곽선을 더한다
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + rOut +
      '" fill="none" stroke="rgba(60,54,44,.22)" stroke-width="0.9"/>');
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + rIn +
      '" fill="none" stroke="rgba(60,54,44,.18)" stroke-width="0.9"/>');

    parts.push('</svg>');
    return parts.join('');
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    var b = Math.min(255, Math.round((n & 255) * f));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 사양을 사람이 읽는 한 줄로 */
  function describeSpec(spec) {
    var metal = CONFIG.price.metals[spec.metal] || CONFIG.price.metals['silver925'];
    var bits = [
      spec.modelName,
      metal.label,
      spec.size + '호',
      '폭 ' + spec.width + 'mm',
      '두께 ' + spec.thickness + 'mm',
      PROFILE_LABEL[spec.profile] || spec.profile,
      textureLabel(spec)
    ];
    if (spec.stoneType && spec.stoneType !== 'none') {
      bits.push(stoneLabel(spec) + ' · ' + SETTING_LABEL[spec.setting]);
    }
    if (spec.plating && spec.plating !== 'none') bits.push((CONFIG.plating[spec.plating] || {}).label);
    if (spec.oxidize) bits.push(CONFIG.oxidize.label);
    if (spec.epoxy) bits.push('색 채움 ' + ((CONFIG.epoxy.colors[spec.epoxy] || {}).label || spec.epoxy));
    if (spec.engraving) bits.push('각인 "' + spec.engraving + '"');
    return bits.join(' / ');
  }

  /* ──────────────── 손으로 다듬은 자국 ────────────────
   * 반지를 한 바퀴 도는 동안 24 지점의 두께를 얼마나 밀고 당겼는지 담습니다.
   * 주소에 실어야 하므로 값 하나를 글자 하나로 줄여 둡니다.
   *   0~35 → '0'~'9','a'~'z' (18 이 기준, 그보다 크면 두껍게)
   */
  /* ── 도안 새기기 ──
   * 둘레 48칸 × 폭 8칸 격자에 "얼마나 깊게 팠는지"를 담습니다.
   * 0 = 안 팜, 35 = 가장 깊게. 24지점 자국과 달리 폭 방향으로도 나뉘어서
   * 반지 윗면 일부에만 무늬를 새길 수 있습니다. */
  var ENGRAVE_X = 48, ENGRAVE_Y = 8;
  var SCULPT_MAX = 35;
  var SCULPT_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

  function engraveRead(str) {
    var n = ENGRAVE_X * ENGRAVE_Y, out = new Array(n);
    for (var i = 0; i < n; i++) {
      var c = str && str.charAt(i) ? SCULPT_CHARS.indexOf(str.charAt(i)) : 0;
      out[i] = c < 0 ? 0 : c / SCULPT_MAX;
    }
    return out;
  }

  function engraveWrite(arr) {
    var any = false, out = '';
    for (var i = 0; i < arr.length; i++) {
      var c = Math.max(0, Math.min(SCULPT_MAX, Math.round((arr[i] || 0) * SCULPT_MAX)));
      if (c > 0) any = true;
      out += SCULPT_CHARS.charAt(c);
    }
    return any ? out : '';
  }

  /* ── 별 조각 ──
   * 조각칼로 별을 새기는 마감입니다. 알을 놓는 것처럼 자리를 짚어 놓고,
   * 별마다 크기(지름 mm)를 따로 가집니다.
   * 주소에는 '각도_크기' 를 쉼표로 이어 담습니다. 예: 0_3,40_2.2
   */
  var STAR_MIN = 1.5, STAR_MAX = 6;

  function starList(spec) {
    if (!spec.stars) return [];
    return String(spec.stars).split(',').map(function (piece) {
      var bits = piece.split('_');
      var a = parseFloat(bits[0]);
      var mm = parseFloat(bits[1]);
      if (isNaN(a)) return null;
      if (isNaN(mm)) mm = 3;
      return { angle: a, size: Math.max(STAR_MIN, Math.min(STAR_MAX, mm)) };
    }).filter(Boolean).slice(0, 8);
  }

  function starWrite(list) {
    if (!list || !list.length) return '';
    return list.map(function (st) {
      return Math.round(st.angle) + '_' + (Math.round(st.size * 10) / 10);
    }).join(',');
  }

  /** 돌을 놓은 자리들(도 단위). 비어 있으면 개수대로 고르게 나눠 앉힙니다 */
  function stoneAngles(spec) {
    if (spec.stoneAt) {
      var list = String(spec.stoneAt).split(',').map(function (v) { return parseFloat(v); })
        .filter(function (v) { return !isNaN(v); });
      if (list.length) return list;
    }
    var n = Math.max(1, Math.min(8, Number(spec.stoneCount) || 1));
    var base = Number(spec.stoneAngle) || 0;
    var out = [];
    for (var i = 0; i < n; i++) out.push(base + (n > 1 ? (i / n) * 360 : 0));
    return out;
  }

  /* ── 검정 브러쉬로 그리기 ──
   * 금속을 파는 것이 아니라 겉면에 검게 칠하는 층입니다.
   * 그은 선을 점으로 담아 두었다가 반지 표면에 그대로 그려 넣습니다.
   *
   * 주소에 실어야 하므로 한 점을 세 글자로 줄입니다.
   *   앞 두 글자 = 둘레 각도 (0~1079, 1/3도 단위)
   *   뒤 한 글자 = 폭 방향 위치 (0~35)
   * 선 하나는 [굵기 한 글자][점들] 이고, 선과 선은 '-' 로 나눕니다.
   */
  var DRAW_ANG = 1080;
  var DRAW_MAX_LEN = 6000;

  function enc2(n) {
    n = Math.max(0, Math.min(1295, Math.round(n)));
    return SCULPT_CHARS.charAt(Math.floor(n / 36)) + SCULPT_CHARS.charAt(n % 36);
  }
  function dec2(str, i) {
    var a = SCULPT_CHARS.indexOf(str.charAt(i)), b = SCULPT_CHARS.indexOf(str.charAt(i + 1));
    if (a < 0 || b < 0) return -1;
    return a * 36 + b;
  }

  /** 그린 선들 → [{ width: mm, pts: [{ deg, v }] }] */
  function drawStrokes(spec) {
    if (!spec.draw) return [];
    return String(spec.draw).split('-').map(function (chunk) {
      if (chunk.length < 4) return null;
      var w = SCULPT_CHARS.indexOf(chunk.charAt(0));
      if (w < 0) w = 5;
      var pts = [];
      for (var i = 1; i + 3 <= chunk.length; i += 3) {
        var a = dec2(chunk, i);
        var c = SCULPT_CHARS.indexOf(chunk.charAt(i + 2));
        if (a < 0 || c < 0) continue;
        pts.push({ deg: (a / DRAW_ANG) * 360, v: c / 35 - 0.5 });
      }
      if (!pts.length) return null;
      return { width: 0.3 + w * 0.1, pts: pts };
    }).filter(Boolean);
  }

  function drawWrite(list) {
    if (!list || !list.length) return '';
    var out = list.map(function (st) {
      var w = Math.max(0, Math.min(35, Math.round(((st.width || 0.8) - 0.3) / 0.1)));
      var s = SCULPT_CHARS.charAt(w);
      for (var i = 0; i < st.pts.length; i++) {
        var deg = st.pts[i].deg;
        var a = Math.round((((deg % 360) + 360) % 360) / 360 * DRAW_ANG) % DRAW_ANG;
        var c = Math.max(0, Math.min(35, Math.round((st.pts[i].v + 0.5) * 35)));
        s += enc2(a) + SCULPT_CHARS.charAt(c);
      }
      return s;
    }).filter(function (s) { return s.length >= 4; }).join('-');
    return out.slice(0, DRAW_MAX_LEN);
  }

  var SCULPT_N = 24;
  var SCULPT_MID = 18;

  /** 글자열 → -1~1 숫자 배열. 비어 있으면 전부 0 */
  function sculptRead(str) {
    var out = new Array(SCULPT_N);
    for (var i = 0; i < SCULPT_N; i++) {
      var c = str && str.charAt(i) ? SCULPT_CHARS.indexOf(str.charAt(i)) : SCULPT_MID;
      if (c < 0) c = SCULPT_MID;
      out[i] = (c - SCULPT_MID) / SCULPT_MID;
    }
    return out;
  }

  /** -1~1 숫자 배열 → 글자열. 전부 0이면 빈 문자열(주소에서 빠집니다) */
  function sculptWrite(arr) {
    var any = false, out = '';
    for (var i = 0; i < SCULPT_N; i++) {
      var v = Math.max(-1, Math.min(1, arr[i] || 0));
      var c = Math.round(SCULPT_MID + v * SCULPT_MID);
      c = Math.max(0, Math.min(SCULPT_MAX, c));
      if (c !== SCULPT_MID) any = true;
      out += SCULPT_CHARS.charAt(c);
    }
    return any ? out : '';
  }

  /* ──────────────── 페이지 간 사양 전달 (URL 쿼리) ──────────────── */

  var SPEC_KEYS = ['modelId', 'width', 'thickness', 'size', 'metal', 'texture', 'grain', 'profile',
    'plateSize', 'backThickness', 'organic', 'sculpt', 'sculptW', 'matte', 'engrave', 'stoneAt', 'stars', 'draw',
    'stoneHeight', 'stoneAngle', 'stoneCount', 'epoxyLines', 'setting', 'stoneType', 'stone', 'stoneSize', 'stoneShape', 'cubicColor', 'plating', 'oxidize', 'epoxy', 'epoxyCoverage',
    'engraving', 'ilju', 'qty'];

  /** 사양 → URL 쿼리 문자열 (리포트 → 스튜디오 → 주문으로 넘길 때 사용) */
  function specToQuery(spec, extra) {
    var q = [];
    SPEC_KEYS.forEach(function (k) {
      var v = spec[k];
      if (v === null || v === undefined || v === '' || v === false) return;
      // 지금 고른 원석과 상관없는 값은 주소에 싣지 않는다 (링크가 길어지고 헷갈립니다)
      if (k === 'cubicColor' && spec.stoneType !== 'cubic') return;
      if (k === 'grain' && spec.texture !== 'sandbar') return;
      if (k === 'stone' && spec.stoneType !== 'natural') return;
      if (k === 'stoneShape' && spec.stoneType !== 'natural') return;
      if (k === 'epoxyCoverage' && !spec.epoxy) return;
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    if (extra) Object.keys(extra).forEach(function (k) {
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(extra[k]));
    });
    return q.join('&');
  }

  /** URL 쿼리 → 사양. 모델을 찾을 수 없으면 기본 모델로 돌아갑니다. */
  function specFromQuery(search) {
    var p = new URLSearchParams(search || (typeof location !== 'undefined' ? location.search : ''));
    var model = ONM.rings.getModel(p.get('modelId')) || MODELS[0];
    var record = p.get('ilju') && ONM.ILJU ? ONM.ILJU[p.get('ilju')] : null;
    var spec = defaultSpec(model, record, { metal: p.get('metal') || undefined });
    ['width', 'thickness', 'size', 'plateSize', 'backThickness', 'organic',
     'stoneHeight', 'stoneAngle'].forEach(function (k) {
      var v = parseFloat(p.get(k));
      if (!isNaN(v)) spec[k] = v;
    });
    if (p.get('stoneType')) spec.stoneType = p.get('stoneType');
    if (p.get('stoneSize')) spec.stoneSize = parseFloat(p.get('stoneSize'));
    if (p.get('plating')) spec.plating = p.get('plating');
    if (p.has('oxidize')) spec.oxidize = p.get('oxidize') === 'true';
    if (p.has('epoxy')) spec.epoxy = p.get('epoxy') || '';
    if (p.get('epoxyCoverage')) spec.epoxyCoverage = p.get('epoxyCoverage');
    if (p.has('cubicColor')) spec.cubicColor = p.get('cubicColor') || '';
    if (p.get('stoneShape')) spec.stoneShape = p.get('stoneShape');
    if (p.get('sculpt')) spec.sculpt = p.get('sculpt').slice(0, SCULPT_N);
    if (p.get('sculptW')) spec.sculptW = p.get('sculptW').slice(0, SCULPT_N);
    if (p.get('matte')) spec.matte = p.get('matte').slice(0, SCULPT_N);
    if (p.get('engrave')) spec.engrave = p.get('engrave').slice(0, ENGRAVE_X * ENGRAVE_Y);
    if (p.has('stoneAt')) spec.stoneAt = p.get('stoneAt') || '';
    if (p.has('stars')) spec.stars = starWrite(starList({ stars: p.get('stars') || '' }));
    if (p.has('draw')) spec.draw = drawWrite(drawStrokes({ draw: p.get('draw') || '' }));
    if (p.get('stoneCount')) spec.stoneCount = Math.max(1, Math.min(8, parseInt(p.get('stoneCount'), 10) || 1));
    if (p.get('epoxyLines')) spec.epoxyLines = Math.max(1, Math.min(3, parseInt(p.get('epoxyLines'), 10) || 1));
    if (p.get('texture') && TEXTURE_LABEL[p.get('texture')]) spec.texture = p.get('texture');
    if (p.get('grain') && GRAIN_LABEL[p.get('grain')]) spec.grain = p.get('grain');
    if (p.get('profile')) spec.profile = p.get('profile');
    if (p.get('setting')) spec.setting = p.get('setting');
    if (p.has('stone')) spec.stone = p.get('stone') || null;
    if (p.get('engraving')) spec.engraving = p.get('engraving');
    if (p.get('ilju')) spec.ilju = p.get('ilju');
    spec.quantity = Math.max(1, parseInt(p.get('qty'), 10) || 1);
    return normalizeFinish(spec);
  }

  /** 슬라이더 범위를 모델 한계와 전체 한계 중 좁은 쪽으로 맞춘다 */
  function limitsFor(model, key) {
    var hard = CONFIG.limits[key];
    var m = model ? model[key] : null;
    return {
      min: m ? Math.max(hard.min, m[0]) : hard.min,
      max: m ? Math.min(hard.max, m[2]) : hard.max
    };
  }

  ONM.rings = {
    specToQuery: specToQuery,
    specFromQuery: specFromQuery,
    limitsFor: limitsFor,

    FAMILIES: FAMILIES,
    MODELS: MODELS,
    PROFILE_LABEL: PROFILE_LABEL,
    STONE_TYPE_LABEL: STONE_TYPE_LABEL,
    metalColor: metalColor,
    stoneColorOf: stoneColorOf,
    stoneMm: stoneMm,
    sizePrice: sizePrice,
    SCULPT_N: SCULPT_N,
    sculptRead: sculptRead,
    sculptWrite: sculptWrite,
    ENGRAVE_X: ENGRAVE_X,
    ENGRAVE_Y: ENGRAVE_Y,
    engraveRead: engraveRead,
    engraveWrite: engraveWrite,
    stoneAngles: stoneAngles,
    starList: starList,
    starWrite: starWrite,
    drawStrokes: drawStrokes,
    drawWrite: drawWrite,
    STAR_MIN: STAR_MIN,
    STAR_MAX: STAR_MAX,
    hasSculpt: hasSculpt,
    sizesFor: sizesFor,
    settingsFor: settingsFor,
    stoneLabel: stoneLabel,
    TEXTURE_LABEL: TEXTURE_LABEL,
    SETTING_LABEL: SETTING_LABEL,
    SETTING_DESC: SETTING_DESC,
    epoxyPrice: epoxyPrice,
    recommend: recommend,
    defaultSpec: defaultSpec,
    readStyleBias: readStyleBias,
    sizeToInnerDiameter: sizeToInnerDiameter,
    estimatePrice: estimatePrice,
    priceText: priceText,
    needsConsult: needsConsult,
    normalizeFinish: normalizeFinish,
    TEXTURE_DESC: TEXTURE_DESC,
    GRAIN_LABEL: GRAIN_LABEL,
    textureLabel: textureLabel,
    formatKRW: formatKRW,
    ringSvg: ringSvg,
    describeSpec: describeSpec,
    getModel: function (id) { return MODELS.filter(function (m) { return m.id === id; })[0] || null; },
    esc: esc
  };
})(typeof window !== 'undefined' ? window : globalThis);
