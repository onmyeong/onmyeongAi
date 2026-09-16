/*
 * 온명 — 사이트 설정값
 * ------------------------------------------------------------------
 * 여기 있는 값만 바꾸면 주문 링크 · 가격 · 연락처가 전부 반영됩니다.
 * 코드는 건드릴 필요 없습니다.
 */
(function (global) {
  'use strict';

  var CONFIG = {
    brand: {
      name: 'ONMYEONG',
      nameKo: '온명',
      tagline: '사주 일주로 읽는 나의 반지'
    },

    /* ── 주문 채널 ───────────────────────────────────────────────
     * smartstore : 네이버 스마트스토어 커스텀 주문 상품 URL
     * kakao      : 카카오톡 채널 상담하기 URL
     * instagram  : 인스타그램 DM
     * email      : 상담 메일 주소
     * 값을 빈 문자열('')로 두면 해당 버튼이 자동으로 숨겨집니다.
     */
    order: {
      /* 스토어 결제는 통신판매업 신고가 끝난 뒤에 엽니다.
       * 신고증이 나오면 아래 smartstore 에 상품 주소를 넣기만 하면
       * 주문 페이지에 "스마트스토어에서 결제" 단계가 자동으로 다시 나타납니다. */
      smartstore: '',
      smartstoreLabel: '네이버 스마트스토어',

      kakao: '',
      instagram: '',
      email: 'order@onmyeong.kr',

      /* 사이트에서 주문서를 바로 접수받을지 여부.
       * 서버가 없는 곳(GitHub Pages 등)에 올리면 접수 단계가 스스로 숨겨지므로
       * 이 값은 그대로 두어도 됩니다.
       * 경로는 상대경로여야 /eeee/ 같은 하위 경로 배포에서도 맞습니다. */
      useApi: true,
      apiPath: 'api/order',

      leadTime: '주문 확정 후 영업일 기준 10~14일',

      // 결제를 아직 열지 않은 동안 주문 페이지 상단에 띄우는 안내
      preOpenNotice: '지금은 제작 상담과 사전 주문서 접수만 받고 있습니다. ' +
        '온라인 결제는 스토어 준비가 끝나는 대로 안내드릴게요.'
    },

    /* ── 가격 (원). 모두 "예상가"이며 최종 금액은 상담에서 확정합니다. ── */
    price: {
      /* 지금은 실버 925 한 가지만 제작합니다.
       * 금 소재를 열 때 아래에 줄을 추가하면 추천·스튜디오·주문서에 자동으로 반영됩니다.
       *   '14k-yellow': { label: '14K 옐로우골드', mult: 3.2, color: '#d9b25f' },
       * mult 는 실버 기준 가격 배수입니다. */
      metals: {
        'silver925': { label: '실버 925', mult: 1.0, color: '#c9ccd1' }
      },

      /* 치수 추가 요금 — 디자인마다 "기본 치수"가 따로 있고(반지 목록에 적힌 가운데 값),
       * 손님이 그보다 키운 만큼만 아래 단가로 더합니다.
       * 기본 치수가 따로 없는 디자인에만 아래 값이 쓰입니다. */
      baseWidth: 3.0,       // mm
      baseThickness: 1.6,   // mm
      perWidthMm: 4000,     // 폭 1mm 추가당
      perThicknessMm: 10000,// 두께 1mm 추가당

      /* 이 치수를 넘어서면 값을 매기지 않고 상담으로 넘깁니다.
       * 이 정도로 두꺼워지면 은 사용량과 세공 난이도가 확 달라져서
       * 자동 계산으로는 맞는 값이 안 나옵니다. */
      consultAbove: { width: 8.0, thickness: 3.5 },

      /* 원석을 물리는 공임은 따로 받지 않습니다. 원석 값에 포함돼 있습니다. */
      setting: { none: 0, bezel: 0, prong: 0, flush: 0 },

      engraving: 15000,
      couplePairDiscount: 0.05, // 커플 2개 주문 시 5% 할인
      currency: 'KRW'
    },

    /* ── 원석 ────────────────────────────────────────────────────
     * 세 갈래입니다.
     *   모이사나이트 — 무색 투명, 라운드 브릴리언트. 크기는 알의 지름(mm).
     *   천연석      — 일주에 맞춘 돌. 각을 내지 않은 캐보션만 취급.
     *   컬러큐빅    — 색이 많아 목록만 보여 주고, 최종 색과 크기는 상담에서 정합니다.
     * ※ 모이사나이트 크기는 캐럿이 아니라 지름(mm) 기준입니다.
     */
    stones: {
      moissanite: {
        label: '모이사나이트',
        note: '무색 투명한 라운드 컷. 반짝임이 가장 강합니다. 고정 공임은 값에 포함돼 있습니다.',
        cut: '라운드 브릴리언트',
        color: '#eef2f7',
        sizes: [
          { mm: 1.5, label: '1.5mm', price: 10000, hint: '작게 포인트로' },
          { mm: 2.0, label: '2.0mm', price: 15000, hint: '은은한 한 알' },
          { mm: 3.0, label: '3.0mm', price: 20000, hint: '가운데 주인공' }
        ],
        settings: ['prong', 'bezel', 'flush']
      },

      natural: {
        label: '천연석',
        note: '일주에 맞춘 원석. 각을 내지 않고 둥글게 갈아낸 캐보션입니다. 고정 공임은 값에 포함돼 있습니다.',
        cut: '캐보션',
        mm: 5.0,
        price: 40000,
        settings: ['bezel']          // 캐보션은 테두리로 감싸는 방식만 가능
      },

      /* 컬러큐빅 — 색과 크기가 워낙 다양해서 값은 상담에서 확정합니다.
       * price 에 숫자를 넣으면 그때부터 예상가에 자동으로 더해집니다. */
      cubic: {
        label: '컬러큐빅',
        note: '색이 다양해 여기서는 종류만 보여 드립니다. 실제 색과 크기는 상담에서 함께 정합니다.',
        cut: '라운드',
        price: null,                 // null = 상담에서 확정
        sizes: [
          { mm: 1.5, label: '1.5mm', hint: '작게 포인트로' },
          { mm: 2.0, label: '2.0mm', hint: '또렷한 한 알' }
        ],
        colors: {
          '살몬':       '#f0876a',
          '시트린':     '#e0a83c',
          '페리도트':   '#9bbf4a',
          '베이비핑크': '#f3c0cd',
          '라벤더':     '#b9a3dd',
          '인디고':     '#4a3c8c',
          '올리브':     '#7d8046',
          '샴페인':     '#e6d3ae',
          '런던블루':   '#24607e',
          '스카이블루': '#8fc6e8',
          '오닉스':     '#232327'
        },
        settings: ['prong', 'bezel', 'flush']
      }
    },

    /* ── 겉면 마감 ───────────────────────────────────────────────
     * 도금과 유화는 같이 못 합니다. 하나를 고르면 다른 하나는 꺼집니다.
     * (도금 위에 유화를 올리면 도금층이 상하고, 유화 위에 도금하면 유화가 덮입니다.)
     */
    plating: {
      none:    { label: '도금 없이 (실버 그대로)', price: 0,     color: '#c9ccd1' },
      white:   { label: '화이트골드 도금',        price: 20000, color: '#dfe2e7' },
      rose:    { label: '로즈골드 도금',          price: 20000, color: '#e0ab97' },
      yellow:  { label: '옐로우골드 도금',        price: 20000, color: '#d9b25f' },
      black:   { label: '블랙 도금',              price: 20000, color: '#3f3f44' },
      antique: { label: '엔틱그레이 도금',        price: 20000, color: '#8a8a86' }
    },

    /* 유화(黝化) — 은을 검게 태워 홈과 결을 짙게 눌러 주는 마감. */
    oxidize: {
      label: '유화 마감',
      price: 10000,
      color: '#6e6a63',
      note: '마찰이 닿는 자리부터 시간이 지나면 벗겨집니다. 반지 바깥면은 손을 쓰면서 계속 스치기 때문에, ' +
        '홈이 깊은 디자인일수록 오래 남고 매끈한 디자인일수록 빨리 옅어집니다.'
    },

    /* 홈과 결에 색을 채워 넣는 마감. 오행 색으로 고를 수 있게 했습니다. */
    epoxy: {
      price: 25000,
      colors: {
        '':     { label: '채우지 않음', color: null },
        '먹':   { label: '먹빛 (수)',   color: '#2f3a44' },
        '쪽':   { label: '쪽빛 (수)',   color: '#2b5a8c' },
        '솔':   { label: '솔빛 (목)',   color: '#4a7c3f' },
        '홍':   { label: '홍빛 (화)',   color: '#b8443a' },
        '황토': { label: '황톳빛 (토)', color: '#b08a52' }
      }
    },

    /* ── 반지 규격 한계 (스튜디오 슬라이더 범위) ── */
    limits: {
      width: { min: 1.5, max: 12 },      // 반지 폭 = "높이"
      thickness: { min: 0.8, max: 4.5 }, // 반지 두께
      sizeKR: { min: 1, max: 30 }        // 한국 호수
    },

    /* ── 십이지 아이콘 ──────────────────────────────────────────
     * custom 을 true 로 바꾸면 코드에 그려 넣은 기본 아이콘 대신
     * 캔바에서 내려받아 넣어 둔 파일을 씁니다.
     *
     * 파일은 web/assets/icons/zodiac/ 안에 지지 이름으로 넣어 주세요.
     *   자.png 축.png 인.png 묘.png 진.png 사.png
     *   오.png 미.png 신.png 유.png 술.png 해.png
     *
     * 배경이 비어 있는(투명) 파일이면 색은 화면에서 자동으로 입혀지므로,
     * 아이콘 자체가 흰색이든 검은색이든 상관없습니다.
     * SVG 로 내려받았다면 ext 를 '.svg' 로 바꾸면 됩니다.
     */
    /* 원석 그림 — 기본은 코드로 그립니다(파일 없이도 동작).
     * 캔바에서 내려받은 원석 사진을 쓰려면 custom 을 true 로 바꾸고
     * assets/icons/stones/ 에 원석 이름 그대로 파일을 넣으세요. (예: 문스톤.png)
     * 이름은 ilju-data.js 의 STONE_COLOR 키와 똑같아야 합니다. */
    stoneIcons: { custom: false, path: 'assets/icons/stones/', ext: '.png' },

    zodiacIcons: {
      custom: true,
      path: 'assets/icons/zodiac/',
      ext: '.png'
    },

    /* ── 개인정보 안내 ── */
    privacy: '주문 상담에 필요한 최소 정보만 수집하며, 상담 종료 후 파기합니다.'
  };

  global.ONMYEONG = global.ONMYEONG || {};
  global.ONMYEONG.CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
