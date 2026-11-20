/*
 * 온명 — 사주 팔자(四柱八字) 계산기
 * ------------------------------------------------------------------
 * 일주만 보던 saju.js 위에 년주 · 월주 · 시주를 더해 여덟 글자를 세웁니다.
 *
 * 계산 방식
 *  1) 일주   saju.js 의 getIlju 그대로 (밤 11시 이후는 다음 날 = 정통 자시법)
 *  2) 년주   한 해의 시작은 1월 1일이 아니라 입춘(立春, 태양황경 315°)
 *  3) 월주   달의 경계는 음력 초하루가 아니라 12절기(節氣, 태양황경 315°부터 30°씩)
 *            · 월간은 년간에서 정합니다 (갑기년 → 병인월부터)
 *  4) 시주   두 시간 단위 열두 시진, 시간은 일간에서 정합니다 (갑기일 → 갑자시부터)
 *
 * 절기 시각은 태양의 겉보기 황경을 직접 계산해 찾습니다 (Meeus, Astronomical Algorithms 25장).
 * 오차는 1~2분 안쪽이라, 절기 시각에 바짝 붙어 태어난 분만 안내 문구를 띄웁니다.
 * 시각은 입력한 시계 시각(한국 표준시) 그대로 씁니다. saju.js 와 같은 기준입니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};

  var STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var STEM_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCH_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var STEM_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
  var BRANCH_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
  var ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

  /* 12절기 — 월의 경계. 인월(寅月)을 여는 입춘부터 차례로 */
  var JEOL = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'];

  var KST = 9; // 한국 표준시 (UTC+9)

  function mod(a, n) { return ((a % n) + n) % n; }
  var D2R = Math.PI / 180;

  /* ─────────────── 천문 계산 ─────────────── */

  /** 그레고리력 날짜·시각(UT) → 율리우스일 */
  function julianDay(y, m, d, hourUT) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + (hourUT || 0) / 24;
  }

  /** 율리우스일 → 그레고리력 (UT) */
  function fromJulianDay(jd) {
    var z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
    var a = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var b = a + 1524, c = Math.floor((b - 122.1) / 365.25);
    var d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
    var day = b - d - Math.floor(30.6001 * e) + f;
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    return { year: year, month: month, day: day };
  }

  /** 역학시(TT)와 세계시(UT)의 차이(초) — NASA 다항식 근사 */
  function deltaT(year) {
    var t;
    if (year < 1900) { t = (year - 1860); return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t * t * t - 0.0004473624 * t * t * t * t + t * t * t * t * t / 233174; }
    if (year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t; }
    if (year < 1941) { t = year - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t; }
    if (year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t; }
    if (year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    t = (year - 1820) / 100; return -20 + 32 * t * t - 0.5628 * (2150 - year);
  }

  /* VSOP87 지구 황경 주요 항 (Meeus 부록 3에서 큰 항만 추림) — [A, B, C] → A·cos(B + C·τ) */
  var VSOP_L = [
    [[175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517], [3497, 2.7441, 5753.3849],
      [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715], [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097],
      [1324, 0.7425, 11506.7698], [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
      [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694], [753, 2.533, 5507.553],
      [505, 4.583, 18849.228], [492, 4.205, 775.523], [357, 2.92, 0.067], [317, 5.849, 11790.629],
      [284, 1.899, 796.298], [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
      [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299], [132, 3.411, 2942.463],
      [126, 1.083, 20.775], [115, 0.645, 0.98], [103, 0.636, 4694.003], [102, 0.976, 15720.839],
      [102, 4.267, 7.114], [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
      [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15]],
    [[628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517], [425, 1.59, 3.523],
      [119, 5.796, 26.298], [109, 2.966, 1577.344], [93, 2.59, 18849.23], [72, 1.14, 529.69],
      [68, 1.87, 398.15], [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
      [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11], [21, 5.34, 0.98],
      [19, 1.85, 5486.78], [19, 4.97, 213.3], [17, 2.99, 6275.96], [16, 0.03, 2544.31]],
    [[52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152], [27, 0.05, 3.52],
      [16, 5.19, 26.3], [16, 3.68, 155.42], [10, 0.76, 18849.23]],
    [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15]],
    [[114, 3.142, 0]],
    [[1, 3.14, 0]]
  ];

  /** 태양의 겉보기 황경(도) — 입력은 UT 율리우스일. 오차 1초각 수준(시각으로 1분 안쪽) */
  function sunLongitude(jdUT) {
    var year = 2000 + (jdUT - 2451545) / 365.25;
    var jde = jdUT + deltaT(year) / 86400;
    return sunLongitudeTT(jde);
  }

  function sunLongitudeTT(jde) {
    var tau = (jde - 2451545.0) / 365250;
    var L = 0, pow = 1;
    for (var n = 0; n < VSOP_L.length; n++) {
      var sum = 0;
      for (var k = 0; k < VSOP_L[n].length; k++) {
        var t = VSOP_L[n][k];
        sum += t[0] * Math.cos(t[1] + t[2] * tau);
      }
      L += sum * pow;
      pow *= tau;
    }
    L = L / 1e8 / D2R;                       // 라디안 → 도 (지구 일심 황경)
    var lon = L + 180 - 0.09033 / 3600;      // 지구에서 본 태양 + FK5 보정
    var T = tau * 10;
    var omega = (125.04452 - 1934.136261 * T) * D2R;
    var Ls = (280.4665 + 36000.7698 * T) * D2R;
    var Lm = (218.3165 + 481267.8813 * T) * D2R;
    var dPsi = (-17.20 * Math.sin(omega) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * omega)) / 3600;
    var aberration = -20.4898 / 3600;        // 거리 1AU 근사
    return mod(lon + dPsi + aberration, 360);
  }

  /** 태양이 황경 target(도)에 닿는 순간 — 주어진 UT 율리우스일 근처에서 찾습니다 */
  function findLongitude(target, jdGuess) {
    var jd = jdGuess;
    for (var k = 0; k < 50; k++) {
      var diff = mod(target - sunLongitude(jd) + 180, 360) - 180;
      if (Math.abs(diff) < 1e-6) break;
      jd += diff / 360 * 365.2422;
    }
    return jd;
  }

  /** UT 율리우스일 → 한국 시각 { year, month, day, hour, minute } */
  function toKst(jdUT) {
    var g = fromJulianDay(jdUT + KST / 24);
    var day = Math.floor(g.day);
    var mins = Math.round((g.day - day) * 1440);
    if (mins >= 1440) { mins -= 1440; day += 1; }   // 반올림이 자정을 넘긴 경우 (드묾)
    return { year: g.year, month: g.month, day: day, hour: Math.floor(mins / 60), minute: mins % 60 };
  }

  /**
   * 한 해의 12절기 시각 (한국 시각)
   * @returns 입춘(그해 2월)부터 다음 해 소한(1월)까지 12개
   */
  function jeolgiOfYear(year) {
    var list = [];
    for (var k = 0; k < 12; k++) {
      var lon = mod(315 + 30 * k, 360);
      // 입춘은 대략 2월 4일, 이후 약 30.4일 간격
      var guess = julianDay(year, 2, 4, 0) + k * 30.44;
      var jd = findLongitude(lon, guess);
      list.push({ name: JEOL[k], longitude: lon, jd: jd, kst: toKst(jd) });
    }
    return list;
  }

  /* ─────────────── 기둥 만들기 ─────────────── */

  function pillar(stemIdx, branchIdx, role) {
    return {
      role: role,
      stem: STEMS[stemIdx], branch: BRANCHES[branchIdx],
      stemIdx: stemIdx, branchIdx: branchIdx,
      id: STEMS[stemIdx] + BRANCHES[branchIdx],
      hanja: STEM_HANJA[stemIdx] + BRANCH_HANJA[branchIdx],
      stemElem: STEM_ELEM[stemIdx], branchElem: BRANCH_ELEM[branchIdx],
      animal: ANIMAL[branchIdx]
    };
  }

  /** 60갑자 순번(0=갑자) → 기둥 */
  function pillarFromIndex(idx, role) {
    return pillar(mod(idx, 10), mod(idx, 12), role);
  }

  /** 한 해(세운)의 기둥 — 2027 → 정미 */
  function yearPillar(year) {
    return pillarFromIndex(year - 4, '년주');
  }

  /**
   * 사주 팔자
   * @param {Object} input year, month, day, hour(0~23 또는 ''), minute(선택)
   * @returns {Object} { pillars:{year,month,day,hour|null}, list[], notes[], ilju(saju.js 결과), hasHour }
   */
  function getSaju(input) {
    var ilju = ONM.getIlju(input);            // 날짜 검사 · 자시 처리 · 안내 문구까지 그대로 씁니다
    var y = Number(input.year), m = Number(input.month), d = Number(input.day);
    var hasHour = !(input.hour === null || input.hour === undefined || input.hour === '');
    var hour = hasHour ? Number(input.hour) : 12;
    var minute = (input.minute === null || input.minute === undefined || input.minute === '') ? (hasHour ? 30 : 0) : Number(input.minute);
    var notes = ilju.notes.slice();

    // 태어난 순간 (UT)
    var jdBirth = julianDay(y, m, d, hour + minute / 60 - KST);
    var lon = sunLongitude(jdBirth);

    // 년주 — 입춘 전이면 전년도
    var jeol = jeolgiOfYear(y);
    var ipchun = jeol[0].jd;
    var sajuYear = jdBirth < ipchun ? y - 1 : y;
    var yearP = pillarFromIndex(sajuYear - 4, '년주');

    // 월주 — 태양황경으로 몇 번째 달인지 (0 = 인월)
    var mIdx = Math.floor(mod(lon - 315, 360) / 30);
    var monthBranch = mod(2 + mIdx, 12);
    var monthStem = mod((yearP.stemIdx % 5) * 2 + 2 + mIdx, 10);
    var monthP = pillar(monthStem, monthBranch, '월주');

    // 일주
    var dayIdx = ilju.index;
    var dayP = pillarFromIndex(dayIdx, '일주');

    // 시주
    var hourP = null;
    if (hasHour) {
      var hb = Math.floor(mod(hour + 1, 24) / 2);
      var hs = mod((dayP.stemIdx % 5) * 2 + hb, 10);
      hourP = pillar(hs, hb, '시주');
    } else {
      notes.push('태어난 시각을 모르셔서 시주(時柱)를 빼고 여섯 글자로 풀었습니다. 시각을 알면 여덟 글자가 모두 채워집니다.');
    }

    // 절기 경계에 바짝 붙은 경우 — 년주·월주가 바뀔 수 있음을 알립니다
    var nearest = null;
    [jeolgiOfYear(y - 1), jeol, jeolgiOfYear(y + 1)].forEach(function (list) {
      list.forEach(function (t) {
        var gap = Math.abs(t.jd - jdBirth) * 24;
        if (!nearest || gap < nearest.gap) nearest = { term: t, gap: gap };
      });
    });
    if (nearest) {
      var limit = hasHour ? 2 : 24;
      if (nearest.gap < limit) {
        var k = nearest.term.kst;
        notes.push(nearest.term.name + '(' + k.month + '월 ' + k.day + '일 ' + pad(k.hour) + ':' + pad(k.minute) +
          ') 바로 곁에 태어나셨습니다. 절기를 넘기 전과 후에 ' +
          (nearest.term.name === '입춘' ? '년주와 월주가' : '월주가') + ' 달라지니, ' +
          (hasHour ? '분 단위 출생 시각을 아시면 상담 때 알려 주세요.' : '태어난 시각을 넣어 다시 확인해 주세요.'));
      }
    }

    var list = [hourP, dayP, monthP, yearP];  // 명식은 오른쪽(년)에서 왼쪽(시)으로 읽습니다
    return {
      pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
      list: list,
      hasHour: hasHour,
      sajuYear: sajuYear,
      monthIndex: mIdx,
      sunLongitude: lon,
      jdBirth: jdBirth,
      birthYear: y,
      gender: input.gender || '',
      notes: notes,
      ilju: ilju
    };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  ONM.saju = {
    STEMS: STEMS, BRANCHES: BRANCHES, STEM_HANJA: STEM_HANJA, BRANCH_HANJA: BRANCH_HANJA,
    STEM_ELEM: STEM_ELEM, BRANCH_ELEM: BRANCH_ELEM, ANIMAL: ANIMAL, JEOL: JEOL,
    julianDay: julianDay, sunLongitude: sunLongitude, sunLongitudeTT: sunLongitudeTT, jeolgiOfYear: jeolgiOfYear,
    pillar: pillar, pillarFromIndex: pillarFromIndex, yearPillar: yearPillar,
    getSaju: getSaju
  };
})(typeof window !== 'undefined' ? window : globalThis);
