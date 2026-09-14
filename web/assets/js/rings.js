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
   * texture   : polish(유광) | matte(유화) | hammered(해머드) | sand(샌드) | brushed(브러시) | stone(스톤)
   * setting   : none | bezel(베젤) | inlay(인레이) | prong(프롱) | flush(플러시)
   * width     : [최소, 기본, 최대] mm — 반지의 "높이"(손가락을 감싸는 폭)
   * thickness : [최소, 기본, 최대] mm — 반지의 "두께"
   * elements  : 잘 맞는 오행
   * moods     : 데일리 | 시그니처 | 커플 | 선물
   */
  var MODELS = [
    // ── 거친 · 강인한 ─────────────────────────────────────────────
    { id: 'rugged-baseline', name: '암반', family: 'rugged', profile: 'flat', texture: 'stone', setting: 'none',
      width: [3, 5, 9], thickness: [1.6, 2.4, 4.0], wave: 0.12, twist: 0, taper: 0, facets: 0,
      elements: ['토', '금'], moods: ['시그니처', '데일리'], basePrice: 168000,
      tags: ['신념', '책임', '인내', '확고함', '안정', '우직'],
      desc: '거친 바위 표면을 그대로 옮긴 듯한 텍스처. 장식을 덜어낸 대신 표면 자체가 존재감이 됩니다.' },
    { id: 'rugged-forge', name: '단조', family: 'rugged', profile: 'step', texture: 'hammered', setting: 'none',
      width: [3.5, 5.5, 10], thickness: [1.8, 2.6, 4.2], wave: 0.2, twist: 0, taper: 0.1, facets: 0,
      elements: ['금', '토'], moods: ['시그니처'], basePrice: 186000,
      tags: ['결단', '강인', '개척', '추진력', '용기', '리더십'],
      desc: '망치 자국을 살린 단조 마감. 두드릴수록 단단해지는 금속의 성질을 형태로 남겼습니다.' },
    { id: 'rugged-fortress', name: '성곽', family: 'rugged', profile: 'step', texture: 'matte', setting: 'bezel',
      width: [4, 6, 10], thickness: [2.0, 2.8, 4.5], wave: 0, twist: 0, taper: 0, facets: 6,
      elements: ['토', '금'], moods: ['시그니처', '선물'], basePrice: 214000,
      tags: ['원칙', '의리', '책임감', '신의', '버팀목', '강직'],
      desc: '층을 이룬 각진 실루엣에 원석을 낮게 앉힌 구조. 지켜내는 성향을 그대로 담았습니다.' },
    { id: 'rugged-root', name: '뿌리', family: 'rugged', profile: 'wave', texture: 'sand', setting: 'none',
      width: [3, 4.5, 8], thickness: [1.6, 2.2, 3.6], wave: 0.35, twist: 0.15, taper: 0.1, facets: 0,
      elements: ['목', '토'], moods: ['데일리', '시그니처'], basePrice: 172000,
      tags: ['성장', '끈기', '꾸준함', '성실', '기반', '축적'],
      desc: '땅을 움켜쥔 뿌리의 결을 새긴 밴드. 시간이 쌓일수록 깊어지는 인상을 목표로 했습니다.' },
    { id: 'rugged-edge', name: '단애', family: 'rugged', profile: 'knife', texture: 'brushed', setting: 'none',
      width: [2.5, 4, 7], thickness: [1.4, 2.0, 3.4], wave: 0, twist: 0, taper: 0.25, facets: 0,
      elements: ['금'], moods: ['데일리', '시그니처'], basePrice: 158000,
      tags: ['냉철', '분석', '판단', '예리', '집중', '전략'],
      desc: '한쪽으로 날을 세운 나이프 엣지. 곧은 선이 손등 위에서 또렷한 인상을 만듭니다.' },

    // ── 유기적 · 유연한 ────────────────────────────────────────────
    { id: 'organic-stream', name: '유수', family: 'organic', profile: 'round', texture: 'polish', setting: 'none',
      width: [2.5, 4, 7], thickness: [1.2, 1.8, 3.0], wave: 0.3, twist: 0.1, taper: 0.15, facets: 0,
      elements: ['수', '목'], moods: ['데일리', '커플'], basePrice: 142000,
      tags: ['유연함', '지혜', '포용', '흐름', '조화', '통찰'],
      desc: '물결이 지나간 자리처럼 완만하게 흐르는 밴드. 손가락에 편안하게 감기는 착용감이 특징입니다.' },
    { id: 'organic-sprout', name: '새싹', family: 'organic', profile: 'wave', texture: 'matte', setting: 'inlay',
      width: [2.5, 4, 7], thickness: [1.2, 1.8, 3.0], wave: 0.45, twist: 0.2, taper: 0.2, facets: 0,
      elements: ['목', '수'], moods: ['데일리', '선물'], basePrice: 166000,
      tags: ['성장', '가능성', '변화', '기회', '순수', '적응력'],
      desc: '막 돋아난 잎의 곡선을 따라 폭이 변하는 형태. 가는 원석 인레이가 결을 따라 흐릅니다.' },
    { id: 'organic-tide', name: '조수', family: 'organic', profile: 'round', texture: 'hammered', setting: 'none',
      width: [3, 5, 9], thickness: [1.4, 2.2, 3.6], wave: 0.5, twist: 0, taper: 0, facets: 0,
      elements: ['수', '토'], moods: ['시그니처'], basePrice: 178000,
      tags: ['포용', '여유', '평온', '공감', '순환', '깊이'],
      desc: '밀물과 썰물처럼 표면이 일렁이는 해머드 마감. 각도에 따라 빛이 다르게 맺힙니다.' },
    { id: 'organic-breeze', name: '연풍', family: 'organic', profile: 'dshape', texture: 'brushed', setting: 'none',
      width: [2, 3, 5.5], thickness: [1.0, 1.5, 2.6], wave: 0.2, twist: 0.05, taper: 0.1, facets: 0,
      elements: ['목', '화'], moods: ['데일리', '커플'], basePrice: 128000,
      tags: ['다정', '배려', '온기', '섬세', '친화력', '소통'],
      desc: '가늘고 부드러운 D형 밴드. 매일 끼고도 부담 없는 두께로 설계했습니다.' },
    { id: 'organic-embrace', name: '포옹', family: 'organic', profile: 'wave', texture: 'polish', setting: 'bezel',
      width: [3, 4.5, 8], thickness: [1.4, 2.0, 3.2], wave: 0.4, twist: 0.3, taper: 0.15, facets: 0,
      elements: ['토', '수'], moods: ['선물', '커플'], basePrice: 196000,
      tags: ['화합', '사랑', '인연', '신뢰', '조화', '포용'],
      desc: '두 줄기가 서로를 감싸며 만나는 지점에 원석을 앉혔습니다. 관계를 상징하는 구조입니다.' },

    // ── 심플한 ────────────────────────────────────────────────────
    { id: 'minimal-line', name: '정선', family: 'minimal', profile: 'flat', texture: 'polish', setting: 'none',
      width: [1.5, 2.5, 5], thickness: [0.9, 1.4, 2.4], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['금', '수'], moods: ['데일리', '커플'], basePrice: 98000,
      tags: ['절제', '정돈', '완성', '균형', '단정', '품격'],
      desc: '덜어낼 것이 없는 평면 밴드. 비율과 마감만으로 완성도를 증명하는 기본형입니다.' },
    { id: 'minimal-still', name: '정적', family: 'minimal', profile: 'dshape', texture: 'matte', setting: 'none',
      width: [2, 3.5, 6], thickness: [1.1, 1.7, 2.8], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['토', '금'], moods: ['데일리'], basePrice: 112000,
      tags: ['차분', '안정', '신중', '내실', '꾸준함', '집중'],
      desc: '빛을 흡수하는 유화 마감의 D형 밴드. 조용한 무드가 오래 질리지 않습니다.' },
    { id: 'minimal-depth', name: '심연', family: 'minimal', profile: 'step', texture: 'brushed', setting: 'none',
      width: [2.5, 4, 7], thickness: [1.2, 1.9, 3.2], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['수', '금'], moods: ['데일리', '시그니처'], basePrice: 126000,
      tags: ['통찰', '깊이', '지혜', '성찰', '집중', '정밀'],
      desc: '한 단 낮춘 면이 만드는 그림자 선. 장식 없이 두께감만으로 깊이를 만듭니다.' },
    { id: 'minimal-vow', name: '언약', family: 'minimal', profile: 'round', texture: 'polish', setting: 'flush',
      width: [2, 3, 5], thickness: [1.1, 1.6, 2.6], wave: 0, twist: 0, taper: 0, facets: 0,
      elements: ['금', '토'], moods: ['커플', '선물'], basePrice: 148000,
      tags: ['약속', '신뢰', '신의', '성실', '책임', '지속성'],
      desc: '둥근 밴드에 원석을 표면과 같은 높이로 묻은 형태. 걸림 없이 매일 착용할 수 있습니다.' },
    { id: 'minimal-clarity', name: '청명', family: 'minimal', profile: 'knife', texture: 'polish', setting: 'none',
      width: [1.8, 2.8, 5], thickness: [1.0, 1.5, 2.4], wave: 0, twist: 0, taper: 0.2, facets: 0,
      elements: ['금', '화'], moods: ['데일리', '선물'], basePrice: 118000,
      tags: ['맑음', '완벽', '예리', '정교', '감각', '고결'],
      desc: '가운데로 얇게 선 능선이 빛을 한 줄로 모읍니다. 정교한 세공이 그대로 드러나는 형태입니다.' },

    // ── 개성있는 ──────────────────────────────────────────────────
    { id: 'signature-flare', name: '화염', family: 'signature', profile: 'facet', texture: 'polish', setting: 'prong',
      width: [3, 5, 9], thickness: [1.4, 2.2, 3.6], wave: 0.15, twist: 0.25, taper: 0.2, facets: 12,
      elements: ['화', '목'], moods: ['시그니처'], basePrice: 238000,
      tags: ['열정', '강렬', '개성', '표현', '창조성', '존재감'],
      desc: '불꽃이 솟아오르듯 면이 꺾이는 컷팅. 빛을 여러 방향으로 흩어 강한 인상을 남깁니다.' },
    { id: 'signature-orbit', name: '궤도', family: 'signature', profile: 'round', texture: 'polish', setting: 'bezel',
      width: [3, 4.5, 8], thickness: [1.4, 2.0, 3.4], wave: 0.25, twist: 0.6, taper: 0.1, facets: 0,
      elements: ['수', '금'], moods: ['시그니처', '선물'], basePrice: 226000,
      tags: ['변화', '기회', '수완', '재능', '순발', '자유'],
      desc: '한 바퀴 비틀리며 돌아가는 밴드 위에 원석이 궤도처럼 얹힙니다. 각도마다 다른 얼굴을 보여줍니다.' },
    { id: 'signature-fragment', name: '결정', family: 'signature', profile: 'facet', texture: 'sand', setting: 'inlay',
      width: [3.5, 5.5, 10], thickness: [1.6, 2.4, 4.0], wave: 0.3, twist: 0, taper: 0, facets: 9,
      elements: ['토', '금'], moods: ['시그니처'], basePrice: 246000,
      tags: ['독창성', '영감', '감각', '전문성', '완성', '독특'],
      desc: '결정이 깨진 단면처럼 불규칙한 면을 이어 붙였습니다. 같은 각도가 두 번 나오지 않는 구조입니다.' },
    { id: 'signature-halo', name: '광배', family: 'signature', profile: 'step', texture: 'brushed', setting: 'prong',
      width: [4, 6, 11], thickness: [1.6, 2.4, 4.0], wave: 0, twist: 0, taper: 0, facets: 8,
      elements: ['화', '토'], moods: ['시그니처', '선물'], basePrice: 258000,
      tags: ['명예', '품격', '리더십', '위엄', '포부', '중용'],
      desc: '원석 둘레를 넓은 단이 감싸 빛을 되비춥니다. 손 위에서 가장 먼저 눈에 들어오는 디자인입니다.' },
    { id: 'signature-duet', name: '이중주', family: 'signature', profile: 'wave', texture: 'matte', setting: 'inlay',
      width: [3, 4.5, 8], thickness: [1.4, 2.0, 3.4], wave: 0.55, twist: 0.4, taper: 0.25, facets: 0,
      elements: ['목', '화'], moods: ['커플', '시그니처'], basePrice: 208000,
      tags: ['화합', '교류', '소통', '다재', '인연', '표현력'],
      desc: '굵기가 다른 두 선이 엇갈리며 하나로 만나는 구조. 커플링으로 짝을 맞출 때 특히 잘 어울립니다.' }
  ];

  /* ────────────────────── 캔바 원문 → 스타일 해석 ────────────────────── */

  var LEXICON = [
    { family: 'organic', words: ['곡선', '부드러', '유려', '물결', '자연스러', '유기적', '흐르', '흐름', '감기는', '볼륨'] },
    { family: 'rugged', words: ['각진', '단단', '강인', '굳건', '묵직', '거친', '깊이 있는 텍스처', '실루엣', '든든', '견고', '구조'] },
    { family: 'minimal', words: ['절제', '심플', '군더더기', '정제', '단정', '깔끔', '비율', '과하지 않', '담백', '정돈', '균형감', '안정적'] },
    { family: 'signature', words: ['개성', '독창', '화려', '강렬', '비정형', '독특', '포인트', '컷팅', '세련된 디테일', '감각적'] }
  ];

  var TEXTURE_HINT = [
    { texture: 'hammered', words: ['해머', '질감', '텍스처', '텍스쳐'] },
    { texture: 'matte', words: ['유화', '차분', '은은한 질감', '무광'] },
    { texture: 'polish', words: ['광택', '빛', '세련'] },
    { texture: 'brushed', words: ['정제', '정돈', '단정'] },
    { texture: 'sand', words: ['자연에서 영감', '자연스러운 질감'] }
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
    return {
      modelId: model.id,
      modelName: model.name,
      family: model.family,
      profile: model.profile,
      texture: model.texture,
      setting: model.setting,
      width: round1(w),
      thickness: round1(t),
      size: 13,
      metal: opts.metal || 'silver925',
      wave: model.wave, twist: model.twist, taper: model.taper, facets: model.facets,
      stone: model.setting === 'none' ? null : stone,
      engraving: '',
      ilju: record ? record.id : null
    };
  }

  function round1(v) { return Math.round(v * 10) / 10; }

  /* ────────────────────────── 호수 · 가격 ────────────────────────── */

  /** 한국 호수 → 내경 지름(mm). 둘레 = 40.3 + (호수-1) mm 기준 */
  function sizeToInnerDiameter(size) {
    return (40.3 + (Number(size) - 1)) / Math.PI;
  }

  /** 예상가 계산 (원). 최종 금액은 상담에서 확정됩니다. */
  function estimatePrice(spec, quantity) {
    var P = CONFIG.price;
    var model = MODELS.filter(function (m) { return m.id === spec.modelId; })[0];
    if (!model) return null;
    var metal = P.metals[spec.metal] || P.metals['silver925'];

    var base = model.basePrice;
    var extraW = Math.max(0, spec.width - P.baseWidth) * P.perWidthMm;
    var extraT = Math.max(0, spec.thickness - P.baseThickness) * P.perThicknessMm;
    var setting = spec.stone ? (P.setting[spec.setting] || 0) : 0;
    var engrave = spec.engraving ? P.engraving : 0;

    var one = (base + extraW + extraT) * metal.mult + setting + engrave;
    var qty = Math.max(1, Number(quantity) || 1);
    var total = one * qty;
    if (qty >= 2) total *= (1 - P.couplePairDiscount);

    return {
      unit: Math.round(one / 1000) * 1000,
      quantity: qty,
      total: Math.round(total / 1000) * 1000,
      metalLabel: metal.label
    };
  }

  function formatKRW(n) {
    if (n === null || n === undefined) return '-';
    return n.toLocaleString('ko-KR') + '원';
  }

  /* ────────────────────── 2D 미리보기 (SVG) ────────────────────── */

  var PROFILE_LABEL = {
    flat: '플랫', round: '라운드', dshape: 'D형', knife: '나이프 엣지',
    wave: '웨이브', facet: '패싯', step: '스텝'
  };
  var TEXTURE_LABEL = {
    polish: '유광', matte: '유화(무광)', hammered: '해머드', sand: '샌드', brushed: '브러시', stone: '스톤'
  };
  var SETTING_LABEL = {
    none: '무석', bezel: '베젤', inlay: '인레이', prong: '프롱', flush: '플러시'
  };

  /**
   * 카드용 2D 미리보기. 실제 비율(호수/폭/두께)을 반영해 그립니다.
   * 3D 스튜디오와 같은 수치를 쓰기 때문에 카드와 스튜디오가 어긋나지 않습니다.
   */
  function ringSvg(spec, opts) {
    opts = opts || {};
    var size = opts.size || 180;
    var metal = CONFIG.price.metals[spec.metal] || CONFIG.price.metals['silver925'];
    var stoneColor = spec.stone ? (ONM.STONE_COLOR[spec.stone] || '#7a8b9c') : null;

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
    parts.push('<linearGradient id="' + uid + 'g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' + shade(metal.color, 1.18) + '"/>' +
      '<stop offset="45%" stop-color="' + metal.color + '"/>' +
      '<stop offset="100%" stop-color="' + shade(metal.color, 0.68) + '"/></linearGradient>');
    if (spec.texture === 'hammered' || spec.texture === 'stone' || spec.texture === 'sand') {
      parts.push('<filter id="' + uid + 'f"><feTurbulence type="fractalNoise" baseFrequency="' +
        (spec.texture === 'sand' ? '0.9' : spec.texture === 'stone' ? '0.22' : '0.14') +
        '" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="' +
        (spec.texture === 'sand' ? 0.9 : spec.texture === 'stone' ? 1.8 : 1.4) + '"/></filter>');
    }
    parts.push('</defs>');

    var bandAttrs = 'fill="none" stroke="url(#' + uid + 'g)" stroke-width="' + (rOut - rIn) + '"';
    var filter = (spec.texture === 'hammered' || spec.texture === 'stone' || spec.texture === 'sand')
      ? ' filter="url(#' + uid + 'f)"' : '';
    var opacity = spec.texture === 'matte' ? ' opacity="0.92"' : '';

    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + ((rOut + rIn) / 2) + '" ' + bandAttrs + filter + opacity + '/>');

    // 하이라이트 — 유광일수록 강하게
    var hl = spec.texture === 'polish' ? 0.5 : spec.texture === 'brushed' ? 0.26 : 0.14;
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

    // 원석
    if (stoneColor) {
      var sr = Math.max(5, (rOut - rIn) * (spec.setting === 'prong' ? 0.75 : 0.58));
      var sy = cy - (rOut + rIn) / 2;
      parts.push('<circle cx="' + cx + '" cy="' + sy + '" r="' + sr + '" fill="' + stoneColor + '" stroke="' +
        shade(metal.color, 0.8) + '" stroke-width="' + (spec.setting === 'bezel' ? 1.6 : 0.8) + '"/>');
      parts.push('<circle cx="' + (cx - sr * 0.3) + '" cy="' + (sy - sr * 0.3) + '" r="' + (sr * 0.28) +
        '" fill="#ffffff" fill-opacity="0.45"/>');
    }

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
      '폭(높이) ' + spec.width + 'mm',
      '두께 ' + spec.thickness + 'mm',
      PROFILE_LABEL[spec.profile] || spec.profile,
      TEXTURE_LABEL[spec.texture] || spec.texture
    ];
    if (spec.stone) bits.push(SETTING_LABEL[spec.setting] + ' · ' + spec.stone);
    if (spec.engraving) bits.push('각인 "' + spec.engraving + '"');
    return bits.join(' / ');
  }

  /* ──────────────── 페이지 간 사양 전달 (URL 쿼리) ──────────────── */

  var SPEC_KEYS = ['modelId', 'width', 'thickness', 'size', 'metal', 'texture', 'profile',
    'setting', 'stone', 'engraving', 'ilju', 'qty'];

  /** 사양 → URL 쿼리 문자열 (리포트 → 스튜디오 → 주문으로 넘길 때 사용) */
  function specToQuery(spec, extra) {
    var q = [];
    SPEC_KEYS.forEach(function (k) {
      var v = spec[k];
      if (v === null || v === undefined || v === '') return;
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
    ['width', 'thickness', 'size'].forEach(function (k) {
      var v = parseFloat(p.get(k));
      if (!isNaN(v)) spec[k] = v;
    });
    if (p.get('texture')) spec.texture = p.get('texture');
    if (p.get('profile')) spec.profile = p.get('profile');
    if (p.get('setting')) spec.setting = p.get('setting');
    if (p.has('stone')) spec.stone = p.get('stone') || null;
    if (p.get('engraving')) spec.engraving = p.get('engraving');
    if (p.get('ilju')) spec.ilju = p.get('ilju');
    spec.quantity = Math.max(1, parseInt(p.get('qty'), 10) || 1);
    return spec;
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
    TEXTURE_LABEL: TEXTURE_LABEL,
    SETTING_LABEL: SETTING_LABEL,
    recommend: recommend,
    defaultSpec: defaultSpec,
    readStyleBias: readStyleBias,
    sizeToInnerDiameter: sizeToInnerDiameter,
    estimatePrice: estimatePrice,
    formatKRW: formatKRW,
    ringSvg: ringSvg,
    describeSpec: describeSpec,
    getModel: function (id) { return MODELS.filter(function (m) { return m.id === id; })[0] || null; },
    esc: esc
  };
})(typeof window !== 'undefined' ? window : globalThis);
