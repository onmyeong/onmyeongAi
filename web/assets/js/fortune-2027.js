/*
 * 온명 — 2027 정미년(丁未年) 신년운세
 * ------------------------------------------------------------------
 * 사주 여덟 글자(saju-full.js) 전체를 놓고 2027년의 흐름을 읽습니다.
 * 지어낸 점괘가 아니라, 명리에서 실제로 쓰는 자리만 가지고 문장을 만듭니다.
 *
 *   원국 읽기   여덟 글자의 오행 분포 · 십신 · 일간의 힘(신강/신약) · 보완하면 좋은 기운
 *   세운 읽기   2027 정미(丁未)가 내 일간에게 어떤 자리(십신)인지,
 *               未가 내 네 기둥의 지지와 합·충·형·해·파로 어떻게 엮이는지,
 *               일간이 未에서 십이운성 어느 단계인지
 *   월운 읽기   2027년 입춘부터 2028년 소한까지 열두 달의 월주와 일주의 관계
 *
 * 문구를 고치고 싶으면 아래 TEXT 객체들의 문장만 바꾸면 됩니다. 계산 코드는 건드릴 필요가 없습니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};
  var S = ONM.saju;

  var YEAR = 2027;
  var STEMS = S.STEMS, BRANCHES = S.BRANCHES;
  var ELEMS = ['목', '화', '토', '금', '수'];
  var SAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };   // 생하는 쪽
  var GEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };    // 극하는 쪽
  var MOTHER = { 화: '목', 토: '화', 금: '토', 수: '금', 목: '수' };   // 나를 생하는 쪽

  /* 지지 속 본기(本氣) — 지지의 음양과 십신은 본기로 봅니다 (자는 계수, 오는 정화 …) */
  var BONGI = { 자: '계', 축: '기', 인: '갑', 묘: '을', 진: '무', 사: '병', 오: '정', 미: '기', 신: '경', 유: '신', 술: '무', 해: '임' };

  function stemIdx(s) { return STEMS.indexOf(s); }
  function stemElem(s) { return S.STEM_ELEM[stemIdx(s)]; }
  function stemYang(s) { return stemIdx(s) % 2 === 0; }

  /* ── 조사 ── */
  function jong(word) {
    var s = String(word);
    for (var k = s.length - 1; k >= 0; k--) {
      var ch = s.charCodeAt(k);
      if (ch >= 0xac00 && ch <= 0xd7a3) return (ch - 0xac00) % 28;
    }
    return 0;
  }
  function eun(w) { return w + (jong(w) ? '은' : '는'); }
  function i(w) { return w + (jong(w) ? '이' : '가'); }
  function wa(w) { return w + (jong(w) ? '과' : '와'); }

  /* ─────────────── 십신 ─────────────── */
  /** 일간(me)이 다른 천간(other)을 보는 자리 */
  function sipsin(me, other) {
    var e1 = stemElem(me), e2 = stemElem(other);
    var same = stemYang(me) === stemYang(other);
    if (e1 === e2) return same ? '비견' : '겁재';
    if (SAENG[e1] === e2) return same ? '식신' : '상관';
    if (GEUK[e1] === e2) return same ? '편재' : '정재';
    if (GEUK[e2] === e1) return same ? '편관' : '정관';
    return same ? '편인' : '정인';
  }
  function sipsinOfBranch(me, branch) { return sipsin(me, BONGI[branch]); }

  var GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
  var GROUP_WORD = {
    비겁: '나와 같은 힘 — 자신감 · 동료 · 경쟁',
    식상: '내가 내보내는 힘 — 표현 · 재능 · 만드는 일',
    재성: '내가 다루는 힘 — 돈 · 결과 · 현실 감각',
    관성: '나를 다잡는 힘 — 일 · 책임 · 자리',
    인성: '나를 채우는 힘 — 배움 · 도움 · 쉼'
  };
  /** 일간 기준으로 오행이 어떤 무리인지 */
  function groupOfElem(dayElem, e) {
    if (e === dayElem) return '비겁';
    if (SAENG[dayElem] === e) return '식상';
    if (GEUK[dayElem] === e) return '재성';
    if (GEUK[e] === dayElem) return '관성';
    return '인성';
  }
  /* ─────────────── 지지 관계 ─────────────── */
  function pairKey(a, b) { return a + b; }
  var YUKHAP = { 자축: 1, 축자: 1, 인해: 1, 해인: 1, 묘술: 1, 술묘: 1, 진유: 1, 유진: 1, 사신: 1, 신사: 1, 오미: 1, 미오: 1 };
  var CHUNG = { 자오: 1, 오자: 1, 축미: 1, 미축: 1, 인신: 1, 신인: 1, 묘유: 1, 유묘: 1, 진술: 1, 술진: 1, 사해: 1, 해사: 1 };
  var HAE = { 자미: 1, 미자: 1, 축오: 1, 오축: 1, 인사: 1, 사인: 1, 묘진: 1, 진묘: 1, 신해: 1, 해신: 1, 유술: 1, 술유: 1 };
  var PA = { 자유: 1, 유자: 1, 축진: 1, 진축: 1, 인해: 0, 묘오: 1, 오묘: 1, 사신: 0, 미술: 1, 술미: 1 };
  var HYEONG = { 인사: 1, 사신: 1, 신인: 1, 축술: 1, 술미: 1, 미축: 1, 자묘: 1, 묘자: 1 };
  var SAMHAP = [['해', '묘', '미', '목'], ['인', '오', '술', '화'], ['사', '유', '축', '금'], ['신', '자', '진', '수']];

  /** 두 지지의 관계 하나 (가장 센 것) */
  function branchRelation(a, b) {
    var k = pairKey(a, b);
    if (a === b) return a === '미' || a === '오' || a === '진' || a === '유' || a === '해' ? { type: '자형', label: '같은 글자' } : { type: '같음', label: '같은 글자' };
    if (CHUNG[k]) return { type: '충', label: '충(沖)' };
    if (YUKHAP[k]) return { type: '합', label: '육합(六合)' };
    for (var n = 0; n < SAMHAP.length; n++) {
      var g = SAMHAP[n];
      if (g.indexOf(a) !== -1 && g.indexOf(b) !== -1 && g.indexOf(a) < 3 && g.indexOf(b) < 3) return { type: '합', label: '반합(半合) · ' + g[3] + '국' };
    }
    if (HYEONG[k]) return { type: '형', label: '형(刑)' };
    if (HAE[k]) return { type: '해', label: '해(害)' };
    if (PA[k]) return { type: '파', label: '파(破)' };
    return null;
  }

  /* 기둥별 자리의 뜻 */
  var SEAT = {
    년주: { who: '집안 · 윗사람', life: '뿌리와 바깥 환경' },
    월주: { who: '일터 · 사회', life: '하루의 대부분을 보내는 자리' },
    일주: { who: '나 · 배우자', life: '가장 가까운 관계와 내 몸' },
    시주: { who: '아랫사람 · 앞날', life: '계획과 결과물' }
  };

  var REL_TEXT = {
    합: function (p) { return p.role + '의 ' + wa(p.branch) + ' 2027년의 미(未)가 손을 잡습니다. ' + SEAT[p.role].who + ' 쪽에서 반가운 연결이 생기기 쉽습니다.'; },
    충: function (p) { return p.role + '의 ' + wa(p.branch) + ' 2027년의 미(未)가 정면으로 부딪칩니다. ' + SEAT[p.role].who + ' 쪽에 이동·변화가 들어옵니다. 깨지는 것이 아니라 자리를 옮기는 움직임으로 보세요.'; },
    형: function (p) { return p.role + '의 ' + wa(p.branch) + ' 미(未)가 형(刑)으로 걸립니다. ' + SEAT[p.role].who + ' 쪽 일은 서류·약속·말을 한 번 더 확인하면 탈이 없습니다.'; },
    자형: function (p) { return p.role + '에 이미 미(未)가 있어 같은 글자가 겹칩니다. 그 기운이 두 배로 커지니 ' + SEAT[p.role].who + ' 쪽에서 고집이 세지지 않게 살피세요.'; },
    해: function (p) { return p.role + '의 ' + wa(p.branch) + ' 미(未)가 해(害)로 엇갈립니다. ' + SEAT[p.role].who + ' 쪽에서 서운함이 쌓이기 쉬우니, 작은 오해는 그날 풀고 넘어가세요.'; },
    파: function (p) { return p.role + '의 ' + wa(p.branch) + ' 미(未)가 파(破)로 금이 갑니다. ' + SEAT[p.role].who + ' 쪽 계획은 한 번에 크게보다 나눠서 진행하는 편이 안전합니다.'; },
    같음: function () { return ''; }
  };

  /* 천간 관계 — 2027년 천간 정(丁)과 원국 천간 */
  function stemRelation(s) {
    if (s === '임') return { type: '합', text: '원국의 임(壬)과 2027년의 정(丁)이 정임합(丁壬合)으로 묶입니다. 정이 많은 해 — 마음이 움직이는 인연과 제안이 들어옵니다.' };
    if (s === '계') return { type: '충', text: '원국의 계(癸)와 2027년의 정(丁)이 정계충(丁癸沖)으로 마주 섭니다. 생각이 자주 바뀔 수 있으니 큰 결정은 한 번 묵혀 두세요.' };
    if (s === '신') return { type: '극', text: '원국의 신(辛)을 2027년의 정(丁)이 단련합니다. 다듬어지는 과정이 따갑지만, 지나고 나면 값이 오릅니다.' };
    return null;
  }

  /* ─────────────── 십이운성 ─────────────── */
  var STAGE_ORDER = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
  var STAGE_BIRTH = { 갑: '해', 을: '오', 병: '인', 정: '유', 무: '인', 기: '유', 경: '사', 신: '자', 임: '신', 계: '묘' };
  var STAGE_LINE = {
    장생: '새로 태어나는 기운 — 시작하는 일에 순풍이 붙습니다.',
    목욕: '씻고 다듬는 기운 — 감각이 살아나고 사람이 모이지만 마음이 들뜨기 쉽습니다.',
    관대: '옷을 갖춰 입는 기운 — 의욕이 크고 자신감이 붙습니다. 서두르지만 않으면 됩니다.',
    건록: '제 발로 서는 기운 — 내 힘으로 벌고 내 힘으로 서는 해입니다.',
    제왕: '가장 높이 오른 기운 — 주도권이 내 손에 옵니다. 물러설 선만 정해 두세요.',
    쇠: '노련하게 힘을 빼는 기운 — 앞장서기보다 판을 읽는 쪽이 이깁니다.',
    병: '힘이 잦아드는 기운 — 몸과 마음을 먼저 챙기면 오히려 섬세함이 빛납니다.',
    사: '멈추고 파고드는 기운 — 넓히기보다 깊게 아는 한 가지가 남는 해입니다.',
    묘: '거두어 저장하는 기운 — 모으고 정리하고 지키는 데 유리합니다.',
    절: '끊고 다시 잇는 기운 — 정리할 것을 정리하면 새 길이 열립니다.',
    태: '새로 잉태되는 기운 — 아직 모양은 없어도 씨앗을 심기 좋은 해입니다.',
    양: '천천히 길러지는 기운 — 서두르지 않으면 끝내 자랍니다.'
  };
  var STAGE_LEVEL = { 장생: 4, 목욕: 3, 관대: 4, 건록: 5, 제왕: 5, 쇠: 3, 병: 2, 사: 2, 묘: 2, 절: 2, 태: 3, 양: 3 };
  function stageOf(stem, branch) {
    var start = BRANCHES.indexOf(STAGE_BIRTH[stem]);
    var here = BRANCHES.indexOf(branch);
    var step = stemYang(stem) ? ((here - start) % 12 + 12) % 12 : ((start - here) % 12 + 12) % 12;
    return STAGE_ORDER[step];
  }

  /* ─────────────── 일간별 2027 이야기 ───────────────
   * 정미년의 정(丁)·미(未)가 일간마다 다른 자리로 들어옵니다.
   * 갑목에게 정화는 상관, 미토는 정재 … 이렇게 열 가지가 모두 다릅니다. */
  var BY_STEM = {
    갑: {
      title: '재능을 꺼내 결과로 바꾸는 해',
      overall: '큰 나무에 불이 붙어 열매를 맺는 그림입니다. 정(丁)은 갑목에게 상관 — 머릿속에만 있던 생각을 밖으로 꺼내는 힘이고, 미(未)는 정재 — 그 결과를 손에 쥐는 땅입니다. 보여 주고, 팔고, 만드는 일이 숫자로 돌아오는 흐름입니다.',
      work: '기획을 실제로 내놓는 해입니다. 포트폴리오, 신제품, 새 채널처럼 "보이는 결과물"을 하나 정해 끝까지 내보내세요. 윗사람과 의견이 부딪칠 때는 옳고 그름보다 순서를 먼저 맞추면 잃는 것이 없습니다.',
      money: '노력한 만큼 들어오는 정직한 재물운입니다. 한 방보다 꾸준히 쌓이는 쪽이라, 고정 수입을 늘리거나 단골을 만드는 일에 힘을 실으면 연말에 차이가 납니다.',
      love: '표현이 시원해지는 해라 마음을 전하기 좋습니다. 다만 말이 앞서 상대를 가르치는 말투가 되지 않게만 살피세요. 현실적인 계획을 함께 세우는 관계로 한 단계 나아가기 좋습니다.',
      health: '쏟아 내는 해라 체력이 빨리 닳습니다. 목과 어깨, 눈의 피로를 먼저 챙기세요.'
    },
    을: {
      title: '즐겁게 만들고 넓게 벌리는 해',
      overall: '꽃이 햇볕을 받아 활짝 피는 그림입니다. 정(丁)은 을목에게 식신 — 즐기며 만드는 힘이고, 미(未)는 편재 — 넓게 오가는 재물입니다. 좋아하는 일을 하는데 사람과 기회가 따라붙는 흐름입니다.',
      work: '손으로 만들고 사람을 편하게 하는 일에서 성과가 납니다. 부업이나 새 분야로 판을 넓히기 좋은 해입니다. 여러 갈래를 동시에 벌이게 되니, 끝낼 것 하나를 먼저 정해 두세요.',
      money: '들어오는 길이 여러 갈래로 생깁니다. 대신 편재는 들어온 만큼 나가기도 쉽습니다. 큰 지출은 결정 전에 하루만 재워 두는 습관이 올해의 재테크입니다.',
      love: '함께 먹고 웃는 시간이 관계를 키웁니다. 새 인연은 취미 모임이나 일로 만나는 자리에서 들어오기 쉽습니다. 기념일을 핑계로 둘만의 무언가를 남겨 두기 좋은 해입니다.',
      health: '잘 먹고 잘 노는 해라 과식과 늦은 밤이 쌓이기 쉽습니다. 소화와 수면 리듬만 지키면 충분합니다.'
    },
    병: {
      title: '같은 불끼리 겨루며 판을 키우는 해',
      overall: '태양 곁에 촛불이 하나 더 켜진 그림입니다. 정(丁)은 병화에게 겁재 — 경쟁하고 나누는 힘이고, 미(未)는 상관 — 내 재능을 드러내는 무대입니다. 사람이 몰리고 판이 커지는 대신, 내 몫을 분명히 해야 하는 해입니다.',
      work: '경쟁자가 보이면 실력이 오르는 해입니다. 협업이나 동업 제안이 들어오기 쉬운데, 시작 전에 역할과 몫을 글로 정해 두면 끝까지 좋은 편으로 남습니다. 내 이름을 걸고 보여 주는 일에 힘을 실으세요.',
      money: '벌이도 크지만 나가는 구멍도 같이 생깁니다. 지인과의 돈 거래, 보증, 충동적인 투자는 올해 특히 피하세요. 쓰기 전에 남기는 순서만 지키면 됩니다.',
      love: '열정이 커지는 만큼 자존심도 커집니다. 이기려는 대화보다 들어 주는 대화를 하나만 늘려도 관계가 훨씬 편해집니다. 함께 무언가를 만드는 데이트가 잘 맞는 해입니다.',
      health: '불이 겹친 해라 열이 오르기 쉽습니다. 수분, 수면, 혈압과 심장 리듬을 챙기세요.'
    },
    정: {
      title: '내 불빛으로 오롯이 서는 해',
      overall: '같은 촛불이 하나 더 켜져 빛이 두 배가 되는 그림입니다. 정(丁)은 정화에게 비견 — 스스로 서는 힘이고, 미(未)는 식신 — 편안하게 만들어 내는 땅입니다. 내 방식에 확신이 생기고 그 확신이 결과물로 이어지는 해입니다.',
      work: '독립, 1인 프로젝트, 내 이름을 건 작업에 힘이 실립니다. 남의 속도에 맞추기보다 내 리듬으로 갈 때 더 잘됩니다. 다만 혼자 다 하려다 늦게 지치니, 맡길 일은 일찍 맡기세요.',
      money: '안정적으로 만들어 쌓는 재물운입니다. 한 번에 큰돈보다 꾸준히 팔리는 것, 반복해서 들어오는 것이 올해의 열쇠입니다.',
      love: '편안함이 깊어지는 해입니다. 이미 만나는 사람과는 일상을 함께하는 쪽으로 무게가 실리고, 새 인연은 비슷한 취향을 가진 사람에게서 옵니다. 고집만 반 걸음 내려놓으세요.',
      health: '불의 기운이 강해지는 해입니다. 눈과 심장, 열 관리를 하고 무리한 야근은 줄이세요.'
    },
    무: {
      title: '든든한 지원 위에 내 땅을 넓히는 해',
      overall: '큰 산에 햇볕이 들고 흙이 한 겹 더 쌓이는 그림입니다. 정(丁)은 무토에게 정인 — 나를 돕고 채우는 힘이고, 미(未)는 겁재 — 같은 땅끼리 겨루는 힘입니다. 배우고 인정받기 좋은 해인 동시에, 내 영역을 지키는 힘도 필요한 해입니다.',
      work: '자격증, 공부, 문서와 계약에 유리합니다. 윗사람이나 선배의 도움이 들어오니 혼자 끙끙대지 말고 먼저 물어보세요. 비슷한 일을 하는 사람이 늘어 경쟁이 보이면, 가격보다 신뢰로 승부하는 편이 이깁니다.',
      money: '문서로 들어오는 재물 — 계약, 집, 장기적인 자산에 관심이 갑니다. 대신 주변 사람에게 빌려주거나 함께 투자하는 돈은 돌아오는 속도가 느리니 신중하세요.',
      love: '포근하게 챙겨 주는 사람이 눈에 들어옵니다. 관계를 문서처럼 분명히 하고 싶은 마음이 커지는 해 — 약속, 동거, 결혼 같은 이야기가 자연스럽게 오갑니다.',
      health: '흙이 두꺼워지는 해라 몸이 무거워지기 쉽습니다. 위장과 피부를 챙기고 가볍게라도 매일 움직이세요.'
    },
    기: {
      title: '깊이 배우고 내 편을 만드는 해',
      overall: '밭흙 위로 등불이 비치고 같은 흙이 곁에 쌓이는 그림입니다. 정(丁)은 기토에게 편인 — 남다르게 파고드는 힘이고, 미(未)는 비견 — 함께 서는 동료입니다. 남들과 다른 공부 하나가 무기가 되고, 같은 길을 걷는 사람이 생기는 해입니다.',
      work: '전문성을 쌓기 좋은 해입니다. 낯선 분야, 아무도 안 한 방식에 겁이 없어집니다. 생각이 길어져 시작이 늦어질 수 있으니 "일단 작게 내놓기"를 원칙으로 삼으세요. 동료와 함께하면 속도가 붙습니다.',
      money: '크게 늘리기보다 지키고 정리하는 해입니다. 배움과 장비에 쓰는 돈은 아끼지 않아도 되지만, 남과 똑같이 나누는 구조의 돈은 처음부터 선을 그어 두세요.',
      love: '혼자만의 시간을 존중해 주는 사람과 잘 맞는 해입니다. 친구처럼 편하게 시작한 관계가 깊어지기 쉽습니다. 생각만 하지 말고 마음을 한 번 더 말로 꺼내 주세요.',
      health: '생각이 많아 잠이 얕아지기 쉽습니다. 소화와 수면을 함께 챙기면 컨디션이 금방 돌아옵니다.'
    },
    경: {
      title: '불에 달궈져 이름값이 오르는 해',
      overall: '무쇠가 불 속에서 연장으로 다듬어지는 그림입니다. 정(丁)은 경금에게 정관 — 나를 바로 세우는 자리이고, 미(未)는 정인 — 그 자리를 뒷받침하는 도움입니다. 책임이 커지는 만큼 인정과 자리가 따라오는, 명예 쪽으로 기운 해입니다.',
      work: '승진, 이직, 새 직함, 큰 프로젝트의 책임자 같은 자리가 들어오기 좋습니다. 원칙을 지키는 모습이 곧 신뢰가 됩니다. 문서와 계약은 꼼꼼히 — 올해는 서류 하나가 자리를 만들어 줍니다.',
      money: '안정된 수입이 기본값이 되는 해입니다. 급여, 계약금처럼 정해진 돈이 늘어나는 쪽이고, 투기성 돈은 잘 맞지 않습니다.',
      love: '진지한 관계로 나아가기 좋은 해입니다. 예의 바르고 믿음직한 사람이 눈에 들어오고, 이미 만나는 사이라면 공식적인 약속을 이야기하기 좋습니다.',
      health: '책임감에 긴장이 쌓이는 해입니다. 폐와 호흡기, 피부 건조를 챙기고 쉬는 날을 일정에 먼저 적어 두세요.'
    },
    신: {
      title: '뜨겁게 단련되어 보석이 되는 해',
      overall: '잘 벼린 보석이 불 앞에 놓인 그림입니다. 정(丁)은 신금에게 편관 — 나를 강하게 몰아세우는 힘이고, 미(未)는 편인 — 남다른 감각으로 버티게 해 주는 힘입니다. 압박이 크지만, 그 압박을 견딘 만큼 값이 확 오르는 해입니다.',
      work: '어려운 일, 남들이 피하는 일이 나에게 옵니다. 피하지 않고 맡으면 그게 올해의 대표작이 됩니다. 완벽주의가 나를 갉아먹지 않게, 80점에서 내보내는 연습을 해 보세요.',
      money: '큰 기회보다 버티는 힘이 돈이 되는 해입니다. 무리한 확장이나 빚을 내는 결정은 미루고, 기술과 실력에 투자하세요.',
      love: '강하게 끌리는 인연이 들어오기 쉽습니다. 다만 긴장감 있는 관계일수록 쉬어 가는 시간이 필요합니다. 나를 다그치지 않는 사람이 결국 오래갑니다.',
      health: '스트레스가 몸으로 바로 나오는 해입니다. 피부, 호흡기, 긴장성 두통을 살피고 잠을 최우선으로 두세요.'
    },
    임: {
      title: '마음이 움직이고 결실이 맺히는 해',
      overall: '큰 강물에 등불이 비치는 그림입니다. 정(丁)은 임수에게 정재 — 정직하게 쌓는 재물이자 정임합(丁壬合)으로 나에게 묶여 오는 인연이고, 미(未)는 정관 — 나를 단정히 세우는 자리입니다. 돈과 자리, 사람이 모두 "정(正)"자로 들어오는, 안정을 만드는 해입니다.',
      work: '조직 안에서 자리를 잡거나, 내 일을 제도 안으로 들여놓기 좋은 해입니다. 계약, 등록, 정식 오픈 같은 일이 잘 맞습니다. 흐르던 물이 그릇에 담기는 해이니 답답함보다 안정에 무게를 두세요.',
      money: '꾸준하고 확실한 재물운입니다. 정재가 합으로 들어와 손에 잡히는 돈이 생깁니다. 저축 목표를 숫자로 정해 두면 연말에 그대로 남습니다.',
      love: '열 가지 일간 중 인연이 가장 선명하게 들어오는 해 중 하나입니다. 정임합으로 마음이 묶이니, 진지한 만남이나 관계의 다음 단계를 생각하기 좋습니다.',
      health: '물이 불과 흙을 상대하느라 힘이 빠지는 해입니다. 신장과 방광, 허리, 몸이 차지 않게 챙기세요.'
    },
    계: {
      title: '크게 벌이되 선을 지키는 해',
      overall: '맑은 이슬 앞에 불이 켜지고 단단한 흙이 둑을 쌓는 그림입니다. 정(丁)은 계수에게 편재 — 크게 오가는 재물이고, 미(未)는 편관 — 나를 몰아세우는 책임입니다. 기회가 많은 만큼 감당해야 할 무게도 큰, 도전의 해입니다.',
      work: '새 판을 벌이고 사람을 움직이는 일에서 성과가 납니다. 다만 일이 한꺼번에 몰리니 우선순위를 먼저 정하세요. 정계충(丁癸沖)의 해라 마음이 자주 바뀔 수 있습니다. 큰 결정은 한 번 묵혀 두세요.',
      money: '크게 들어오고 크게 나가는 해입니다. 수익 기회는 분명 있지만, 빚을 내서 하는 확장과 남의 말만 믿는 투자는 피하세요. 들어온 돈의 일부를 바로 떼어 두는 것이 올해의 방어입니다.',
      love: '활동 반경이 넓어지며 새 인연이 많이 들어옵니다. 설렘이 큰 만큼 서두르기 쉬우니, 상대를 충분히 알아 가는 시간을 가지세요.',
      health: '작은 물이 불과 흙에 둘러싸여 마르기 쉬운 해입니다. 수분, 신장, 수면 부족을 가장 먼저 챙기세요.'
    }
  };

  /* 일간의 힘에 따라 덧붙이는 한 줄 */
  var STRENGTH_TEXT = {
    신강: { label: '힘이 넉넉한 사주', body: '원국에 나를 돕는 기운이 넉넉합니다. 쥐고 있는 힘을 밖으로 쓰는 일 — 표현하고, 벌고, 책임지는 일에서 운이 열립니다.' },
    신약: { label: '섬세하게 균형을 잡는 사주', body: '원국에서 나를 받쳐 주는 기운이 조금 가볍습니다. 혼자 다 하려 하기보다 배움과 사람의 도움을 받아들일 때 운이 크게 열립니다.' },
    중화: { label: '균형이 잡힌 사주', body: '나를 돕는 기운과 내가 쓰는 기운이 고르게 섞여 있습니다. 한쪽으로 치우치지 않아 어떤 해가 와도 크게 흔들리지 않습니다.' }
  };

  /* 보태면 좋은 기운이 어느 무리냐에 따라 — 올해 실제로 해 볼 일 한 가지 */
  var FAV_ACTION = {
    비겁: '혼자보다 함께. 같은 목표를 가진 동료나 모임을 하나 만들면 힘이 붙습니다.',
    식상: '쥐고 있지 말고 내놓기. 만든 것, 생각한 것을 밖으로 보여 줄수록 운이 돕니다.',
    재성: '결과를 숫자로 확인하기. 목표 금액, 판매 수, 저축액처럼 손에 잡히는 기준을 세우세요.',
    관성: '책임 있는 자리 맡기. 이름을 걸고 끝까지 해내는 일 하나가 한 해를 끌고 갑니다.',
    인성: '배우고 기대기. 공부, 자격, 좋은 선배 — 나를 채워 주는 쪽에 시간을 쓰세요.'
  };

  /* 보완 기운이 2027년(화·토)과 맞는지에 따라 */
  function yearMatchText(fav, hasFire, hasEarth) {
    var year = ['화', '토'];
    if (year.indexOf(fav) !== -1) {
      return { tone: 'good', text: '2027년은 불(화)과 흙(토)이 주인공인 해입니다. 마침 이 사주에 보태면 좋은 ' + fav + '의 기운이 해에 실려 들어오니, 큰 흐름이 내 편으로 붙는 한 해입니다.' };
    }
    if (fav === '금') {
      return { tone: 'mid', text: '2027년의 흙(토)이 이 사주에 필요한 금(金)을 낳아 줍니다. 해의 기운이 돌고 돌아 도움으로 이어지니, 서두르지 않으면 하반기로 갈수록 좋아집니다.' };
    }
    return { tone: 'care', text: '2027년은 불(화)과 흙(토)이 강한 해인데, 이 사주에 필요한 기운은 ' + fav + '입니다. 해의 기운과 결이 조금 다르니, ' + fav + '의 색·방향·원석을 곁에 두어 균형을 맞추면 좋습니다.' };
  }

  /* ─────────────── 월운 ─────────────── */
  var MONTH_TEXT = {
    비겁: ['사람이 모이고 자신감이 붙는 달. 함께하면 빨라집니다.', '경쟁과 지출이 같이 오는 달. 내 몫부터 챙기세요.'],
    식상: ['아이디어가 결과물로 나오는 달. 보여 주고 내놓기 좋습니다.', '말이 앞서기 쉬운 달. 한 박자 늦춰 말하세요.'],
    재성: ['노력이 숫자로 돌아오는 달. 거래와 판매에 힘을 실으세요.', '돈이 오가는 폭이 큰 달. 큰 지출은 미루세요.'],
    관성: ['책임과 함께 인정이 오는 달. 맡은 일을 끝까지 하세요.', '압박이 큰 달. 일정에 쉬는 날을 먼저 적어 두세요.'],
    인성: ['배우고 채우기 좋은 달. 도움을 청하면 들어옵니다.', '생각이 길어지는 달. 작게라도 먼저 움직이세요.']
  };

  /* ─────────────── 행운 ─────────────── */
  var LUCK = {
    목: { color: '초록 · 청록', dir: '동쪽', num: '3, 8', stones: ['페리도트', '모스아게이트'], ring: '결이 살아 있는 텍스처, 곧게 뻗은 라인' },
    화: { color: '붉은빛 · 코랄', dir: '남쪽', num: '2, 7', stones: ['커넬리언', '가넷'], ring: '각을 살린 면, 빛을 받는 하이폴리시' },
    토: { color: '베이지 · 황토', dir: '가운데 · 남서쪽', num: '5, 10', stones: ['시트린', '스모키 쿼츠'], ring: '도톰한 평반지, 차분한 무광' },
    금: { color: '흰빛 · 은빛', dir: '서쪽', num: '4, 9', stones: ['문스톤', '화이트 쿼츠'], ring: '슬림한 라인, 맑은 은빛 광택' },
    수: { color: '남색 · 검정', dir: '북쪽', num: '1, 6', stones: ['아쿠아마린', '라피스라쥴리'], ring: '물결처럼 흐르는 곡선, 산화 마감' }
  };

  /* ─────────────── 분석 ─────────────── */
  function analyze(saju) {
    var day = saju.pillars.day;
    var me = day.stem, meElem = day.stemElem;
    var pillars = [saju.pillars.year, saju.pillars.month, saju.pillars.day, saju.pillars.hour].filter(Boolean);

    // 오행 분포 — 여덟(또는 여섯) 글자를 그대로 셉니다
    var count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    pillars.forEach(function (p) { count[p.stemElem]++; count[p.branchElem]++; });

    // 일간의 힘 — 월지(계절)는 무겁게, 나머지는 한 글자씩
    var support = 0, total = 0;
    pillars.forEach(function (p) {
      var items = [[p.stemElem, p.role === '일주' ? 0 : 1], [p.branchElem, p.role === '월주' ? 3 : (p.role === '일주' ? 1.5 : 1)]];
      items.forEach(function (it) {
        if (!it[1]) return;
        total += it[1];
        if (it[0] === meElem || it[0] === MOTHER[meElem]) support += it[1];
      });
    });
    var ratio = support / total;
    var strength = ratio >= 0.55 ? '신강' : (ratio <= 0.42 ? '신약' : '중화');

    // 십신 — 일간을 뺀 모든 글자
    var gods = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    var table = pillars.map(function (p) {
      var st = p.role === '일주' ? '일간(나)' : sipsin(me, p.stem);
      var br = sipsinOfBranch(me, p.branch);
      if (p.role !== '일주') gods[GROUP[st]]++;
      gods[GROUP[br]]++;
      return { role: p.role, pillar: p, stemGod: st, branchGod: br };
    });

    // 보완하면 좋은 기운 — 신강이면 내 힘을 쓰는 쪽, 신약이면 나를 채우는 쪽에서 가장 모자란 오행
    var groupElem = {
      비겁: meElem, 인성: MOTHER[meElem], 식상: SAENG[meElem], 재성: GEUK[meElem],
      관성: ELEMS.filter(function (e) { return GEUK[e] === meElem; })[0]
    };
    var candidates = strength === '신강' ? ['식상', '재성', '관성'] : (strength === '신약' ? ['인성', '비겁'] : ['식상', '재성', '관성', '인성', '비겁']);
    var favGroup = candidates.slice().sort(function (a, b) { return count[groupElem[a]] - count[groupElem[b]]; })[0];
    var fav = groupElem[favGroup];
    var favWhy = strength === '중화'
      ? '여덟 글자 중 ' + fav + '의 기운이 가장 적어, 이것을 채우면 균형이 더 단단해집니다.'
      : (strength === '신강'
        ? '힘이 넉넉한 사주라 ' + GROUP_WORD[favGroup].split(' — ')[0] + '인 ' + fav + '의 기운으로 그 힘을 써 줄 때 좋습니다.'
        : '힘을 보태 줄 ' + GROUP_WORD[favGroup].split(' — ')[0] + '인 ' + fav + '의 기운이 들어올 때 좋습니다.');

    // 계절 보완(조후) — 한여름 생에 물이 없거나 한겨울 생에 불이 없으면 그쪽이 먼저
    var mb = saju.pillars.month.branch;
    var season = null;
    if (['사', '오', '미'].indexOf(mb) !== -1 && count.수 === 0) season = '수';
    if (['해', '자', '축'].indexOf(mb) !== -1 && count.화 === 0) season = '화';
    if (season && season !== fav) {
      favWhy = (['사', '오', '미'].indexOf(mb) !== -1 ? '한여름' : '한겨울') + '에 태어났는데 원국에 ' + season +
        '의 기운이 하나도 없어, 계절의 온도를 맞춰 줄 ' + season + '이 먼저 필요합니다.';
      fav = season;
      favGroup = groupOfElem(meElem, fav);
    }

    // 2027 세운
    var yearP = S.yearPillar(YEAR);
    var yStemGod = sipsin(me, yearP.stem);
    var yBranchGod = sipsinOfBranch(me, yearP.branch);
    var stage = stageOf(me, yearP.branch);

    // 원국 지지와 미(未)의 관계
    var relations = [];
    pillars.forEach(function (p) {
      var r = branchRelation(p.branch, yearP.branch);
      if (r && r.type !== '같음') relations.push({ role: p.role, branch: p.branch, type: r.type, label: r.label, text: REL_TEXT[r.type](p) });
    });
    // 원국 천간과 정(丁)의 관계
    var stemRels = [];
    var seen = {};
    pillars.forEach(function (p) {
      if (p.role === '일주') return;   // 일간과 정(丁)의 관계는 일간별 문장에서 이미 다룹니다
      var r = stemRelation(p.stem);
      if (r && !seen[p.stem]) { seen[p.stem] = 1; stemRels.push(r); }
    });

    // 한 해 점수(1~5) — 보완 기운이 해와 맞는지, 일지와의 관계, 십이운성으로 가늠
    var match = yearMatchText(fav);
    var score = 3;
    if (match.tone === 'good') score += 1;
    if (match.tone === 'care') score -= 0.5;
    var dayRel = relations.filter(function (r) { return r.role === '일주'; })[0];
    if (dayRel && dayRel.type === '합') score += 0.5;
    if (dayRel && (dayRel.type === '충' || dayRel.type === '형')) score -= 0.5;
    score += (STAGE_LEVEL[stage] - 3) * 0.25;
    score = Math.max(1, Math.min(5, Math.round(score * 2) / 2));

    // 월운 — 2027 입춘부터 2028 소한까지
    var terms = S.jeolgiOfYear(YEAR);
    var nextIpchun = S.jeolgiOfYear(YEAR + 1)[0];
    var months = terms.map(function (t, k) {
      var mp = S.pillar(((yearP.stemIdx % 5) * 2 + 2 + k) % 10, (2 + k) % 12, '월운');
      var god = sipsin(me, mp.stem);
      var g = GROUP[god];
      var elemGood = (mp.stemElem === fav) || (mp.branchElem === fav);
      var rel = branchRelation(day.branch, mp.branch);
      var mscore = 3 + (elemGood ? 1 : 0) + (rel && rel.type === '합' ? 0.5 : 0) - (rel && (rel.type === '충' || rel.type === '형') ? 1 : 0);
      var end = k < 11 ? terms[k + 1].kst : nextIpchun.kst;
      var line = MONTH_TEXT[g][elemGood || (rel && rel.type === '합') ? 0 : 1];
      var extra = '';
      if (rel && rel.type === '충') extra = '일지와 충(沖) — 이사·이동·관계의 변화가 생기기 쉬운 달입니다.';
      else if (rel && rel.type === '합') extra = '일지와 합(合) — 가까운 사람과 마음이 잘 맞는 달입니다.';
      return {
        pillar: mp, god: god, group: g, good: elemGood,
        score: Math.max(1, Math.min(5, mscore)),
        from: t.kst, to: end, term: t.name,
        line: line, extra: extra
      };
    });

    var luck = LUCK[fav];
    var story = BY_STEM[me];

    // 건강 — 불과 흙이 이미 많은 사주는 한 번 더 짚습니다
    var heat = count.화 + count.토;
    var healthExtra = '';
    if (heat >= Math.ceil(pillars.length * 2 * 0.5)) healthExtra = '원국에 이미 불과 흙이 많은데 해까지 같은 기운이라, 열이 오르고 몸이 붓기 쉽습니다. 물을 자주 마시고 맵고 기름진 음식은 줄이세요.';
    else if (count.수 === 0) healthExtra = '원국에 물(수)의 기운이 없어, 불과 흙의 해에 더 쉽게 마릅니다. 수분과 잠을 1순위로 두세요.';

    return {
      saju: saju, me: me, meElem: meElem,
      count: count, strength: strength, strengthText: STRENGTH_TEXT[strength], ratio: ratio,
      gods: gods, table: table,
      fav: fav, favGroup: favGroup, favWhy: favWhy,
      year: yearP, yStemGod: yStemGod, yBranchGod: yBranchGod,
      stage: stage, stageLine: STAGE_LINE[stage],
      relations: relations, stemRels: stemRels,
      match: match, score: score,
      months: months, luck: luck, story: story, healthExtra: healthExtra,
      action: FAV_ACTION[favGroup]
    };
  }

  ONM.fortune2027 = {
    YEAR: YEAR, analyze: analyze, sipsin: sipsin, GROUP: GROUP, GROUP_WORD: GROUP_WORD,
    LUCK: LUCK, BY_STEM: BY_STEM, josa: { eun: eun, i: i, wa: wa }
  };
})(typeof window !== 'undefined' ? window : globalThis);
