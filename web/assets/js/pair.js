/*
 * 온명 — 궁합 보기 (링크로 잇기)
 * ------------------------------------------------------------------
 * 서버가 없으므로 상대의 생일을 어디에 맡겨 둘 수 없습니다.
 * 대신 링크 자체에 "보낸 사람의 일주"만 실어 보냅니다.
 *
 *   1. 내가 생일을 넣으면 → 내 일주가 나옵니다
 *   2. 그 일주와 이름만 담은 링크를 만듭니다  pair.html?me=계묘&n=지민
 *   3. 링크를 받은 사람이 자기 생일을 넣으면
 *      → 둘의 일주로 바로 궁합 리포트로 넘어갑니다
 *
 * 링크에는 일주(60가지 중 하나)와 이름만 담깁니다.
 * 생년월일은 만든 사람 쪽에도, 받은 사람 쪽에도 넘어가지 않습니다.
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG = global.ONMYEONG || {};
  var doc = global.document;
  function $(id) { return doc.getElementById(id); }

  /* 성을 뺀 이름 — 리포트와 같은 규칙으로 부릅니다 */
  function givenName(full) {
    var n = String(full || '').trim().replace(/\s+/g, '');
    if (!n) return '';
    if (/^[가-힣]{3}$/.test(n)) return n.slice(1);
    if (/^[가-힣]{4}$/.test(n)) return n.slice(2);   // 남궁·선우 같은 두 자 성
    return n;
  }

  function ilju(y, m, d, errBox) {
    try {
      var res = ONM.getIlju({ year: y, month: m, day: d, hour: '', minute: '' });
      errBox.classList.add('is-hidden');
      return res;
    } catch (e) {
      errBox.textContent = e.message || '생년월일을 다시 확인해 주세요.';
      errBox.classList.remove('is-hidden');
      return null;
    }
  }

  /* ───────────── 링크 만들기 ───────────── */
  function mountMake() {
    var box = $('pair-make');
    box.classList.remove('is-hidden');

    $('p-make').addEventListener('click', function () {
      var err = $('p-error');
      var res = ilju($('p-y').value, $('p-m').value, $('p-d').value, err);
      if (!res) return;

      var name = givenName($('p-name').value);
      var url = location.origin + location.pathname.replace(/[^/]*$/, 'pair.html') +
        '?me=' + encodeURIComponent(res.id) + (name ? '&n=' + encodeURIComponent(name) : '');

      $('p-mine').textContent = (name ? name + ' 님은 ' : '') + res.id + ' (' + res.hanja + ') 일주입니다.';
      $('p-link').value = url;
      $('p-link-box').classList.remove('is-hidden');
      $('p-link').select();
    });

    $('p-copy').addEventListener('click', function () {
      var b = $('p-copy'), url = $('p-link').value;
      var done = function () { b.textContent = '복사했습니다'; setTimeout(function () { b.textContent = '링크 복사'; }, 1600); };
      if (global.navigator.clipboard) {
        global.navigator.clipboard.writeText(url).then(done, function () { $('p-link').select(); });
      } else { $('p-link').select(); doc.execCommand('copy'); done(); }
    });

    var share = $('p-share');
    if (!global.navigator.share) share.classList.add('is-hidden');
    else share.addEventListener('click', function () {
      global.navigator.share({
        title: '온명 · 궁합 보기',
        text: '우리 둘 궁합 한번 볼래? 생일만 넣으면 돼.',
        url: $('p-link').value
      }).catch(function () {});
    });
  }

  /* ───────────── 초대받아 들어온 경우 ───────────── */
  function mountJoin(meId, meName) {
    var rec = ONM.ILJU[meId];
    $('pair-join').classList.remove('is-hidden');

    var who = meName ? meName + ' 님' : rec.id + ' 일주';
    $('j-title').textContent = who + '과의 궁합';
    $('j-lead').textContent =
      who + '이 궁합을 보자고 합니다. ' + rec.id + ' (' + rec.hanja + ') 일주예요. ' +
      '생일을 넣으면 둘의 궁합 리포트가 바로 열립니다.';

    function go() {
      var err = $('j-error');
      var res = ilju($('j-y').value, $('j-m').value, $('j-d').value, err);
      if (!res) return;
      var name = givenName($('j-name').value);
      var q = 'mode=couple&a=' + encodeURIComponent(meId) + '&b=' + encodeURIComponent(res.id) +
        (meName ? '&n=' + encodeURIComponent(meName) : '') +
        (name ? '&n2=' + encodeURIComponent(name) : '');
      location.href = location.pathname.replace(/[^/]*$/, 'index.html') + '?' + q;
    }

    $('j-go').addEventListener('click', go);
    ['j-y', 'j-m', 'j-d', 'j-name'].forEach(function (id) {
      $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  var p = new URLSearchParams(location.search);
  var me = p.get('me');
  if (me && ONM.ILJU[me]) mountJoin(me, (p.get('n') || '').trim());
  else mountMake();
})(window);
