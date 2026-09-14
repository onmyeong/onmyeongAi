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
      smartstore: 'https://smartstore.naver.com/onmyeong',
      smartstoreLabel: '네이버 스마트스토어',
      kakao: '',
      instagram: '',
      email: 'order@onmyeong.kr',
      // /api/order 로 접수 폼을 보낼지 여부 (Vercel 배포 시 사용)
      useApi: true,
      apiPath: '/api/order',
      // 제작 기간 안내
      leadTime: '주문 확정 후 영업일 기준 10~14일'
    },

    /* ── 가격 (원). 모두 "예상가"이며 최종 금액은 상담에서 확정합니다. ── */
    price: {
      metals: {
        'silver925': { label: '실버 925', mult: 1.0, color: '#c9ccd1' },
        '14k-yellow': { label: '14K 옐로우골드', mult: 3.2, color: '#d9b25f' },
        '14k-white': { label: '14K 화이트골드', mult: 3.3, color: '#d6d9de' },
        '14k-rose': { label: '14K 로즈골드', mult: 3.2, color: '#d49a86' },
        '18k-yellow': { label: '18K 옐로우골드', mult: 4.6, color: '#e0bb56' }
      },
      // 기준 치수(이 치수를 넘어가는 만큼만 추가 요금)
      baseWidth: 3.0,       // mm
      baseThickness: 1.6,   // mm
      perWidthMm: 9000,     // 폭 1mm 추가당 (실버 기준)
      perThicknessMm: 22000,// 두께 1mm 추가당 (실버 기준)
      setting: { none: 0, bezel: 45000, inlay: 38000, prong: 52000, flush: 30000 },
      engraving: 15000,
      couplePairDiscount: 0.05, // 커플 2개 주문 시 5% 할인
      currency: 'KRW'
    },

    /* ── 반지 규격 한계 (스튜디오 슬라이더 범위) ── */
    limits: {
      width: { min: 1.5, max: 12 },      // 반지 폭 = "높이"
      thickness: { min: 0.8, max: 4.5 }, // 반지 두께
      sizeKR: { min: 1, max: 30 }        // 한국 호수
    },

    /* ── 개인정보 안내 ── */
    privacy: '주문 상담에 필요한 최소 정보만 수집하며, 상담 종료 후 파기합니다.'
  };

  global.ONMYEONG = global.ONMYEONG || {};
  global.ONMYEONG.CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
