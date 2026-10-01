/*
 * 온명 — 매장 모드 (shop=1)
 * ------------------------------------------------------------------
 * 매장 태블릿에서 상담 화면(shop.html)으로 들어와 스튜디오·주문서를 볼 때,
 * 온라인용 메뉴(일주 리포트 / 커스텀 주문 / 궁합 보기 …)와 푸터를 감추고
 * "상담 화면으로" 줄 하나만 남깁니다. 손님 앞에서 사이트를 돌아다니게 되는 걸 막습니다.
 * 주소에 shop=1 이 없으면 아무 일도 하지 않습니다.
 */
(function (global) {
  'use strict';

  var on = new URLSearchParams(global.location.search).get('shop') === '1';
  if (!on) return;

  document.body.classList.add('is-shop');

  var bar = document.getElementById('shop-bar-back');
  if (bar) {
    bar.addEventListener('click', function (e) {
      e.preventDefault();
      // 상담 화면에서 넘어왔다면 뒤로 가는 편이 입력값이 그대로 남습니다
      if (/shop\.html/.test(document.referrer || '') && global.history.length > 1) global.history.back();
      else global.location.href = 'shop.html';
    });
  }

  /* 매장 모드는 화면을 옮겨도 유지되어야 합니다.
   * 페이지 안의 내부 링크와 history.replaceState 에 shop=1 을 붙여 둡니다. */
  function mark(url) {
    if (!url || /^(https?:|mailto:|tel:|#)/i.test(url)) return url;
    if (/[?&]shop=1(&|$)/.test(url)) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'shop=1';
  }

  function markLinks() {
    var as = document.querySelectorAll('a[href$=".html"], a[href*=".html?"]');
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:)/i.test(h)) continue;
      var m = mark(h);
      // 같은 값을 다시 써 넣으면 아래 감시자가 괜히 한 바퀴 더 돕니다
      if (m !== h) as[i].setAttribute('href', m);
    }
  }
  markLinks();
  // 사양이 바뀔 때마다 주문 링크가 새로 쓰이므로, 바뀐 뒤에도 다시 붙여 줍니다
  new MutationObserver(markLinks).observe(document.body, {
    subtree: true, attributes: true, attributeFilter: ['href']
  });
  /* 감시자가 돌기 전에 눌릴 수도 있으니, 누르는 순간에 한 번 더 확인합니다 */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href');
    if (!h || /^(https?:|mailto:|tel:)/i.test(h)) return;
    var m = mark(h);
    if (m !== h) a.setAttribute('href', m);
  }, true);

  var rs = global.history.replaceState.bind(global.history);
  global.history.replaceState = function (s, t, url) {
    return rs(s, t, typeof url === 'string' ? mark(url) : url);
  };
  var ps = global.history.pushState.bind(global.history);
  global.history.pushState = function (s, t, url) {
    return ps(s, t, typeof url === 'string' ? mark(url) : url);
  };
}(window));
