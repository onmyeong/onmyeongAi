/*
 * 온명 — 두 사람의 일주 궁합
 * ------------------------------------------------------------------
 * 일주(日柱)는 사주에서 '나 자신'을 가리키므로, 두 사람의 일주를 마주 놓으면
 * 둘 사이의 결이 드러납니다. 명리에서 쓰는 관계만 따집니다.
 *
 *   천간(윗글자) — 합 · 충 · 오행의 생과 극
 *   지지(아랫글자) — 육합 · 삼합 · 충 · 형 · 해
 *
 * 점수는 이 관계들을 더하고 빼서 냅니다. 맞고 틀림을 가리는 숫자가 아니라,
 * "어디가 잘 맞고 어디를 살피면 되는지"를 보여주기 위한 눈금입니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};

  /* ─────────────── 조사 붙이기 ───────────────
   * 앞말에 받침이 있는지에 따라 은/는, 이/가, 을/를, 과/와, 으로/로가 갈립니다.
   * 천간·지지·오행 이름을 문장에 그대로 끼워 넣기 때문에 꼭 필요합니다. */

  function jong(word) {
    var ch = String(word).charCodeAt(String(word).length - 1);
    if (ch < 0xac00 || ch > 0xd7a3) return 0;          // 한글이 아니면 받침 없음으로 본다
    return (ch - 0xac00) % 28;                          // 0이면 받침 없음, 8이면 ㄹ
  }
  function eun(w) { return w + (jong(w) ? '은' : '는'); }
  function i(w) { return w + (jong(w) ? '이' : '가'); }
  function eul(w) { return w + (jong(w) ? '을' : '를'); }
  function gwa(w) { return w + (jong(w) ? '과' : '와'); }
  function ro(w) { var j = jong(w); return w + (!j || j === 8 ? '로' : '으로'); }

  /* ─────────────── 천간 관계 ─────────────── */

  // 천간합 — 만나면 새로운 오행으로 바뀐다
  var STEM_HAP = {
    '갑기': '토', '기갑': '토',
    '을경': '금', '경을': '금',
    '병신': '수', '신병': '수',
    '정임': '목', '임정': '목',
    '무계': '화', '계무': '화'
  };

  // 천간충 — 정면으로 부딪친다 (무·기는 충이 없다)
  var STEM_CHUNG = ['갑경', '경갑', '을신', '신을', '병임', '임병', '정계', '계정'];

  /* ─────────────── 지지 관계 ─────────────── */

  var BRANCH_HAP = {            // 육합 — 둘이 만나 하나로 묶인다
    '자축': '토', '축자': '토',
    '인해': '목', '해인': '목',
    '묘술': '화', '술묘': '화',
    '진유': '금', '유진': '금',
    '사신': '수', '신사': '수',
    '오미': '화', '미오': '화'
  };

  var BRANCH_SAMHAP = [          // 삼합 — 셋이 모여 큰 기운을 이룬다. 둘만 있어도 반합
    { set: ['신', '자', '진'], elem: '수' },
    { set: ['해', '묘', '미'], elem: '목' },
    { set: ['인', '오', '술'], elem: '화' },
    { set: ['사', '유', '축'], elem: '금' }
  ];

  var BRANCH_CHUNG = ['자오', '오자', '축미', '미축', '인신', '신인', '묘유', '유묘', '진술', '술진', '사해', '해사'];
  var BRANCH_HAE = ['자미', '미자', '축오', '오축', '인사', '사인', '묘진', '진묘', '신해', '해신', '유술', '술유'];
  var BRANCH_HYEONG = ['인사', '사신', '신인', '축술', '술미', '미축', '자묘', '묘자'];

  /* ─────────────── 오행 ─────────────── */

  var SAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };   // 낳아 준다
  var GEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };   // 누른다

  function pair(a, b) { return a + b; }

  function inSamhap(b1, b2) {
    for (var k = 0; k < BRANCH_SAMHAP.length; k++) {
      var g = BRANCH_SAMHAP[k];
      if (b1 !== b2 && g.set.indexOf(b1) !== -1 && g.set.indexOf(b2) !== -1) return g;
    }
    return null;
  }

  /* ─────────────── 십신(十神) ───────────────
   * 내 일간에서 상대를 보면 열 가지 자리 중 하나에 놓입니다.
   * 오행의 생·극 관계에 음양이 같은지 다른지를 겹쳐서 가립니다.
   * 관계를 읽을 때 가장 실질적인 축이라 두 방향 모두 냅니다. */

  var YANG_STEM = ['갑', '병', '무', '경', '임'];
  function isYang(stem) { return YANG_STEM.indexOf(stem) !== -1; }

  var SIPSIN_TEXT = {
    비견: ['같은 자리에 나란히 선 사람', '친구처럼 편합니다. 다만 같은 것을 두고 겨루게 될 때가 있어, 역할을 나눠 두면 훨씬 수월합니다.'],
    겁재: ['같은 기운인데 결이 다른 사람', '든든하게 곁을 지켜 주면서도 은근히 신경이 쓰입니다. 돈과 일은 처음부터 선을 그어 두는 편이 좋습니다.'],
    식신: ['마음 놓고 베풀게 되는 사람', '같이 있으면 잘 먹고 잘 웃습니다. 긴장이 풀리고 표정이 부드러워집니다.'],
    상관: ['재능을 꺼내 보이게 하는 사람', '신이 나서 말도 일도 많아집니다. 말이 앞설 때가 있으니 한 박자만 늦추면 좋습니다.'],
    편재: ['챙겨 주고 싶은 사람', '즐겁게 쓰고 즐겁게 나눕니다. 씀씀이가 커지기 쉬우니 큰돈은 함께 정하세요.'],
    정재: ['아끼고 지키게 되는 사람', '살림과 계획이 착착 맞아 갑니다. 오래 함께 그림을 그리기 좋은 자리입니다.'],
    편관: ['긴장하게 만드는 사람', '끌리는 만큼 부담도 같이 옵니다. 이 긴장이 설렘일 때와 압박일 때를 구분해 보세요.'],
    정관: ['바로 서게 만드는 사람', '곁에 있으면 자세가 반듯해집니다. 믿고 기대되는 자리입니다.'],
    편인: ['다르게 보게 만드는 사람', '생각의 폭이 넓어집니다. 다만 혼자 곱씹는 시간도 함께 늘어납니다.'],
    정인: ['품어 주는 사람', '기대고 쉬게 됩니다. 지칠 때 가장 먼저 찾게 되는 자리입니다.']
  };

  /** 상대(other)가 나(me)에게 어떤 자리인가 */
  function sipsin(me, other) {
    var e1 = me.stemInfo.elem, e2 = other.stemInfo.elem;
    var same = isYang(me.stem) === isYang(other.stem);
    var name;
    if (e1 === e2) name = same ? '비견' : '겁재';
    else if (SAENG[e1] === e2) name = same ? '식신' : '상관';
    else if (GEUK[e1] === e2) name = same ? '편재' : '정재';
    else if (GEUK[e2] === e1) name = same ? '편관' : '정관';
    else name = same ? '편인' : '정인';
    return { name: name, title: SIPSIN_TEXT[name][0], text: SIPSIN_TEXT[name][1] };
  }

  /* ─────────────── 음양 ─────────────── */
  function yinYang(a, b) {
    var ya = isYang(a.stem), yb = isYang(b.stem);
    if (ya && yb) {
      return { label: '양 + 양', text: '둘 다 앞장서는 기운입니다. 같이 있으면 일이 빨리 굴러가지만, 둘 다 물러서지 않는 순간이 옵니다. 누가 어느 영역을 맡을지 미리 나눠 두세요.' };
    }
    if (!ya && !yb) {
      return { label: '음 + 음', text: '둘 다 안으로 살피는 기운입니다. 서로의 속을 잘 읽는 대신, 먼저 말을 꺼내는 사람이 없어 오해가 길어지기 쉽습니다.' };
    }
    return { label: '양 + 음', text: '한쪽은 밀고 한쪽은 받치는 구성입니다. 명리에서 가장 자연스럽게 맞물린다고 보는 짝입니다.' };
  }

  /* ─────────────── 둘이 하면 좋은 것 ───────────────
   * 두 사람을 잇는 오행이 무엇이냐에 따라 잘 맞는 시간이 다릅니다. */
  var BRIDGE_PLAY = {
    목: { place: '나무가 많은 곳', doing: '산책, 화분 고르기, 새로 시작하는 일 함께 준비하기', gift: '식물 · 나무 소품 · 다이어리' },
    화: { place: '사람과 빛이 많은 곳', doing: '공연, 여행, 불 앞에서 먹는 것', gift: '향초 · 공연 티켓 · 붉은 계열 소품' },
    토: { place: '집이나 조용한 동네', doing: '요리, 집 꾸미기, 오래 앉아 이야기하기', gift: '그릇 · 담요 · 직접 만든 것' },
    금: { place: '정돈된 공간', doing: '전시 관람, 정리와 계획 세우기, 좋은 물건 하나 고르기', gift: '금속 소품 · 반지 · 잘 만든 도구' },
    수: { place: '물이 보이는 곳', doing: '바다나 강가 걷기, 영화, 밤에 나누는 긴 대화', gift: '책 · 음반 · 유리 소품' }
  };

  /**
   * 두 일주의 궁합
   * @param {Object} a ONMYEONG.ILJU 레코드
   * @param {Object} b ONMYEONG.ILJU 레코드
   * @returns {Object} { score, grade, headline, good[], care[], stemLine, branchLine, elementLine, bridge }
   */
  function compare(a, b, names) {
    names = names || {};
    /* 이름을 적어 주셨으면 "지민 님", 아니면 "계묘 일주"로 부릅니다 */
    var A = names.a ? names.a + ' 님' : a.id + ' 일주';
    var B = names.b ? names.b + ' 님' : b.id + ' 일주';
    var s1 = a.stem, s2 = b.stem, b1 = a.branch, b2 = b.branch;
    var e1 = a.stemInfo.elem, e2 = b.stemInfo.elem;
    var score = 55;
    var axis = { stem: 55, branch: 55, elem: 55 };   // 세 갈래 점수를 따로 본다
    var good = [], care = [];
    var stemLine, branchLine, elementLine;
    var bridge = null;              // 두 사람을 이어 주는 오행

    /* ── 천간: 겉으로 드러나는 성격 ── */
    var hap = STEM_HAP[pair(s1, s2)];
    if (hap) {
      score += 25; axis.stem = 97;
      bridge = hap;
      stemLine = gwa(s1) + ' ' + eun(s2) + ' 서로를 끌어당기는 천간합입니다. 만나면 ' + hap +
        '의 기운으로 바뀌어, 둘이 함께일 때 없던 결이 새로 생깁니다.';
      good.push('겉으로 드러나는 성격이 자연스럽게 맞물립니다. 오래 붙어 있어도 서로를 깎지 않습니다.');
    } else if (STEM_CHUNG.indexOf(pair(s1, s2)) !== -1) {
      score -= 15; axis.stem = 44;
      stemLine = gwa(s1) + ' ' + eun(s2) + ' 정면으로 부딪치는 천간충입니다. 같은 자리를 서로 다른 방식으로 차지하려 합니다.';
      care.push('의견이 갈릴 때 정면으로 맞붙기 쉽습니다. 한 사람이 반 발짝 물러서는 약속을 미리 정해 두면 훨씬 수월합니다.');
    } else if (e1 === e2) {
      score += 8; axis.stem = 70;
      stemLine = '둘 다 ' + e1 + '의 기운을 타고났습니다. 말하지 않아도 통하는 대신, 닮은 만큼 같은 약점도 나눠 가집니다.';
      good.push('설명이 필요 없습니다. 비슷한 속도로 움직이고 비슷한 것에 끌립니다.');
      care.push('둘 다 같은 자리에서 지칩니다. 서로를 채워 줄 다른 축을 하나쯤 두는 편이 좋습니다.');
    } else if (SAENG[e1] === e2) {
      score += 16; axis.stem = 84;
      bridge = e2;
      stemLine = i(e1) + ' ' + eul(e2) + ' 낳아 주는 사이입니다. ' + i(s1) + ' 내주고 ' + i(s2) + ' 받아 자랍니다.';
      good.push(i(A) + ' 먼저 내주고 ' + i(B) + ' 그 힘으로 뻗어 나가는 구조입니다.');
    } else if (SAENG[e2] === e1) {
      score += 16; axis.stem = 84;
      bridge = e1;
      stemLine = i(e2) + ' ' + eul(e1) + ' 낳아 주는 사이입니다. ' + i(s2) + ' 내주고 ' + i(s1) + ' 받아 자랍니다.';
      good.push(i(B) + ' 먼저 내주고 ' + i(A) + ' 그 힘으로 뻗어 나가는 구조입니다.');
    } else if (GEUK[e1] === e2 || GEUK[e2] === e1) {
      score -= 10; axis.stem = 52;
      var strong = GEUK[e1] === e2 ? a : b;
      var soft = GEUK[e1] === e2 ? b : a;
      stemLine = gwa(e1) + ' ' + eun(e2) + ' 한쪽이 다른 쪽을 누르는 사이입니다. ' +
        i(strong.stem) + ' ' + eul(soft.stem) + ' 다잡습니다.';
      care.push((strong === a ? A : B) + '의 말이 세게 닿을 수 있습니다. 다잡으려는 마음이 잔소리로 들리지 않게 말의 온도를 낮춰 보세요.');
    } else {
      axis.stem = 62;
      stemLine = gwa(s1) + ' ' + eun(s2) + ' 서로를 크게 밀지도 당기지도 않습니다. 부딪힐 일도 적지만, 먼저 다가서는 쪽이 필요합니다.';
    }

    /* ── 지지: 속마음과 실제 생활 ── */
    var bhap = BRANCH_HAP[pair(b1, b2)];
    var sam = inSamhap(b1, b2);
    if (bhap) {
      score += 25; axis.branch = 97;
      bridge = bridge || bhap;
      branchLine = gwa(b1) + ' ' + eun(b2) + ' 육합입니다. 둘이 만나 ' + ro(bhap) +
        ' 묶이는, 열두 지지 가운데 가장 끈끈한 짝입니다.';
      good.push('같이 있으면 마음이 놓입니다. 생활의 결이 어긋나지 않습니다.');
    } else if (sam) {
      score += 22; axis.branch = 92;
      bridge = bridge || sam.elem;
      branchLine = gwa(b1) + ' ' + eun(b2) + ' ' + sam.set.join('·') + ' 삼합의 한 축입니다. 같은 ' + sam.elem +
        '의 방향을 보고 있어, 목표가 같을 때 힘이 크게 붙습니다.';
      good.push('둘이 같은 곳을 바라볼 때 혼자일 때보다 훨씬 멀리 갑니다.');
    } else if (BRANCH_CHUNG.indexOf(pair(b1, b2)) !== -1) {
      score -= 18; axis.branch = 42;
      branchLine = gwa(b1) + ' ' + eun(b2) + ' 마주 보고 부딪치는 충입니다. 생활 습관과 속도가 정반대로 놓입니다.';
      care.push('사소한 생활 습관에서 자주 부딪칩니다. 서로 고치라고 하기보다 각자의 영역을 나눠 두는 편이 낫습니다.');
      good.push('부딪치는 만큼 서로에게 없는 것을 가지고 있습니다. 변화가 필요할 때 상대가 답이 됩니다.');
    } else if (b1 === b2) {
      score += 8; axis.branch = 72;
      branchLine = '둘 다 ' + b1 + '입니다. 속도도 취향도 거의 겹칩니다.';
      good.push('취향이 겹쳐 함께 고르는 일이 즐겁습니다.');
    } else if (BRANCH_HYEONG.indexOf(pair(b1, b2)) !== -1) {
      score -= 8; axis.branch = 52;
      branchLine = gwa(b1) + ' ' + eun(b2) + ' 서로를 시험하는 형(刑)의 자리입니다. 가까워질수록 예민해지는 구석이 있습니다.';
      care.push('가까워질수록 작은 것에 예민해집니다. 거리를 조금 두는 시간이 오히려 관계를 지켜 줍니다.');
    } else if (BRANCH_HAE.indexOf(pair(b1, b2)) !== -1) {
      score -= 6; axis.branch = 56;
      branchLine = gwa(b1) + ' ' + eun(b2) + ' 해(害)의 자리입니다. 크게 부딪치진 않지만 서운함이 쌓이기 쉽습니다.';
      care.push('말하지 않고 넘어간 서운함이 오래 남습니다. 그때그때 짚고 가는 편이 좋습니다.');
    } else {
      axis.branch = 62;
      branchLine = gwa(b1) + ' ' + eun(b2) + ' 특별히 묶이지도 부딪치지도 않습니다. 함께 쌓아 가는 시간이 그대로 관계가 됩니다.';
    }

    /* ── 일지의 오행: 생활에서 드러나는 결 ── */
    var g1 = a.branchInfo.elem, g2 = b.branchInfo.elem;
    if (g1 !== g2) {
      if (SAENG[g1] === g2 || SAENG[g2] === g1) {
        score += 6; axis.elem = 88;
        good.push('일상에서도 한쪽이 벌이면 다른 쪽이 마무리하는, 손발이 맞는 구조입니다.');
      } else if (GEUK[g1] === g2 || GEUK[g2] === g1) {
        score -= 5; axis.elem = 50;
        care.push('쉬는 방식과 돈 쓰는 방식이 서로 달라 부딪치기 쉽습니다. 각자의 몫을 정해 두면 편해집니다.');
      } else {
        axis.elem = 66;
      }
    } else {
      axis.elem = 80;
      good.push('먹고 자고 쉬는 리듬이 비슷해 같이 지내기 편한 편입니다.');
    }

    /* ── 두 사람을 잇는 오행 ── */
    if (!bridge) bridge = SAENG[e1] === e2 ? e2 : (SAENG[e2] === e1 ? e1 : e1);
    elementLine = eun(A) + ' ' + e1 + ', ' + eun(B) + ' ' + e2 + '. 둘 사이를 이어 주는 기운은 ' + bridge + '입니다.';

    if (good.length === 0) {
      good.push('서로를 크게 흔들지 않아, 각자의 속도를 지키며 오래 갈 수 있는 조합입니다.');
    }
    if (care.length === 0) {
      care.push('편안한 만큼 무심해지기 쉽습니다. 먼저 표현하는 쪽이 관계를 끌고 갑니다.');
    }

    score = Math.max(38, Math.min(97, Math.round(score)));

    var grade, headline;
    if (score >= 85) {
      grade = '깊이 맞물린 사이';
      headline = '서로의 빈자리에 정확히 들어맞는 조합입니다.';
    } else if (score >= 72) {
      grade = '잘 어울리는 사이';
      headline = '결이 비슷해 함께 있을 때 편안한 조합입니다.';
    } else if (score >= 60) {
      grade = '서로를 키우는 사이';
      headline = '다른 점이 있어 배울 것이 많은 조합입니다.';
    } else if (score >= 50) {
      grade = '맞춰 가는 사이';
      headline = '시간을 들인 만큼 단단해지는 조합입니다.';
    } else {
      grade = '서로를 흔드는 사이';
      headline = '부딪치는 만큼 서로를 크게 바꿔 놓는 조합입니다.';
    }

    /* ── 케미 포인트 ──
     * 위에서 가린 관계를 "그래서 둘이 어떤가"로 바꿔 놓은 칸들입니다.
     * 지어낸 이야기가 아니라 전부 위 관계에서 그대로 끌어옵니다. */
    var sipA = sipsin(a, b);            // a 가 보는 b
    var sipB = sipsin(b, a);            // b 가 보는 a
    var yy = yinYang(a, b);
    var play = BRIDGE_PLAY[bridge] || BRIDGE_PLAY['토'];

    var chemistry = [
      {
        key: 'first',
        label: '첫인상 케미',
        title: axis.stem >= 90 ? '처음부터 눈에 들어옵니다'
          : axis.stem >= 80 ? '만날수록 편해집니다'
          : axis.stem >= 60 ? '서서히 물드는 쪽입니다'
          : '강렬하게 부딪칩니다',
        text: axis.stem >= 90
          ? '천간이 맞물려 있어 첫 자리부터 말이 잘 통합니다. 처음 느낌이 끝까지 크게 안 변하는 조합입니다.'
          : axis.stem >= 80
            ? '한쪽이 먼저 내주는 구조라 처음엔 조용해도 두세 번째 만남부터 훅 가까워집니다.'
            : axis.stem >= 60
              ? '첫인상은 무난합니다. 대신 시간을 들인 만큼 정확히 그만큼 가까워집니다.'
              : '처음부터 팽팽합니다. 싫은 게 아니라 서로를 의식하는 겁니다. 그 긴장이 오래가는 조합입니다.'
      },
      {
        key: 'live',
        label: '같이 지낼 때',
        title: axis.branch >= 90 ? '생활이 착 붙습니다'
          : axis.branch >= 70 ? '큰 탈 없이 흘러갑니다'
          : axis.branch >= 55 ? '조율이 필요합니다'
          : '생활 습관이 정반대입니다',
        text: branchLine
      },
      {
        key: 'fight',
        label: '싸우고 난 뒤',
        title: axis.stem < 60 || axis.branch < 55 ? '먼저 손 내미는 쪽이 정해져 있습니다'
          : '오래 끌지 않습니다',
        text: axis.stem < 60 || axis.branch < 55
          ? (sipA.name === '편관' || sipB.name === '편관'
              ? '긴장이 높은 자리라 한번 틀어지면 말이 길어집니다. "오늘은 여기까지" 하고 끊는 약속을 미리 정해 두세요.'
              : '둘 다 물러서지 않는 구간이 있습니다. 승패를 가리지 말고 각자 맡을 영역을 나누는 쪽이 빠릅니다.')
          : '기운이 서로를 밀지 않아 감정이 오래 남지 않습니다. 하루 자고 나면 대개 풀립니다.'
      },
      {
        key: 'play',
        label: '둘이 하면 좋은 것',
        title: bridge + '의 기운이 둘을 잇습니다',
        text: play.place + '에서 잘 맞습니다. ' + play.doing + ' 같은 것들이요. ' +
          '선물을 고른다면 ' + play.gift + ' 쪽이 무난합니다.'
      }
    ];

    return {
      score: score,
      grade: grade,
      headline: headline,
      stemLine: stemLine,
      branchLine: branchLine,
      elementLine: elementLine,
      bridge: bridge,
      good: good,
      care: care,

      // 더 자세히 보기
      nickname: ONM.iljuPhrase(a) + ' × ' + ONM.iljuPhrase(b),
      labelA: A,
      labelB: B,
      axes: [
        { key: 'stem', name: '첫인상 · 드러나는 성격', score: axis.stem, note: '일주의 윗글자(천간)로 봅니다' },
        { key: 'branch', name: '생활 · 속마음', score: axis.branch, note: '일주의 아랫글자(지지)로 봅니다' },
        { key: 'elem', name: '리듬 · 지내는 결', score: axis.elem, note: '두 일지의 오행으로 봅니다' }
      ],
      sipsinA: sipA,
      sipsinB: sipB,
      yinYang: yy,
      play: play,
      chemistry: chemistry
    };
  }

  /* 천간의 음양 — 갑·병·무·경·임은 양(陽), 을·정·기·신·계는 음(陰).
   * 양간은 굵고 또렷한 쪽이, 음간은 가늘고 단정한 쪽이 대체로 잘 맞습니다.
   * 같은 디자인이라도 두 분의 폭과 두께를 이렇게 갈라 잡아 드립니다. */
  var YANG_STEM = ['갑', '병', '무', '경', '임'];
  function volumeOf(rec) { return YANG_STEM.indexOf(rec.stem) !== -1 ? 'bold' : 'slim'; }
  function volumeWord(v) { return v === 'bold' ? '조금 도톰하게' : '조금 가늘게'; }

  /* 두 사양이 눈으로 봐서 같은지 — 같으면 미리보기를 하나만 보여 줍니다 */
  var LOOK_KEYS = ['modelId', 'profile', 'texture', 'setting', 'width', 'thickness',
    'stoneType', 'stone', 'stoneSize', 'plating', 'epoxy'];
  function sameLook(x, y) {
    for (var k = 0; k < LOOK_KEYS.length; k++) {
      if (x[LOOK_KEYS[k]] !== y[LOOK_KEYS[k]]) return false;
    }
    return true;
  }

  /**
   * 두 사람 모두에게 어울리는 커플링
   * 각자의 추천 순위를 합쳐 높은 순으로 고르고, 둘을 잇는 오행에 맞는 디자인에 힘을 싣습니다.
   */
  function coupleRings(a, b, opts) {
    opts = opts || {};
    var R = ONM.rings;
    var bridge = opts.bridge;
    var limit = opts.limit || 4;

    var listA = R.recommend(a, { seed: opts.seed || 1, limit: R.MODELS.length, mood: 'all' });
    var listB = R.recommend(b, { seed: (opts.seed || 1) + 7, limit: R.MODELS.length, mood: 'all' });

    var rank = {};
    listA.forEach(function (x, n) { rank[x.model.id] = (rank[x.model.id] || 0) + (listA.length - n); });
    listB.forEach(function (x, n) { rank[x.model.id] = (rank[x.model.id] || 0) + (listB.length - n); });

    var scored = R.MODELS.map(function (m) {
      var s = rank[m.id] || 0;
      if (m.moods.indexOf('커플') !== -1) s += 14;          // 짝을 맞추기 좋은 디자인
      if (bridge && m.elements.indexOf(bridge) !== -1) s += 10; // 둘을 잇는 기운
      return { model: m, score: s };
    }).sort(function (x, y) { return y.score - x.score; });

    var volA = volumeOf(a), volB = volumeOf(b);
    var top = scored[0] ? scored[0].score : 1;
    return scored.slice(0, limit).map(function (x, n) {
      var specA = R.defaultSpec(x.model, a, { volume: volA, metal: opts.metal });
      var specB = R.defaultSpec(x.model, b, { volume: volB, metal: opts.metal });
      return {
        model: x.model,
        family: R.FAMILIES[x.model.family],
        rank: n + 1,
        fit: Math.max(62, Math.min(99, Math.round(62 + (x.score / top) * 36))),
        reason: (x.model.moods.indexOf('커플') !== -1 ? '짝을 맞추기 좋은 형태' : '두 사람 모두에게 높은 점수') +
          (bridge && x.model.elements.indexOf(bridge) !== -1 ? ' · 두 사람을 잇는 ' + bridge + '의 결' : ''),
        specA: specA,
        specB: specB,
        noteA: volumeWord(volA),
        noteB: volumeWord(volB),
        sameLook: sameLook(specA, specB)
      };
    });
  }

  ONM.compat = { compare: compare, coupleRings: coupleRings, sameLook: sameLook, sipsin: sipsin, josa: { eun: eun, i: i, eul: eul, gwa: gwa, ro: ro } };
})(typeof window !== 'undefined' ? window : globalThis);
