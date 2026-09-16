/*
 * 온명 — 일주(日柱) 계산기
 * ------------------------------------------------------------------
 * 생년월일(양력)과 태어난 시각으로 60갑자 중 일주를 구합니다.
 *
 * 계산 방식
 *  1) 양력 날짜를 율리우스 적일(JDN)로 변환
 *  2) 60갑자 인덱스 = (JDN - 11) mod 60   (0 = 갑자)
 *     · 검증 기준일: 1900-01-01 = 갑술(甲戌), 2000-01-01 = 무오(戊午)
 *  3) 자시(子時) 처리: 23:00 이후 출생이면 다음 날의 일주로 넘어감 (정통 자시법)
 *
 * 참고
 *  · 한국은 1908~1911, 1954~1961년에 동경 127.5도(UTC+8:30) 표준시를 썼고
 *    1948~1960, 1987~1988년에는 서머타임이 있었습니다. 일주는 23시 경계만
 *    영향을 받으므로, 해당 기간의 밤 11시 전후 출생자는 보정 안내를 띄웁니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};

  /** 그레고리력 → 율리우스 적일 */
  function toJDN(year, month, day) {
    var a = Math.floor((14 - month) / 12);
    var y = year + 4800 - a;
    var m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y +
      Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  /** 표준시가 흔들렸던 구간 — 밤 11시 전후 출생이면 안내가 필요 */
  var TZ_NOTES = [
    { from: [1908, 4, 1], to: [1911, 12, 31], text: '1908~1911년은 동경 127.5도 표준시(UTC+8:30)를 사용했습니다.' },
    { from: [1948, 6, 1], to: [1948, 9, 12], text: '1948년 서머타임 시행 기간입니다.' },
    { from: [1949, 4, 3], to: [1949, 9, 10], text: '1949년 서머타임 시행 기간입니다.' },
    { from: [1950, 4, 1], to: [1950, 9, 10], text: '1950년 서머타임 시행 기간입니다.' },
    { from: [1951, 5, 6], to: [1951, 9, 8], text: '1951년 서머타임 시행 기간입니다.' },
    { from: [1954, 3, 21], to: [1961, 8, 9], text: '1954~1961년은 동경 127.5도 표준시(UTC+8:30)를 사용했습니다.' },
    { from: [1955, 5, 5], to: [1955, 9, 8], text: '1955년 서머타임 시행 기간입니다.' },
    { from: [1956, 5, 20], to: [1956, 9, 29], text: '1956년 서머타임 시행 기간입니다.' },
    { from: [1957, 5, 5], to: [1957, 9, 21], text: '1957년 서머타임 시행 기간입니다.' },
    { from: [1958, 5, 4], to: [1958, 9, 20], text: '1958년 서머타임 시행 기간입니다.' },
    { from: [1959, 5, 3], to: [1959, 9, 19], text: '1959년 서머타임 시행 기간입니다.' },
    { from: [1960, 5, 1], to: [1960, 9, 17], text: '1960년 서머타임 시행 기간입니다.' },
    { from: [1987, 5, 10], to: [1987, 10, 11], text: '1987년 서머타임 시행 기간입니다.' },
    { from: [1988, 5, 8], to: [1988, 10, 9], text: '1988년 서머타임 시행 기간입니다.' }
  ];

  function inRange(y, m, d, from, to) {
    var v = y * 10000 + m * 100 + d;
    return v >= from[0] * 10000 + from[1] * 100 + from[2] &&
      v <= to[0] * 10000 + to[1] * 100 + to[2];
  }

  /**
   * 일주 계산
   * @param {Object} input
   *   year, month, day  : 양력 생년월일
   *   hour, minute      : 태어난 시각 (모르면 null)
   *   lateNightRule     : 'traditional'(기본, 23시 이후 다음 날) | 'midnight'(자정 기준)
   * @returns {Object} { id, hanja, record, notes[] }
   */
  function getIlju(input) {
    var y = Number(input.year), m = Number(input.month), d = Number(input.day);
    if (!y || !m || !d) throw new Error('생년월일을 모두 입력해 주세요.');
    if (m < 1 || m > 12) throw new Error('월은 1~12 사이여야 합니다.');

    var probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
      throw new Error('실제로 존재하지 않는 날짜입니다. 다시 확인해 주세요.');
    }

    var notes = [];
    var jdn = toJDN(y, m, d);
    var hour = (input.hour === null || input.hour === undefined || input.hour === '') ? null : Number(input.hour);
    var rule = input.lateNightRule || 'traditional';

    if (hour === null) {
      notes.push('태어난 시각을 모르면 밤 11시 이후 출생일 때 일주가 하루 달라질 수 있습니다. 시각을 알면 더 정확합니다.');
    } else if (hour >= 23 && rule === 'traditional') {
      jdn += 1;
      notes.push('밤 11시 이후 출생은 자시(子時)로 보아 다음 날의 일주로 계산했습니다.');
    }

    if (hour !== null && (hour >= 22 || hour === 0)) {
      TZ_NOTES.forEach(function (n) {
        if (inRange(y, m, d, n.from, n.to)) {
          notes.push(n.text + ' 자시 경계에 걸쳐 있어 실제 일주가 하루 다를 수 있으니 상담 시 알려주세요.');
        }
      });
    }

    var index = ((jdn - 11) % 60 + 60) % 60;
    var id = ONM.ORDER[index];
    var record = ONM.ILJU[id];

    return {
      id: id,
      index: index,
      hanja: record.hanja,
      record: record,
      notes: notes,
      solar: { year: y, month: m, day: d, hour: hour, minute: input.minute === '' ? null : input.minute }
    };
  }

  /** 오행별 상징 색 — 리포트/반지 미리보기 톤에 사용 */
  var ELEMENT_COLOR = {
    목: '#5f8a5f', 화: '#c1573f', 토: '#a98a56', 금: '#8a8f99', 수: '#4a6b8a'
  };

  ONM.toJDN = toJDN;
  ONM.getIlju = getIlju;
  ONM.ELEMENT_COLOR = ELEMENT_COLOR;
})(typeof window !== 'undefined' ? window : globalThis);
