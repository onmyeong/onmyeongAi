/*
 * 온명 — 관리자 화면
 * 이벤트 신청 확인 · 주문/제작 단계 관리 · A/S · 리뷰 숨김 · 회원 목록
 * 권한은 데이터베이스(RLS)가 지킵니다. 이 화면은 보여 주는 역할만 합니다.
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG, M = ONM.member, esc = M.esc, db;
  function $(id) { return document.getElementById(id); }
  function day(t) { if (!t) return ''; var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate(); }
  var STEPS = ['접수', '왁스', '주물', '광택', '완성', '수령'];
  var members = [];

  function sel(options, value, cls, id) {
    return '<select class="' + cls + '" data-id="' + id + '">' + options.map(function (o) {
      return '<option' + (o === value ? ' selected' : '') + '>' + o + '</option>';
    }).join('') + '</select>';
  }

  /* 탭 */
  document.querySelector('.ad-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    Array.prototype.forEach.call(document.querySelectorAll('.ad-pane'), function (p) {
      p.classList.toggle('is-hidden', p.getAttribute('data-pane') !== b.getAttribute('data-tab'));
    });
  });

  /* ───────────── 회원 ───────────── */
  function loadMembers() {
    return db.from('profiles').select('id,nickname,email,ilju,partner_id,created_at').order('created_at', { ascending: false }).then(function (r) {
      members = r.data || [];
      $('ad-mb-count').textContent = members.length + '명';
      $('ad-mb').innerHTML = members.map(function (m) {
        return '<tr><td>' + day(m.created_at) + '</td><td>' + esc(m.nickname) + '</td><td>' + esc(m.email || '') + '</td><td>' + esc(m.ilju || '') + '</td><td>' + (m.partner_id ? '💞' : '') + '</td></tr>';
      }).join('');
      $('od-users').innerHTML = members.map(function (m) {
        return '<option value="' + esc((m.nickname || '') + ' · ' + (m.email || m.id.slice(0, 8))) + '"></option>';
      }).join('');
    });
  }
  function memberName(id) {
    var m = members.filter(function (x) { return x.id === id; })[0];
    return m ? m.nickname : '';
  }

  /* ───────────── 이벤트 ───────────── */
  var entries = [];
  function loadEvents() {
    db.from('event_entries').select('*, reviews(body,rating)').order('created_at', { ascending: true }).then(function (r) {
      entries = r.data || [];
      $('ad-ev-count').textContent = entries.length + '건';
      $('ad-ev').innerHTML = entries.map(function (x) {
        return '<tr><td><b>' + esc(x.code) + '</b></td><td>' + esc(memberName(x.user_id)) + '</td>' +
          '<td>' + (x.reviews ? '★' + x.reviews.rating + ' ' + esc(x.reviews.body.slice(0, 40)) : '') + '</td>' +
          '<td>' + (x.proof_url ? '<a href="' + esc(x.proof_url) + '" target="_blank" rel="noopener">게시물</a> ' : '') +
            (x.proof_path ? '<button type="button" class="link-btn ev-img" data-path="' + esc(x.proof_path) + '">캡처 보기</button>' : '') + '</td>' +
          '<td>' + day(x.created_at) + '</td><td>' + sel(['신청', '확인', '당첨', '미당첨'], x.status, 'ev-status', x.id) + '</td></tr>';
      }).join('') || '<tr><td colspan="6">아직 신청이 없어요.</td></tr>';
    });
  }
  $('ad-ev').addEventListener('click', function (e) {
    var b = e.target.closest('.ev-img'); if (!b) return;
    db.storage.from('event-proofs').createSignedUrl(b.getAttribute('data-path'), 300).then(function (r) {
      if (r.data) window.open(r.data.signedUrl, '_blank', 'noopener');
    });
  });
  $('ad-ev').addEventListener('change', function (e) {
    var s = e.target.closest('.ev-status'); if (!s) return;
    db.from('event_entries').update({ status: s.value }).eq('id', s.getAttribute('data-id')).then(function (r) { if (r.error) alert('바꾸지 못했어요.'); });
  });
  $('ad-ev-pick').addEventListener('click', function () {
    var pool = entries.filter(function (x) { return x.status === '신청' || x.status === '확인'; });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    var pick = pool.slice(0, 3);
    $('ad-ev-picked').textContent = pick.length
      ? '뽑힌 번호: ' + pick.map(function (x) { return x.code + '(' + memberName(x.user_id) + ')'; }).join(', ') + ' — 확정하려면 상태를 "당첨"으로 바꿔 주세요.'
      : '뽑을 신청이 없어요.';
  });

  /* ───────────── 주문 · 제작 ───────────── */
  var orders = [];
  function loadOrders() {
    db.from('orders').select('*').order('created_at', { ascending: false }).then(function (r) {
      orders = r.data || [];
      $('ad-od').innerHTML = orders.map(function (o) {
        return '<tr><td><b>' + esc(o.title) + '</b><br><span class="small">' + esc(o.kind || '') + '</span></td>' +
          '<td>' + esc(o.user_id ? memberName(o.user_id) + ' (회원)' : (o.customer_name || '')) + '<br><span class="small">' + esc(o.contact || '') + '</span></td>' +
          '<td class="small">' + [o.size ? o.size + '호' : '', o.engraving ? '“' + esc(o.engraving) + '”' : '', o.visit_date || ''].filter(Boolean).join('<br>') + '</td>' +
          '<td>' + sel(STEPS, o.status, 'od-status', o.id) + '</td>' +
          '<td><input class="od-memo" data-id="' + o.id + '" value="' + esc(o.memo || '') + '" placeholder="메모"></td>' +
          '<td><button type="button" class="link-btn od-del" data-id="' + o.id + '">삭제</button></td></tr>';
      }).join('') || '<tr><td colspan="6">등록된 주문이 없어요.</td></tr>';
    });
  }
  $('ad-od').addEventListener('change', function (e) {
    var s = e.target.closest('.od-status'), m = e.target.closest('.od-memo');
    if (s) db.from('orders').update({ status: s.value, updated_at: new Date().toISOString() }).eq('id', s.getAttribute('data-id')).then(function (r) { if (r.error) alert('바꾸지 못했어요.'); });
    if (m) db.from('orders').update({ memo: m.value || null }).eq('id', m.getAttribute('data-id'));
  });
  $('ad-od').addEventListener('click', function (e) {
    var d = e.target.closest('.od-del'); if (!d || !confirm('이 주문을 지울까요?')) return;
    db.from('orders').delete().eq('id', d.getAttribute('data-id')).then(loadOrders);
  });
  $('od-add').addEventListener('click', function () {
    var title = $('od-title').value.trim();
    if (!title) { $('od-error').textContent = '반지 이름을 적어 주세요.'; $('od-error').classList.remove('is-hidden'); return; }
    var picked = $('od-user').value.trim(), uid = null;
    if (picked) {
      var m = members.filter(function (x) { return picked === (x.nickname || '') + ' · ' + (x.email || x.id.slice(0, 8)); })[0];
      if (!m) { $('od-error').textContent = '회원을 목록에서 골라 주세요. 회원이 아니면 칸을 비워 두세요.'; $('od-error').classList.remove('is-hidden'); return; }
      uid = m.id;
    }
    $('od-error').classList.add('is-hidden');
    db.from('orders').insert({
      user_id: uid, customer_name: $('od-name').value.trim() || (uid ? memberName(uid) : null), contact: $('od-contact').value.trim() || null,
      title: title, kind: $('od-kind').value, size: $('od-size').value.trim() || null, engraving: $('od-engr').value.trim() || null,
      visit_date: $('od-date').value || null, memo: $('od-memo').value.trim() || null
    }).then(function (r) {
      if (r.error) { $('od-error').textContent = '등록하지 못했어요: ' + r.error.message; $('od-error').classList.remove('is-hidden'); return; }
      ['od-user', 'od-name', 'od-contact', 'od-title', 'od-size', 'od-engr', 'od-date', 'od-memo'].forEach(function (id) { $(id).value = ''; });
      loadOrders();
    });
  });

  /* ───────────── A/S ───────────── */
  function loadAs() {
    db.from('as_requests').select('*, orders(title)').order('created_at', { ascending: false }).then(function (r) {
      $('ad-as').innerHTML = (r.data || []).map(function (a) {
        return '<tr><td>' + day(a.created_at) + '</td><td>' + esc(memberName(a.user_id)) + '</td><td>' + esc(a.orders ? a.orders.title : '') + '</td>' +
          '<td><b>' + esc(a.kind) + '</b>' + (a.body ? '<br><span class="small">' + esc(a.body) + '</span>' : '') + '</td>' +
          '<td>' + sel(['접수', '진행', '완료'], a.status, 'as-status', a.id) + '</td></tr>';
      }).join('') || '<tr><td colspan="5">A/S 신청이 없어요.</td></tr>';
    });
  }
  $('ad-as').addEventListener('change', function (e) {
    var s = e.target.closest('.as-status'); if (!s) return;
    db.from('as_requests').update({ status: s.value }).eq('id', s.getAttribute('data-id'));
  });

  /* ───────────── 리뷰 ───────────── */
  function loadReviews() {
    db.from('reviews').select('*').order('created_at', { ascending: false }).limit(200).then(function (r) {
      $('ad-rv').innerHTML = (r.data || []).map(function (x) {
        return '<tr><td>' + day(x.created_at) + '</td><td>' + esc(x.nickname) + '</td><td>' + x.rating + '</td><td>' + esc(x.body) + '</td>' +
          '<td><label><input type="checkbox" class="rv-show" data-id="' + x.id + '"' + (x.hidden ? '' : ' checked') + '> 공개</label></td></tr>';
      }).join('') || '<tr><td colspan="5">리뷰가 없어요.</td></tr>';
    });
  }
  $('ad-rv').addEventListener('change', function (e) {
    var c = e.target.closest('.rv-show'); if (!c) return;
    db.from('reviews').update({ hidden: !c.checked }).eq('id', c.getAttribute('data-id'));
  });

  /* 관리자만 */
  function start() {
    var ok = !!(M.user && M.profile && M.profile.is_admin);
    $('ad-deny').classList.toggle('is-hidden', ok);
    $('ad-body').classList.toggle('is-hidden', !ok);
    if (!ok) { if (!M.user) M.login('관리자 계정으로 로그인해 주세요.'); return; }
    db = M.client;
    loadMembers().then(function () { loadEvents(); loadOrders(); loadAs(); loadReviews(); });
  }
  M.onChange(start);
  M.ready.then(start);
})();
