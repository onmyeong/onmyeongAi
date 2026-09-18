/*
 * 온명 — 일주 지도
 * ------------------------------------------------------------------
 * 내 일주를 한가운데 두고, 사람들이 궁합 점수만큼 가까이 놓이는 지도입니다.
 *
 * 서버가 없어도 돌아가도록 "링크를 이어 돌리는" 방식으로 만들었습니다.
 *   1. 내 지도를 만들어 링크를 보냅니다.
 *   2. 받은 사람이 생일을 넣으면 그 사람 자리가 지도에 놓이고,
 *      그 사람이 포함된 새 링크가 만들어집니다.
 *   3. 그 링크를 단체방에 다시 돌리면 다음 사람이 또 붙습니다.
 *
 * 주소 형식
 *   map.html?me=병자&n=지민&p=서준.정사~하늘.갑인
 */
(function (global) {
  'use strict';

  var ONM = global.ONMYEONG;
  var doc = global.document;
  var $ = function (id) { return doc.getElementById(id); };
  var Q = new URLSearchParams(location.search);

  var MAX = 24;                 // 지도에 올릴 수 있는 사람 수
  var SEP = '~', DOT = '.';

  var state = {
    me: Q.get('me') || '',
    myName: (Q.get('n') || '').trim(),
    people: []
  };

  /* ───────────── 주소 ↔ 사람 목록 ───────────── */
  function readPeople(raw) {
    if (!raw) return [];
    return String(raw).split(SEP).map(function (chunk) {
      var at = chunk.lastIndexOf(DOT);
      if (at < 1) return null;
      var name = chunk.slice(0, at).trim();
      var ilju = chunk.slice(at + 1).trim();
      if (!ONM.ILJU[ilju]) return null;
      return { name: name || ilju, ilju: ilju };
    }).filter(Boolean).slice(0, MAX);
  }

  function writePeople(list) {
    return list.map(function (p) { return p.name.replace(/[~.]/g, ' ') + DOT + p.ilju; }).join(SEP);
  }

  function mapUrl(people) {
    var base = location.origin + location.pathname;
    var q = 'me=' + encodeURIComponent(state.me);
    if (state.myName) q += '&n=' + encodeURIComponent(state.myName);
    var p = writePeople(people || state.people);
    if (p) q += '&p=' + encodeURIComponent(p);
    return base + '?' + q;
  }

  /* ───────────── 자리 잡기 ─────────────
   * 궁합 점수가 높을수록 가운데로 당겨 놓습니다.
   * 각도는 일주 이름에서 뽑아 늘 같은 자리에 오게 하고, 겹치면 조금씩 밀어 냅니다. */
  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
    return h;
  }

  function place(list, rec) {
    var used = [];
    return list.map(function (p) {
      var other = ONM.ILJU[p.ilju];
      var cp = ONM.compat.compare(rec, other);
      // 97점이면 거의 붙고, 38점이면 가장 바깥
      var t = Math.max(0, Math.min(1, (cp.score - 35) / 62));
      var r = 84 - t * 54;                      // % 기준 반지름 (30 ~ 84) — 가장자리가 잘리지 않게
      var ang = hash(p.ilju + p.name) % 360;
      // 같은 각도에 몰리지 않게 살짝씩 비켜 놓습니다
      while (used.some(function (u) { return Math.abs(u - ang) < 16 || Math.abs(u - ang) > 344; })) {
        ang = (ang + 17) % 360;
      }
      used.push(ang);
      return { p: p, cp: cp, r: r, ang: ang, other: other };
    }).sort(function (x, y) { return y.cp.score - x.cp.score; });
  }

  /* ───────────── 그리기 ───────────── */
  function draw() {
    var rec = ONM.ILJU[state.me];
    if (!rec) return;

    var color = ONM.zodiacColor(rec);
    doc.body.style.setProperty('--accent', color.solid);
    doc.body.style.setProperty('--accent-ink', color.ink);
    doc.body.style.setProperty('--accent-tint', color.tint);

    $('map-title').textContent = (state.myName ? state.myName + ' 님' : rec.id + ' 일주') + '의 일주 지도';
    $('map-sub').textContent = rec.id + '(' + rec.hanja + ') · ' + ONM.iljuPhrase(rec) +
      ' · 지금 ' + state.people.length + '명이 들어와 있습니다.';

    $('map-center').innerHTML = ONM.zodiacSvg(rec.branch, { label: rec.id + ' 일주' });
    $('map-center-name').textContent = state.myName || rec.id;

    var placed = place(state.people, rec);
    $('map-dots').innerHTML = placed.map(function (it, i) {
      var c = ONM.zodiacColor(it.other);
      var rad = it.ang * Math.PI / 180;
      var x = 50 + Math.cos(rad) * it.r / 2;
      var y = 50 + Math.sin(rad) * it.r / 2;
      return '<a class="map-dot" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;--dot:' + c.solid + '"' +
        ' href="index.html?mode=couple&a=' + encodeURIComponent(state.me) + '&b=' + encodeURIComponent(it.p.ilju) + '"' +
        ' title="' + ONM.rings.esc(it.p.name + ' · ' + it.p.ilju + ' · 어울림 ' + it.cp.score + '점') + '">' +
        '<span class="pin">' + ONM.zodiacSvg(it.other.branch, { label: it.p.ilju }) + '</span>' +
        '<span class="tag"><b>' + ONM.rings.esc(it.p.name) + '</b><em>' + it.cp.score + '</em></span></a>';
    }).join('');

    $('map-list').innerHTML = placed.length
      ? placed.map(function (it) {
        return '<a class="map-row" href="index.html?mode=couple&a=' + encodeURIComponent(state.me) +
          '&b=' + encodeURIComponent(it.p.ilju) + '">' +
          '<span class="n">' + ONM.rings.esc(it.p.name) + '</span>' +
          '<span class="small">' + it.p.ilju + ' · ' + ONM.rings.esc(ONM.iljuPhrase(it.other)) + '</span>' +
          '<span class="score">' + it.cp.score + '</span>' +
          '<span class="small grade">' + ONM.rings.esc(it.cp.grade) + '</span></a>';
      }).join('')
      : '<p class="small" style="margin:0">아직 아무도 없습니다. 아래 링크를 친구에게 보내면 한 명씩 자리가 채워집니다.</p>';

    $('map-url').value = mapUrl();
    $('map-count').textContent = state.people.length + ' / ' + MAX;
  }

  /* ───────────── 내 자리 놓기 ───────────── */
  function addMe(name, res) {
    var id = res.record.id;
    // 이미 같은 이름이 있으면 덮어씁니다
    state.people = state.people.filter(function (p) { return p.name !== name; });
    if (state.people.length >= MAX) {
      $('join-result').textContent = '지도가 꽉 찼습니다 (' + MAX + '명).';
      return;
    }
    state.people.push({ name: name || id, ilju: id });
    draw();

    var cp = ONM.compat.compare(ONM.ILJU[state.me], res.record);
    $('join-result').innerHTML =
      '<b>' + ONM.rings.esc(name || id) + ' 님은 ' + id + '(' + res.record.hanja + ') 일주</b> — ' +
      ONM.rings.esc(ONM.iljuPhrase(res.record)) + '.<br>' +
      (state.myName ? ONM.rings.esc(state.myName) + ' 님과' : '이 지도 주인과') +
      ' 어울림 <b>' + cp.score + '점 · ' + ONM.rings.esc(cp.grade) + '</b>. ' +
      ONM.rings.esc(cp.headline) +
      '<br><br>아래 링크를 지도 주인에게 다시 보내 주세요. 그래야 내 자리가 남습니다.';
    $('join-after').classList.remove('is-hidden');
    $('join-report').href = 'index.html?mode=couple&a=' + encodeURIComponent(state.me) +
      '&b=' + encodeURIComponent(id);
    $('join-mine').href = 'index.html?ilju=' + encodeURIComponent(id);
  }

  /* ───────────── 시작 ───────────── */
  (function boot() {
    state.people = readPeople(Q.get('p'));

    if (!ONM.ILJU[state.me]) {
      // 지도 주인이 없으면 내 지도를 만드는 화면
      $('map-empty').classList.remove('is-hidden');
      $('map-main').classList.add('is-hidden');
      $('new-go').addEventListener('click', function () {
        var y = $('new-y').value, m = $('new-m').value, d = $('new-d').value;
        if (!y || !m || !d) { $('new-result').textContent = '생년월일을 모두 넣어 주세요.'; return; }
        var res;
        try { res = ONM.getIlju({ year: y, month: m, day: d, hour: '' }); }
        catch (err) { $('new-result').textContent = err.message; return; }
        var nm = ($('new-name').value || '').trim();
        location.href = location.pathname + '?me=' + encodeURIComponent(res.record.id) +
          (nm ? '&n=' + encodeURIComponent(nm) : '');
      });
      return;
    }

    draw();

    $('join-go').addEventListener('click', function () {
      var y = $('join-y').value, m = $('join-m').value, d = $('join-d').value;
      var out = $('join-result');
      if (!y || !m || !d) { out.textContent = '생년월일을 모두 넣어 주세요.'; return; }
      var res;
      try { res = ONM.getIlju({ year: y, month: m, day: d, hour: '' }); }
      catch (err) { out.textContent = err.message; return; }
      addMe(($('join-name').value || '').trim(), res);
    });

    $('map-copy').addEventListener('click', function () {
      $('map-url').value = mapUrl();
      if (ONM.share) ONM.share.copyLink(mapUrl(), this);
    });
    $('map-share').addEventListener('click', function () {
      var who = state.myName ? state.myName + ' 님' : state.me + ' 일주';
      if (ONM.share) {
        ONM.share.share({
          title: '온명 — 일주 지도',
          text: who + '의 일주 지도예요. 생일만 넣으면 내 자리가 표시됩니다.',
          url: mapUrl()
        }, this);
      }
    });
  })();
})(typeof window !== 'undefined' ? window : globalThis);
