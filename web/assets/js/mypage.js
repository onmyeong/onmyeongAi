/*
 * 온명 — 마이페이지
 * 내 사주 저장 · 커플 연결 · 내 반지(제작 진행) · A/S · 이벤트 신청 번호 · 내 리뷰
 */
(function () {
  'use strict';

  var ONM = window.ONMYEONG, M = ONM.member, esc = M.esc;
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var STEPS = ['접수', '왁스', '주물', '광택', '완성', '수령'];
  var STEP_WORD = { 접수: '접수했어요', 왁스: '왁스 원형을 다듬는 중', 주물: '은으로 주물하는 중', 광택: '광택을 내는 중', 완성: '완성! 찾으러 오세요', 수령: '수령 완료' };
  var KIND = { fortune: '2027 신년운세', saju: '일주 리포트', couple: '궁합' };
  var state = { orders: [] };

  /* 시각 셀렉트 */
  var SIJU = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
  for (var h = 0; h < 24; h++) {
    var o = document.createElement('option');
    o.value = String(h);
    o.textContent = pad(h) + ':00 ~ ' + pad(h) + ':59 (' + SIJU[Math.floor(((h + 1) % 24) / 2)] + ')';
    $('mp-h').appendChild(o);
  }

  function err(id, msg) { $(id).textContent = msg || ''; $(id).classList.toggle('is-hidden', !msg); }
  function day(t) { var d = new Date(t); return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(); }

  function birthQuery(b, sfx) {
    sfx = sfx || '';
    if (!b) return '';
    return '&y' + sfx + '=' + b.y + '&m' + sfx + '=' + b.m + '&d' + sfx + '=' + b.d +
      (b.h !== '' && b.h != null ? '&h' + sfx + '=' + b.h : '') +
      (b.mi !== '' && b.mi != null ? '&mi' + sfx + '=' + b.mi : '') +
      (b.g ? '&g' + sfx + '=' + b.g : '');
  }

  /* ───────────── 그리기 ───────────── */
  function render() {
    var on = !!M.user;
    $('mp-guest').classList.toggle('is-hidden', on);
    $('mp-body').classList.toggle('is-hidden', !on);
    if (!on) { $('mp-hello').textContent = '마이페이지'; return; }
    var p = M.profile || {};
    $('mp-hello').textContent = (p.nickname || '온명 손님') + ' 님의 마이페이지';
    $('mp-nick').textContent = p.nickname || '온명 손님';
    $('mp-email').textContent = p.email || M.user.email || '';
    $('mp-admin').classList.toggle('is-hidden', !p.is_admin);
    $('mp-mycode').textContent = p.couple_code || '——';
    renderSaju(p);
    loadPartner();
    loadOrders();
    loadEvents();
    loadReviews();
  }

  function renderSaju(p) {
    var b = p.birth;
    $('mp-saju-view').classList.toggle('is-hidden', !b);
    $('mp-saju-form').classList.toggle('is-hidden', !!b);
    if (!b) return;
    var rec = p.ilju && ONM.ILJU ? ONM.ILJU[p.ilju] : null;
    $('mp-ilju').textContent = (p.ilju ? p.ilju + (rec ? ' (' + rec.hanja + ')' : '') + ' 일주' : '내 사주') +
      (rec && ONM.iljuPhrase ? ' · ' + ONM.iljuPhrase(rec) : '');
    $('mp-birth').textContent = b.y + '년 ' + b.m + '월 ' + b.d + '일' +
      (b.h !== '' && b.h != null ? ' ' + pad(Number(b.h)) + ':' + (b.mi !== '' && b.mi != null ? pad(Number(b.mi)) : '00') : ' · 시각 모름') +
      (b.g ? ' · ' + (b.g === 'f' ? '여성' : '남성') : '');
    $('mp-go-fortune').href = 'fortune.html?' + birthQuery(b).slice(1) + (p.nickname ? '&n=' + encodeURIComponent(p.nickname) : '');
    $('mp-go-report').href = './?' + birthQuery(b).slice(1);
    // 고치기 창에도 미리 채워 둡니다
    $('mp-y').value = b.y; $('mp-m').value = b.m; $('mp-d').value = b.d;
    $('mp-h').value = b.h == null ? '' : b.h; $('mp-mi').value = b.mi == null ? '' : b.mi; $('mp-g').value = b.g || '';
  }

  /* ───────────── 내 사주 저장 ───────────── */
  $('mp-saju-edit').addEventListener('click', function () {
    $('mp-saju-form').classList.remove('is-hidden');
    $('mp-y').focus();
  });

  $('mp-saju-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = { y: $('mp-y').value, m: $('mp-m').value, d: $('mp-d').value, h: $('mp-h').value, mi: $('mp-h').value === '' ? '' : $('mp-mi').value, g: $('mp-g').value };
    var res;
    try { res = ONM.getIlju({ year: b.y, month: b.m, day: b.d, hour: b.h, minute: b.mi }); }
    catch (ex) { err('mp-saju-error', ex.message); return; }
    err('mp-saju-error', '');
    b.y = Number(b.y); b.m = Number(b.m); b.d = Number(b.d);
    M.saveBirth(b, res.id).then(render).catch(function () { err('mp-saju-error', '저장하지 못했어요. 다시 시도해 주세요.'); });
  });

  /* ───────────── 닉네임 · 로그아웃 · 탈퇴 ───────────── */
  $('mp-nick-edit').addEventListener('click', function () {
    var v = prompt('리뷰에 보일 닉네임을 적어 주세요', (M.profile && M.profile.nickname) || '');
    if (v === null) return;
    v = v.trim().slice(0, 20);
    if (v) M.updateNickname(v).then(render);
  });
  $('mp-logout').addEventListener('click', function () { M.signOut(); });
  $('mp-login').addEventListener('click', function () { M.login(); });
  $('mp-leave').addEventListener('click', function () {
    if (!confirm('탈퇴하면 저장한 사주 · 리뷰 · 이벤트 신청이 모두 지워져요. 정말 탈퇴할까요?')) return;
    M.client.rpc('delete_my_account').then(function (r) {
      if (r.error) { alert('탈퇴하지 못했어요. onmyeong2026@naver.com 으로 요청해 주세요.'); return; }
      M.signOut().then(function () { alert('탈퇴했어요. 그동안 고마웠어요.'); location.href = './'; });
    });
  });

  /* ───────────── 커플 연결 ───────────── */
  function loadPartner() {
    M.client.rpc('my_partner').then(function (r) {
      var pt = r.data && r.data[0];
      $('mp-couple-none').classList.toggle('is-hidden', !!pt);
      $('mp-couple-yes').classList.toggle('is-hidden', !pt);
      if (!pt) return;
      $('mp-partner').textContent = '💞 ' + (pt.nickname || '내 짝꿍') + ' 님과 연결됐어요';
      $('mp-partner-sub').textContent = pt.ilju ? pt.ilju + ' 일주' : '상대가 아직 사주를 저장하지 않았어요';
      var mine = M.profile && M.profile.birth;
      var link = $('mp-go-couple');
      if (mine && pt.birth) {
        link.href = 'fortune.html?' + birthQuery(mine).slice(1) + (M.profile.nickname ? '&n=' + encodeURIComponent(M.profile.nickname) : '') +
          birthQuery(pt.birth, '2') + (pt.nickname ? '&n2=' + encodeURIComponent(pt.nickname) : '');
        link.classList.remove('is-hidden');
      } else {
        link.classList.add('is-hidden');
        $('mp-partner-sub').textContent += ' · 둘 다 사주를 저장하면 함께 보는 신년운세가 열려요';
      }
    });
  }

  $('mp-code-copy').addEventListener('click', function () {
    var code = M.profile && M.profile.couple_code; if (!code) return;
    var btn = this;
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () {
      btn.textContent = '복사했어요'; setTimeout(function () { btn.textContent = '코드 복사'; }, 1500);
    }, function () { prompt('코드를 복사해 주세요', code); });
  });

  $('mp-link').addEventListener('click', function () {
    var code = $('mp-partner-code').value.trim().toUpperCase();
    if (code.length !== 6) { err('mp-couple-error', '상대 코드 6자리를 넣어 주세요.'); return; }
    err('mp-couple-error', '');
    M.client.rpc('link_partner', { code: code }).then(function (r) {
      if (r.error) { err('mp-couple-error', r.error.message || '연결하지 못했어요.'); return; }
      $('mp-partner-code').value = '';
      loadPartner();
    });
  });

  $('mp-unlink').addEventListener('click', function () {
    if (!confirm('커플 연결을 끊을까요? 상대 쪽도 같이 끊어져요.')) return;
    M.client.rpc('unlink_partner').then(loadPartner);
  });

  /* ───────────── 내 반지 · A/S ───────────── */
  function loadOrders() {
    Promise.all([
      M.client.from('orders').select('*').order('created_at', { ascending: false }),
      M.client.from('as_requests').select('*').order('created_at', { ascending: false })
    ]).then(function (res) {
      var orders = state.orders = res[0].data || [];
      var asList = res[1].data || [];
      if (!orders.length) return;
      $('mp-orders').innerHTML = orders.map(function (o) {
        var at = STEPS.indexOf(o.status);
        return '<div class="card" style="margin-top:10px;background:var(--paper-2)">' +
          '<div class="mp-row"><h3 style="margin:0">' + esc(o.title) + '</h3><span class="badge">' + esc(STEP_WORD[o.status] || o.status) + '</span></div>' +
          '<div class="mp-track">' + STEPS.map(function (s, k) {
            return '<span class="' + (k < at ? 'done' : (k === at ? 'now' : '')) + '">' + s + '</span>';
          }).join('') + '</div>' +
          '<p class="small" style="margin:6px 0 0">' +
            [o.kind, o.size ? o.size + '호' : '', o.engraving ? '각인 “' + esc(o.engraving) + '”' : '', o.visit_date ? '방문 ' + esc(o.visit_date) : '']
              .filter(Boolean).join(' · ') + '</p>' +
          (o.memo ? '<p class="small" style="margin:6px 0 0">📝 ' + esc(o.memo) + '</p>' : '') +
          (o.photo_url ? '<img src="' + esc(o.photo_url) + '" alt="' + esc(o.title) + '" style="max-width:220px;border-radius:12px;margin-top:10px">' : '') +
          (o.status === '수령' || o.status === '완성'
            ? '<div class="btn-row" style="margin-top:10px"><button class="btn btn-sm as-open" type="button" data-id="' + o.id + '">A/S 신청</button></div>' : '') +
        '</div>';
      }).join('');
      var box = $('mp-as');
      box.classList.toggle('is-hidden', !asList.length);
      box.innerHTML = '<h3 style="margin:0 0 6px">A/S 신청 내역</h3><ul class="mp-list">' + asList.map(function (a) {
        var o = orders.filter(function (x) { return x.id === a.order_id; })[0];
        return '<li><span>' + esc(a.kind) + (o ? ' · ' + esc(o.title) : '') + (a.body ? '<br><span class="small">' + esc(a.body) + '</span>' : '') +
          '</span><span class="badge">' + esc(a.status) + '</span></li>';
      }).join('') + '</ul>';
    });
  }

  var asModal = $('as-modal'), asOrder = null;
  $('mp-orders').addEventListener('click', function (e) {
    var b = e.target.closest('.as-open'); if (!b) return;
    asOrder = Number(b.getAttribute('data-id'));
    var o = state.orders.filter(function (x) { return x.id === asOrder; })[0];
    $('as-ring').textContent = o ? o.title : '';
    asModal.classList.add('open');
  });
  asModal.addEventListener('click', function (e) {
    if (e.target === asModal || e.target.closest('.onm-modal-x')) asModal.classList.remove('open');
  });
  $('as-submit').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    M.client.from('as_requests').insert({ user_id: M.user.id, order_id: asOrder, kind: $('as-kind').value, body: $('as-body').value.trim() || null })
      .then(function (r) {
        btn.disabled = false;
        if (r.error) { alert('신청하지 못했어요. 다시 시도해 주세요.'); return; }
        asModal.classList.remove('open'); $('as-body').value = '';
        loadOrders();
      });
  });

  /* ───────────── 이벤트 · 리뷰 ───────────── */
  function loadEvents() {
    M.client.from('event_entries').select('code,status,created_at').order('created_at', { ascending: false }).then(function (r) {
      var rows = r.data || [];
      $('mp-events').innerHTML = rows.length
        ? '<ul class="mp-list">' + rows.map(function (x) {
            return '<li><span><b class="ev-code" style="font-size:1.1rem">' + esc(x.code) + '</b><br><span class="small">' + day(x.created_at) + ' 신청</span></span>' +
              '<span class="badge">' + esc(x.status) + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="small" style="margin:6px 0 0">아직 신청한 이벤트가 없어요. <a href="reviews.html">리뷰 페이지</a>에서 참여할 수 있어요.</p>';
    });
  }

  function loadReviews() {
    M.client.from('reviews').select('id,kind,rating,body,hidden,created_at').eq('user_id', M.user.id).order('created_at', { ascending: false }).then(function (r) {
      var rows = r.data || [];
      $('mp-reviews').innerHTML = rows.length
        ? '<ul class="mp-list">' + rows.map(function (x) {
            return '<li><span>' + '★★★★★'.slice(0, x.rating) + ' <span class="small">' + esc(KIND[x.kind] || '') + ' · ' + day(x.created_at) +
              (x.hidden ? ' · 숨김 처리됨' : '') + '</span><br>' + esc(x.body.length > 60 ? x.body.slice(0, 60) + '…' : x.body) + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="small" style="margin:6px 0 0">아직 남긴 리뷰가 없어요. 복채는 리뷰로 내셔도 돼요 🧧</p>';
    });
  }

  M.onChange(render);
  M.ready.then(render);
})();
