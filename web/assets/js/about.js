/*
 * 온명 — 공방 소개 페이지
 * ------------------------------------------------------------------
 * 글은 전부 config.js 에 있습니다. 주소·영업시간처럼 비워 둔 값은
 * 화면에서 그 줄이 통째로 빠지므로, 채워 넣기만 하면 바로 올라갑니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG;
  var CONFIG = ONM.CONFIG;
  var R = ONM.rings;
  var doc = global.document;
  var $ = function (id) { return doc.getElementById(id); };
  var esc = R.esc;

  var S = CONFIG.studio || {};
  var care = CONFIG.care || {};
  var as = CONFIG.as || {};
  var sizing = CONFIG.sizing || {};

  /* ── 공방 ── */
  $('about-title').textContent = S.title || '온명 공방';
  $('about-lead').textContent = S.lead || '';
  $('about-story').innerHTML = (S.story || []).map(function (s) {
    return '<div class="card trait"><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p></div>';
  }).join('');

  /* ── 위치 · 운영 ── */
  var rows = [];
  if (S.address) rows.push(['주소', S.address]);
  if (S.hours) rows.push(['운영 시간', S.hours]);
  rows.push(['방문', S.addressNote || '방문은 예약제로 운영합니다.']);
  var o = CONFIG.order || {};
  if (o.kakao) rows.push(['카카오톡', o.kakao]);
  if (o.instagram) rows.push(['인스타그램', '@' + String(o.instagram).replace(/^@/, '')]);
  if (o.email) rows.push(['이메일', o.email]);
  rows.push(['제작 기간', '평균 ' + (o.leadDays || 10) + '일 · ' + (o.leadTime || '')]);
  rows.push(['배송', (o.shipFree ? '주문 배송비 없음' : '배송비 별도') +
    (o.pickup ? ' · 공방 방문 수령 가능' : '')]);

  $('visit-table').innerHTML = rows.map(function (r) {
    return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
  }).join('');

  var actions = [];
  if (S.mapUrl) actions.push('<a class="btn" href="' + esc(S.mapUrl) + '" target="_blank" rel="noopener">지도에서 보기</a>');
  actions.push('<a class="btn btn-primary" href="order.html">주문 · 방문 상담</a>');
  $('visit-actions').innerHTML = actions.join('');

  // 주소나 영업시간이 아직 비어 있으면 그 사실을 조용히 알려 둡니다 (운영자만 보는 안내)
  if (!S.address || !S.hours) {
    var note = doc.createElement('p');
    note.className = 'small';
    note.style.margin = '12px 0 0';
    note.textContent = '※ 주소와 운영 시간은 확정되는 대로 이 자리에 올라갑니다.';
    $('visit-table').closest('.card').appendChild(note);
  }

  /* ── 관리법 ── */
  $('care-lead').textContent = care.lead || '';
  $('care-list').innerHTML = (care.items || []).map(function (c) {
    return '<div class="card trait"><h3>' + esc(c[0]) + '</h3><p>' + esc(c[1]) + '</p></div>';
  }).join('');
  $('care-reshine').textContent = care.reshine || '';

  /* ── 사이즈 AS ── */
  $('as-title').textContent = '사이즈 조정 — 받아 보시고 ' + (as.days || 30) + '일 이내 무료';
  $('as-lead').textContent = as.lead || '';
  $('as-note').textContent = as.note || '';
  $('as-limits').textContent = as.limits || '';
  var asContact = $('as-contact');
  asContact.textContent = as.contact || '';
  asContact.classList.toggle('is-hidden', !as.contact);

  /* ── 호수 재는 법 ── */
  $('sizing-lead').textContent = sizing.lead || '';
  $('sizing-ways').innerHTML = (sizing.ways || []).map(function (w, i) {
    return '<div class="card"><p class="eyebrow">방법 ' + (i + 1) + '</p>' +
      '<h3 style="margin-bottom:8px">' + esc(w[0]) + '</h3><p style="margin:0">' + esc(w[1]) + '</p></div>';
  }).join('');
  $('sizing-tips').textContent = sizing.tips || '';

  /* 호수 표 — 계산기가 쓰는 값과 같은 식에서 뽑아 냅니다 */
  var lim = CONFIG.limits.sizeKR;
  var cells = [];
  for (var n = Math.max(1, lim.min); n <= Math.min(30, lim.max); n++) {
    var inner = R.sizeToInnerDiameter(n);
    cells.push('<div class="size-cell"><b>' + n + '호</b>' +
      '<span>둘레 ' + (Math.PI * inner).toFixed(1) + 'mm</span>' +
      '<span class="small">안지름 ' + inner.toFixed(1) + 'mm</span></div>');
  }
  $('size-table').innerHTML = cells.join('');

  $('foot-lead').textContent = '제작 기간 · ' + (o.leadTime || '');
})(typeof window !== 'undefined' ? window : globalThis);
