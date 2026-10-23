/*
 * 온명 — 페이지 맨 아래 사업자 정보
 * config.js 의 business 값을 읽어 .site-foot 아래에 한 줄로 붙입니다.
 */
(function () {
  'use strict';

  var biz = window.ONMYEONG && window.ONMYEONG.CONFIG && window.ONMYEONG.CONFIG.business;
  var foot = document.querySelector('.site-foot');
  if (!biz || !foot) return;

  var items = [
    ['상호', biz.name],
    ['대표', biz.owner],
    ['사업자등록번호', biz.regNo],
    ['통신판매업 신고', biz.mailOrderNo],
    ['주소', biz.address],
    ['전화', biz.phone],
    ['이메일', biz.email]
  ].filter(function (it) { return it[1]; });

  var box = document.createElement('div');
  box.className = 'wrap site-biz';
  items.forEach(function (it) {
    var span = document.createElement('span');
    span.textContent = it[0] + ' ' + it[1];
    box.appendChild(span);
  });
  foot.appendChild(box);
})();
